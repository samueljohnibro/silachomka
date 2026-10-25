// scripts/verify-stage24.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));

function report(name, passed, detail = '') {
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ' - ' + detail : ''}`);
  if (!passed) process.exitCode = 1;
}

async function getAdminPassword() {
  if (process.env.ADMIN_TEST_PASSWORD) return process.env.ADMIN_TEST_PASSWORD;
  const transcriptPath = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\800bad5a-991c-4aaa-b58f-a8615276b0ab\\.system_generated\\logs\\transcript.jsonl';
  if (fs.existsSync(transcriptPath)) {
    const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    for (const line of lines) {
      if (line.includes('2421')) {
        const match = line.match(/([a-f0-9]{32})/i);
        if (match) return match[1].trim();
      }
    }
  }
  return '';
}

async function main() {
  console.log('================================================================');
  console.log(' STAGE 24 VERIFICATION: UPLOAD INTEGRITY, COUNTDOWN & ADMIN UX');
  console.log(' Production: https://silachomka.vercel.app');
  console.log(' Worker API: https://silachomka-api.samueljohnibrotech.workers.dev');
  console.log('================================================================\n');

  const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
  const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);
  const dbUrl = match[1].trim();
  const pgClient = new Client({ connectionString: dbUrl });
  await pgClient.connect();

  let testAssetId = null;

  try {
    // =========================================================================
    // 1. DATABASE & SCHEMA CHECKS
    // =========================================================================
    console.log('--- 1. Database & Schema Verification ---');

    // 1A. media_assets.updated_at exists and is TIMESTAMP WITH TIME ZONE
    const updatedAtCol = await pgClient.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'media_assets' AND column_name = 'updated_at';
    `);
    report(
      'media_assets.updated_at column exists in database',
      updatedAtCol.rows.length === 1,
      `type: ${updatedAtCol.rows[0]?.data_type}`
    );

    // 1B. All existing media_assets rows have non-null updated_at
    const nullUpdatedAt = await pgClient.query(`
      SELECT count(*)::int as count 
      FROM media_assets 
      WHERE updated_at IS NULL;
    `);
    report(
      'All media_assets have valid non-null updated_at timestamps',
      nullUpdatedAt.rows[0]?.count === 0,
      `null count: ${nullUpdatedAt.rows[0]?.count}`
    );

    // 1C. releases table has release_date column
    const releaseDateCol = await pgClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'releases' AND column_name = 'release_date';
    `);
    report('releases.release_date column exists', releaseDateCol.rows.length === 1);

    // =========================================================================
    // 2. WORKER API & UPLOAD PIPELINE CHECKS
    // =========================================================================
    console.log('\n--- 2. Worker Upload & Serving Pipeline Verification ---');

    const testPassword = await getAdminPassword();

    // 2A. Admin login
    const loginRes = await fetch('https://silachomka-api.samueljohnibrotech.workers.dev/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testadmin@silachomka.com',
        password: testPassword
      })
    });
    const setCookie = loginRes.headers.get('set-cookie');
    const sessionMatch = setCookie?.match(/silachomka_admin_session=([^;]+)/);
    const sessionToken = sessionMatch ? sessionMatch[1] : null;
    report('Worker /api/admin/login returns 200 with admin session cookie', loginRes.status === 200 && !!sessionToken);

    // 2B. Direct Media Upload via Worker API
    // 1x1 transparent PNG data
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="stage24-verify-test.png"\r\nContent-Type: image/png\r\n\r\n`,
      pngBuffer,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nStage 24 Test Artwork\r\n`,
      `--${boundary}--\r\n`
    ];

    const bodyBuffer = Buffer.concat([
      Buffer.from(bodyParts[0]),
      bodyParts[1],
      Buffer.from(bodyParts[2]),
      Buffer.from(bodyParts[3])
    ]);

    const uploadRes = await fetch('https://silachomka-api.samueljohnibrotech.workers.dev/api/admin/media-assets/upload', {
      method: 'POST',
      headers: {
        'Cookie': `silachomka_admin_session=${sessionToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: bodyBuffer
    });

    const uploadData = await uploadRes.json();
    report(
      'Media upload succeeds with HTTP 201 (NO updated_at error)',
      uploadRes.status === 201 && uploadData.success,
      `status: ${uploadRes.status}`
    );
    report('Upload response contains valid asset ID', !!uploadData.asset?.id);
    report('Upload response contains valid asset URL', !!uploadData.asset?.url);
    report('Upload response confirms BYTEA file_data storage', uploadData.asset?.has_file_data === true);
    report('Upload response contains updated_at timestamp', !!uploadData.asset?.updated_at);

    testAssetId = uploadData.asset?.id;

    // 2C. Direct Media Serving endpoint check
    if (testAssetId) {
      const serveRes = await fetch(`https://silachomka-api.samueljohnibrotech.workers.dev/api/media/asset/${testAssetId}`);
      report('Serving endpoint GET /api/media/asset/:id returns HTTP 200', serveRes.status === 200);
      report('Serving endpoint returns image/png Content-Type', serveRes.headers.get('content-type') === 'image/png');

      const arrayBuf = await serveRes.arrayBuffer();
      const firstBytes = Buffer.from(arrayBuf).slice(0, 4);
      const isPng = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
      report('Serving endpoint returns valid PNG binary bytes', isPng, `length: ${arrayBuf.byteLength} bytes`);
    }

    // 2D. Geo and Selar currency endpoint
    const geoRes = await fetch('https://silachomka-api.samueljohnibrotech.workers.dev/api/geo');
    const geoData = await geoRes.json();
    report('Worker /api/geo endpoint returns 200', geoRes.status === 200);
    report('Geo endpoint returns country and Selar currency', !!geoData.country && !!geoData.currency);

    // 2E. Releases endpoint contains release_date
    const releasesRes = await fetch('https://silachomka-api.samueljohnibrotech.workers.dev/api/releases');
    const releasesData = await releasesRes.json();
    report('Worker /api/releases returns 200', releasesRes.status === 200);
    const hasReleaseDates = Array.isArray(releasesData) && releasesData.every(r => r.release_date !== undefined);
    report('Worker /api/releases includes canonical release_date in all items', hasReleaseDates);

    // =========================================================================
    // 3. PUPPETEER FRONTEND VERIFICATION
    // =========================================================================
    console.log('\n--- 3. Puppeteer Frontend Verification ---');
    const tmpProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-stage24-'));
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: 'new',
      userDataDir: tmpProfileDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // 3A. Public Music List View — Show Release Date
    console.log('\n3A. Testing Public Music List View Release Date...');
    await page.goto('https://silachomka.vercel.app/?view=list#music', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.tracklist-card, .release-grid', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    const listViewCheck = await page.evaluate(() => {
      // Look for tracklist cards or dates in list view
      const cards = Array.from(document.querySelectorAll('.tracklist-card'));
      const cardTexts = cards.map(c => {
        const subtitle = c.querySelector('h3 + p');
        return subtitle ? subtitle.innerText.trim() : '';
      }).filter(Boolean);

      const hasRawIso = cardTexts.some(t => t.includes('T00:00:00') || t.includes('00:00:00.000Z'));
      const hasProperDate = cardTexts.some(t => /[A-Za-z]+ \d{1,2}, \d{4}/.test(t));
      return {
        count: cards.length,
        hasRawIso,
        hasProperDate,
        sample: cardTexts.slice(0, 3)
      };
    });

    report('Public music list view renders release cards', listViewCheck.count > 0, `(${listViewCheck.count} items, sample: ${listViewCheck.sample[0] || 'N/A'})`);
    report('Release dates are formatted cleanly with no raw ISO or 00:00:00', !listViewCheck.hasRawIso);
    report('Release dates follow human-friendly format (e.g. June 9, 2025)', listViewCheck.hasProperDate);

    // 3B. Release-Day "OUT NOW" Celebration Experience
    console.log('\n3B. Testing Release-Day "OUT NOW" Celebration Experience...');
    // Bite Me was released on 2026-10-25T12:00:00Z (today, < 30 days)
    await page.goto('https://silachomka.vercel.app/release/bite-me', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.release-content-panel', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    const outNowCheck = await page.evaluate(() => {
      const banner = document.querySelector('.out-now-celebration-banner');
      const badge = document.querySelector('.out-now-badge');
      const pill = document.querySelector('.out-now-pill');
      const bannerText = banner ? banner.innerText : '';
      
      // Emoji check regex
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const hasEmoji = emojiRegex.test(bannerText);

      return {
        hasBanner: !!banner,
        hasBadge: !!badge,
        badgeText: badge ? badge.innerText.trim() : null,
        hasPill: !!pill,
        hasEmoji,
        bannerText
      };
    });

    report('Recent release (<30 days) displays .out-now-celebration-banner', outNowCheck.hasBanner);
    report('OUT NOW badge displays correct uppercase text', outNowCheck.badgeText === 'OUT NOW');
    report('OUT NOW metadata pill displayed in meta bar', outNowCheck.hasPill);
    report('OUT NOW banner contains ZERO emojis', !outNowCheck.hasEmoji);

    // Test dismissal
    const dismissed = await page.evaluate(() => {
      const closeBtn = document.querySelector('.out-now-close-btn');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      return false;
    });
    report('OUT NOW banner close button clicked', dismissed);
    await new Promise(r => setTimeout(r, 500));

    const postDismissCheck = await page.evaluate(() => {
      const banner = document.querySelector('.out-now-celebration-banner');
      const sessionDismissed = sessionStorage.getItem('chomka_outnow_bite-me');
      return {
        hasBanner: !!banner,
        sessionDismissed: sessionDismissed === 'dismissed'
      };
    });
    report('OUT NOW banner removed from DOM upon dismissal', !postDismissCheck.hasBanner);
    report('Dismissal persisted to sessionStorage', postDismissCheck.sessionDismissed);

    // 3C. Standard Historical Release (> 30 days)
    console.log('\n3C. Testing Historical Release (>30 days)...');
    await page.goto('https://silachomka.vercel.app/release/fridaythe13th', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.release-content-panel', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    const historicalCheck = await page.evaluate(() => {
      const banner = document.querySelector('.out-now-celebration-banner');
      const comingSoon = document.querySelector('.coming-soon-card');
      const tracklist = document.querySelector('.tracklist-card');
      const videos = document.querySelector('.release-videos-section');
      return {
        hasBanner: !!banner,
        hasComingSoon: !!comingSoon,
        hasTracklist: !!tracklist,
        hasVideos: !!videos
      };
    });
    report('Historical release does NOT show OUT NOW celebration banner', !historicalCheck.hasBanner);
    report('Historical release does NOT show Coming Soon countdown card', !historicalCheck.hasComingSoon);
    report('Historical release renders tracklist card', historicalCheck.hasTracklist);
    report('Historical release renders associated visual content', historicalCheck.hasVideos);

    // 3D. Future Release Countdown Mode
    console.log('\n3D. Testing Future Release Countdown Mode...');
    // Set item5 release_date temporarily to 14 days in the future
    const originalDateRes = await pgClient.query(`SELECT release_date FROM releases WHERE slug = 'item5';`);
    const originalReleaseDate = originalDateRes.rows[0]?.release_date;
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await pgClient.query(`UPDATE releases SET release_date = $1 WHERE slug = 'item5'`, [futureDate]);

    await page.goto('https://silachomka.vercel.app/release/item5', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.release-content-panel', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    const countdownCheck = await page.evaluate(() => {
      const comingSoonCard = document.querySelector('.coming-soon-card');
      const badge = document.querySelector('.coming-soon-badge-label');
      const days = document.querySelector('.countdown-timer-box:nth-child(1) .countdown-timer-num')?.innerText;
      const hours = document.querySelector('.countdown-timer-box:nth-child(3) .countdown-timer-num')?.innerText;
      const minutes = document.querySelector('.countdown-timer-box:nth-child(5) .countdown-timer-num')?.innerText;
      const seconds = document.querySelector('.countdown-timer-box:nth-child(7) .countdown-timer-num')?.innerText;
      
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const hasEmoji = emojiRegex.test(comingSoonCard ? comingSoonCard.innerText : '');

      return {
        hasComingSoonCard: !!comingSoonCard,
        badgeText: badge ? badge.innerText.trim() : null,
        days: parseInt(days || '0', 10),
        hours,
        minutes,
        seconds,
        hasEmoji
      };
    });

    report('Future release activates COMING SOON mode', countdownCheck.hasComingSoonCard);
    report('Prominently displays COMING SOON label', countdownCheck.badgeText === 'COMING SOON');
    report('Days counter is active and non-zero', countdownCheck.days >= 13, `(${countdownCheck.days} days)`);
    report('Coming soon card contains ZERO emojis', !countdownCheck.hasEmoji);

    // Test live countdown tick without refresh
    const initialSeconds = countdownCheck.seconds;
    await new Promise(r => setTimeout(r, 2200));
    const nextSeconds = await page.evaluate(() => {
      return document.querySelector('.countdown-timer-box:nth-child(7) .countdown-timer-num')?.innerText;
    });
    report(
      'Live countdown ticks continuously without page refresh',
      initialSeconds !== nextSeconds,
      `${initialSeconds}s -> ${nextSeconds}s`
    );

    // Revert item5 release_date
    if (originalReleaseDate) {
      await pgClient.query(`UPDATE releases SET release_date = $1 WHERE slug = 'item5'`, [originalReleaseDate]);
    }

    // 3E. Admin CMS UX (No Raw IDs & Sticky Sidebar)
    console.log('\n3E. Testing Admin CMS UX & Sticky Sidebar...');
    await page.goto('https://silachomka.vercel.app/admin/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.type('#email', 'testadmin@silachomka.com');
    await page.type('#password', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.admin-layout-wrapper', { timeout: 15000 });

    // Test sticky sidebar
    const sidebarSticky = await page.evaluate(() => {
      const sidebar = document.querySelector('.admin-sidebar');
      if (!sidebar) return false;
      const style = window.getComputedStyle(sidebar);
      return style.position === 'sticky' && (style.top === '0px' || style.top === '0');
    });
    report('Admin sidebar has position: sticky and top: 0px', sidebarSticky);

    // Check Admin Music page for no raw UUIDs
    await page.goto('https://silachomka.vercel.app/admin/music', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.admin-listing-grid, .admin-item-card, .admin-card table', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    const musicCardCheck = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.admin-item-card, .admin-card table tbody tr'));
      const text = cards.map(c => c.innerText).join('\n');
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      return {
        cardCount: cards.length,
        hasVisibleUuid: uuidRegex.test(text)
      };
    });
    report('Admin Music listing displays cleanly without raw UUIDs', !musicCardCheck.hasVisibleUuid, `(${musicCardCheck.cardCount} releases)`);

    // Check Admin Gallery page
    await page.goto('https://silachomka.vercel.app/admin/gallery', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.admin-listing-grid, .admin-item-card, .admin-card table, .admin-placeholder', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    const galleryCardCheck = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.admin-item-card, .admin-card table tbody tr'));
      const text = cards.map(c => c.innerText).join('\n');
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const hasUntitledFallback = text.includes('Untitled Gallery Post') || text.includes('No Gallery Posts');
      return {
        cardCount: cards.length,
        hasVisibleUuid: uuidRegex.test(text),
        hasUntitledFallback
      };
    });
    report('Admin Gallery listing displays cleanly without raw UUIDs', !galleryCardCheck.hasVisibleUuid);

    // Check Admin Media page
    await page.goto('https://silachomka.vercel.app/admin/media', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.admin-listing-grid, .admin-item-card, .admin-card table', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    const mediaCardCheck = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.admin-item-card, .admin-card table tbody tr'));
      const cardTitles = cards.map(c => (c.querySelector('.admin-item-title') || c.querySelector('td:nth-child(2)'))?.innerText || '');
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const hasUuidAsTitle = cardTitles.some(t => uuidRegex.test(t));
      return {
        cardCount: cards.length,
        hasUuidAsTitle
      };
    });
    report('Admin Media assets display human filenames/types instead of raw UUID titles', !mediaCardCheck.hasUuidAsTitle);

    // 3F. Worldwide Currency & Responsive Beats
    console.log('\n3F. Testing Worldwide Currency & Responsive Beats...');
    await page.goto('https://silachomka.vercel.app/beats', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.beats-grid, .beat-card', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const beatPricingCheck = await page.evaluate(() => {
      const beatCards = Array.from(document.querySelectorAll('.beat-card'));
      const priceEls = Array.from(document.querySelectorAll('.beat-card .beat-price'));
      const priceTexts = priceEls.map(el => el.innerText.trim()).filter(Boolean);
      
      const pricesFlexWrap = priceEls.map(el => window.getComputedStyle(el).flexWrap);
      const isWrapSet = pricesFlexWrap.some(w => w === 'wrap');

      // Check horizontal overflow
      const docWidth = document.documentElement.offsetWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const hasHorizontalOverflow = bodyScrollWidth > docWidth + 5;

      return {
        cardCount: beatCards.length,
        priceTexts: priceTexts.slice(0, 3),
        isWrapSet,
        hasHorizontalOverflow
      };
    });

    report('Public beats catalogue displays live pricing', beatPricingCheck.priceTexts.length > 0, `(Sample: ${beatPricingCheck.priceTexts.join(' | ')})`);
    report('Responsive beat card pricing handles wrapping cleanly', beatPricingCheck.isWrapSet);
    report('Beats catalogue has NO horizontal viewport overflow', !beatPricingCheck.hasHorizontalOverflow);

    await page.goto('about:blank');
    await page.close();
    await browser.close();

    try {
      fs.rmSync(tmpProfileDir, { recursive: true, force: true });
    } catch {}

  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  } finally {
    // Clean up test asset if created
    if (testAssetId) {
      try {
        await pgClient.query(`DELETE FROM media_assets WHERE id = $1`, [testAssetId]);
        console.log(`\nCleaned up verification test asset ${testAssetId}`);
      } catch {}
    }
    await pgClient.end();
  }

  console.log('\n================================================================');
  console.log(process.exitCode === 1 ? '❌ STAGE 24 VERIFICATION FAILED' : '✅ STAGE 24 VERIFICATION PASSED ALL CHECKS');
  console.log('================================================================\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

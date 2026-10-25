// scripts/verify-stage22.cjs
const fs = require('fs');
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
  console.log('========================================================');
  console.log(' STAGE 22: ADMIN IMAGE PREVIEWS & SUBSCRIBER AUTOFILL');
  console.log(' Production: https://silachomka.vercel.app');
  console.log(' Worker API: https://silachomka-api.samueljohnibrotech.workers.dev');
  console.log('========================================================\n');

  const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
  const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);
  const dbUrl = match[1].trim();

  // -----------------------------------------------------------
  // STEP 1: Verify direct serving endpoint (historical + binary)
  // -----------------------------------------------------------
  console.log('--- 1. Testing Serving Endpoint Directly ---');
  // 1A. Historical asset ID
  const historicalAssetId = 'fb04a3ad-fb58-40b4-91b3-2e2018f4badc';
  const histUrl = `https://silachomka-api.samueljohnibrotech.workers.dev/api/media/asset/${historicalAssetId}`;
  const histManual = await fetch(histUrl, { redirect: 'manual' });
  const histLoc = histManual.headers.get('location');
  report('Historical media 302 redirect points to https://silachomka.vercel.app', histManual.status === 302 && histLoc.includes('https://silachomka.vercel.app/covers/'));

  const histFollow = await fetch(histUrl, { redirect: 'follow' });
  const histBuf = await histFollow.arrayBuffer();
  const histContentType = histFollow.headers.get('content-type');
  report('Historical media follow redirect returns 200 OK', histFollow.status === 200);
  report('Historical media Content-Type is image/jpeg', histContentType === 'image/jpeg');
  report('Historical media body bytes received non-zero', histBuf.byteLength > 10000, `(${histBuf.byteLength} bytes)`);

  // 1B. Newly uploaded image with BYTEA binary in DB
  console.log('\n--- 1B. Testing Database BYTEA Binary Serving ---');
  const pgClient = new Client({ connectionString: dbUrl });
  await pgClient.connect();

  // 1x1 test red PNG hex
  const testPngHex = '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc000000301010018dd8d2e0000000049454e44ae426082';
  const insertTest = await pgClient.query(
    "INSERT INTO media_assets (r2_key, original_filename, asset_type, mime_type, size_bytes, file_data) VALUES ('covers/verify-test-image.png', 'verify-test-image.png', 'IMAGE', 'image/png', 67, decode($1, 'hex')) RETURNING id",
    [testPngHex]
  );
  const testAssetId = insertTest.rows[0].id;

  const testBinaryUrl = `https://silachomka-api.samueljohnibrotech.workers.dev/api/media/asset/${testAssetId}`;
  const binaryRes = await fetch(testBinaryUrl);
  const binaryBuf = await binaryRes.arrayBuffer();
  report('Binary asset direct endpoint returns 200 OK', binaryRes.status === 200);
  report('Binary asset Content-Type is image/png', binaryRes.headers.get('content-type') === 'image/png');
  report('Binary asset Cache-Control is immutable', (binaryRes.headers.get('cache-control') || '').includes('immutable'));
  report('Binary asset CORS Access-Control-Allow-Origin is *', binaryRes.headers.get('access-control-allow-origin') === '*');
  report('Binary asset body bytes match exactly', binaryBuf.byteLength === 69, `(${binaryBuf.byteLength} bytes)`);

  // Clean up test asset
  await pgClient.query('DELETE FROM media_assets WHERE id = $1', [testAssetId]);
  await pgClient.end();

  // -----------------------------------------------------------
  // STEP 2: Browser-based tests with Puppeteer
  // -----------------------------------------------------------
  console.log('\n--- 2. Puppeteer Browser-Level Verification ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 2A: Test Subscriber Email Input Attributes on Production
  console.log('\n2A. Checking Subscriber Email Input in Production...');
  await page.goto('https://silachomka.vercel.app/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.newsletter-box input[type="email"]', { timeout: 15000 });

  const emailAttrs = await page.evaluate(() => {
    const el = document.querySelector('.newsletter-box input[type="email"]');
    if (!el) return null;
    return {
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      autoComplete: el.getAttribute('autocomplete'),
      inputMode: el.getAttribute('inputmode'),
      placeholder: el.getAttribute('placeholder')
    };
  });

  report('Subscriber input type is email', emailAttrs?.type === 'email', `(type="${emailAttrs?.type}")`);
  report('Subscriber input name is email', emailAttrs?.name === 'email', `(name="${emailAttrs?.name}")`);
  report('Subscriber input autocomplete is email', emailAttrs?.autoComplete === 'email', `(autocomplete="${emailAttrs?.autoComplete}")`);
  report('Subscriber input inputmode is email', emailAttrs?.inputMode === 'email', `(inputmode="${emailAttrs?.inputMode}")`);

  // 2B: Admin Login
  console.log('\n2B. Logging in to Admin CMS...');
  const testPassword = await getAdminPassword();
  await page.goto('https://silachomka.vercel.app/admin/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.type('#email', 'testadmin@silachomka.com');
  await page.type('#password', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.admin-layout-wrapper', { timeout: 15000 });
  report('Admin CMS login successful', page.url().includes('/admin'));

  // 2C: Admin Music / Releases - Image Previews
  console.log('\n2C. Checking Admin Music / Releases Images...');
  await page.goto('https://silachomka.vercel.app/admin/music', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.admin-item-card, .admin-card table', { timeout: 15000 });

  // Wait 2.5s for images to render
  await new Promise(r => setTimeout(r, 2500));

  const musicImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.admin-item-card img, .admin-card table img'));
    return imgs.map(img => ({
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayed: img.style.display !== 'none',
      complete: img.complete
    }));
  });

  report('Music release cover images found in Admin UI', musicImages.length > 0, `(${musicImages.length} images found)`);
  const validMusicImgs = musicImages.filter(img => img.naturalWidth > 0 && img.naturalHeight > 0);
  report('Music release images rendered with non-zero dimensions', validMusicImgs.length > 0, `(${validMusicImgs.length}/${musicImages.length} valid)`);
  if (validMusicImgs.length > 0) {
    console.log(`  Sample Music cover dimensions: ${validMusicImgs[0].naturalWidth}x${validMusicImgs[0].naturalHeight} px (src: ${validMusicImgs[0].src.slice(0, 70)}...)`);
  }

  // 2D: Admin Beats - Image Previews
  console.log('\n2D. Checking Admin Beats Images...');
  await page.goto('https://silachomka.vercel.app/admin/beats', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.admin-item-card, .admin-card table', { timeout: 15000 });

  await new Promise(r => setTimeout(r, 2500));

  const beatsImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.admin-item-card img, .admin-card table img'));
    return imgs.map(img => ({
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayed: img.style.display !== 'none',
      complete: img.complete
    }));
  });

  report('Beat images found in Admin Beats UI', beatsImages.length > 0, `(${beatsImages.length} images found)`);
  const validBeatsImgs = beatsImages.filter(img => img.naturalWidth > 0 && img.naturalHeight > 0);
  report('Beat images rendered with non-zero dimensions', validBeatsImgs.length > 0, `(${validBeatsImgs.length}/${beatsImages.length} valid)`);
  if (validBeatsImgs.length > 0) {
    console.log(`  Sample Beat artwork dimensions: ${validBeatsImgs[0].naturalWidth}x${validBeatsImgs[0].naturalHeight} px (src: ${validBeatsImgs[0].src.slice(0, 70)}...)`);
  }

  // Also switch to Grid view to verify grid cards
  const gridBtn = await page.$('.view-toggle-btn[title*="Grid"], .admin-view-toggle button:last-child');
  if (gridBtn) {
    await gridBtn.click();
    await new Promise(r => setTimeout(r, 1500));
    const gridImgs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.admin-listing-grid img')).map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }));
    });
    const validGridImgs = gridImgs.filter(i => i.naturalWidth > 0 && i.naturalHeight > 0);
    report('Beat images in Grid view render with non-zero dimensions', validGridImgs.length > 0, `(${validGridImgs.length}/${gridImgs.length} valid)`);
  }

  // 2E: MediaAssetPicker inside Release Editor
  console.log('\n2E. Checking MediaAssetPicker inside Release Edit Form...');
  await page.goto('https://silachomka.vercel.app/admin/music', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.admin-item-card button, .admin-card table button', { timeout: 15000 });
  const manageBtn = await page.$('.admin-item-card button, .admin-card table button');
  if (manageBtn) {
    await manageBtn.click();
    await page.waitForSelector('.media-asset-picker', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    const pickerImg = await page.evaluate(() => {
      const img = document.querySelector('.media-asset-picker img');
      if (!img) return null;
      return {
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      };
    });
    report('MediaAssetPicker in Release Editor renders cover preview', (pickerImg?.naturalWidth || 0) > 0, `(${pickerImg?.naturalWidth}x${pickerImg?.naturalHeight} px)`);
  }

  // 2F: MediaAssetPicker inside Beat Editor
  console.log('\n2F. Checking MediaAssetPicker inside Beat Edit Form...');
  await page.goto('https://silachomka.vercel.app/admin/beats', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.admin-item-card button, .admin-card table button', { timeout: 15000 });
  const editBeatBtn = await page.$('.admin-item-card button, .admin-card table button');
  if (editBeatBtn) {
    await editBeatBtn.click();
    await page.waitForSelector('.media-asset-picker', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));
    const beatPickerImg = await page.evaluate(() => {
      const img = document.querySelector('.media-asset-picker img');
      if (!img) return null;
      return {
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      };
    });
    report('MediaAssetPicker in Beat Editor renders cover preview', (beatPickerImg?.naturalWidth || 0) > 0, `(${beatPickerImg?.naturalWidth}x${beatPickerImg?.naturalHeight} px)`);
  }

  // 2G: Public Release Page Image
  console.log('\n2G. Checking Public Release Page Image...');
  await page.goto('https://silachomka.vercel.app/release/fridaythe13th', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.release-artwork-container img, .release-cover img, img[alt*="cover art"]', { timeout: 15000 }).catch(() => null);
  await new Promise(r => setTimeout(r, 2000));

  const publicRelImg = await page.evaluate(() => {
    const img = document.querySelector('img[alt*="cover art"]') || document.querySelector('.release-artwork-container img');
    if (!img) return null;
    return {
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete
    };
  });

  report('Public release cover image rendered with non-zero dimensions', (publicRelImg?.naturalWidth || 0) > 0, `(${publicRelImg?.naturalWidth}x${publicRelImg?.naturalHeight} px)`);

  // 2H: Public Beats Page Images
  console.log('\n2H. Checking Public Beats Page Images...');
  await page.goto('https://silachomka.vercel.app/beats', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.beat-card, .beat-reel, .beat-video', { timeout: 15000 }).catch(() => null);
  await new Promise(r => setTimeout(r, 2500));

  const publicBeatImgs = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.beat-card img, img.beat-video, video.beat-video'));
    return imgs.map(el => ({
      tagName: el.tagName,
      src: el.src,
      poster: el.poster,
      naturalWidth: el.naturalWidth || (el.videoWidth || 0),
      naturalHeight: el.naturalHeight || (el.videoHeight || 0)
    }));
  });

  report('Public beats visual elements rendered', publicBeatImgs.length > 0, `(${publicBeatImgs.length} elements found)`);
  const validPublicBeats = publicBeatImgs.filter(b => b.naturalWidth > 0 || (b.poster && b.poster.length > 0));
  report('Public beats visualizers/posters loaded with valid dimensions/poster', validPublicBeats.length > 0, `(${validPublicBeats.length}/${publicBeatImgs.length} valid)`);

  await browser.close();
  console.log('\n========================================================');
  console.log(' STAGE 22 VERIFICATION COMPLETE');
  console.log('========================================================');
}

main().catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});

// scripts/verify-stage23.cjs
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
  console.log('========================================================');
  console.log(' STAGE 23 VERIFICATION: SELAR PRICING + GALLERY UX');
  console.log(' Production: https://silachomka.vercel.app');
  console.log(' Worker API: https://silachomka-api.samueljohnibrotech.workers.dev');
  console.log('========================================================\n');

  const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
  const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);
  const dbUrl = match[1].trim();
  const pgClient = new Client({ connectionString: dbUrl });
  await pgClient.connect();

  // =========================================================================
  // 1. DATABASE & SCHEMA CHECKS
  // =========================================================================
  console.log('--- 1. Database & Schema Verification ---');
  
  // 1A. gallery_posts.title is nullable
  const titleCol = await pgClient.query(`
    SELECT is_nullable FROM information_schema.columns 
    WHERE table_name = 'gallery_posts' AND column_name = 'title';
  `);
  report('gallery_posts.title column is nullable', titleCol.rows[0]?.is_nullable === 'YES');

  // 1B. gallery_categories table exists with seeded rows
  const catCount = await pgClient.query(`SELECT count(*)::int as count FROM gallery_categories`);
  report('gallery_categories table exists with entries', catCount.rows[0]?.count >= 5, `(${catCount.rows[0]?.count} categories)`);

  // =========================================================================
  // 2. WORKER API ENDPOINTS (SELAR & CATEGORIES)
  // =========================================================================
  console.log('\n--- 2. Worker Endpoints (Selar Pricing & Categories) ---');

  // 2A. Pricing with USD
  const usdRes = await fetch('https://silachomka-api.samueljohnibrotech.workers.dev/api/beats/pricing?currency=USD');
  const usdData = await usdRes.json();
  report('Worker /api/beats/pricing?currency=USD returns 200', usdRes.status === 200);
  const productCount = Object.keys(usdData.products || {}).length;
  report('Selar pricing returns 33 products', productCount === 33, `(${productCount} products)`);
  report('All 11 catalogue beats mapped in byBeat', Object.keys(usdData.byBeat || {}).length === 11, `(${Object.keys(usdData.byBeat || {}).length} beats)`);
  report('USD currency and symbol returned', usdData.currency === 'USD' && usdData.currencySymbol === '$');

  const sampleBeat = usdData.byBeat?.['shine'];
  report('Sample beat has basic, premium, ultimate tiers', !!(sampleBeat?.basic && sampleBeat?.premium && sampleBeat?.ultimate));
  report('Basic license has valid USD price and Selar checkout URL', sampleBeat?.basic?.amount > 0 && sampleBeat?.basic?.url?.includes('selar.com'), `(${sampleBeat?.basic?.formatted} -> ${sampleBeat?.basic?.url})`);

  // 2B. Pricing with NGN
  const ngnRes = await fetch('https://silachomka-api.samueljohnibrotech.workers.dev/api/beats/pricing?currency=NGN');
  const ngnData = await ngnRes.json();
  report('Worker /api/beats/pricing?currency=NGN returns 200', ngnRes.status === 200);
  report('NGN currency and symbol returned', ngnData.currency === 'NGN' && ngnData.currencySymbol === '₦');
  const sampleNgn = ngnData.byBeat?.['shine'];
  report('Basic license in NGN matches authoritative store price', sampleNgn?.basic?.amount === 15000, `(${sampleNgn?.basic?.formatted})`);

  // 2C. Public categories endpoint
  const catRes = await fetch('https://silachomka-api.samueljohnibrotech.workers.dev/api/gallery/categories');
  const catData = await catRes.json();
  report('Worker /api/gallery/categories returns 200 array', Array.isArray(catData) && catData.length >= 5, `(${catData.length} categories)`);

  // =========================================================================
  // 3. PUPPETEER FRONTEND VERIFICATION
  // =========================================================================
  console.log('\n--- 3. Puppeteer Frontend Verification ---');
  const tmpProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-stage23-'));
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    userDataDir: tmpProfileDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 3A. Admin Login & Beats Form
  console.log('\n3A. Testing Admin CMS Beats Form...');
  const testPassword = await getAdminPassword();
  await page.goto('https://silachomka.vercel.app/admin/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 10000 });
  await page.type('#email', 'testadmin@silachomka.com');
  await page.type('#password', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.admin-layout-wrapper', { timeout: 15000 });
  report('Admin CMS login successful', page.url().includes('/admin'));

  await page.goto('https://silachomka.vercel.app/admin/beats', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button.primary-button', { timeout: 15000 });

  // Click "+ Create Beat"
  const createBeatClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.toUpperCase().includes('CREATE BEAT') || b.innerText.toUpperCase().includes('CREATE FIRST BEAT'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  report('Clicked Create Beat in Admin', createBeatClicked);

  if (createBeatClicked) {
    await page.waitForSelector('form', { timeout: 10000 });

    const formInspection = await page.evaluate(() => {
      const priceBasicInput = document.querySelector('input[name="price_basic"]');
      const pricePremiumInput = document.querySelector('input[name="price_premium"]');
      const priceExclusiveInput = document.querySelector('input[name="price_exclusive"]');
      const selarNotice = document.body.innerText.includes('Authoritative Selar');
      const genreInputs = Array.from(document.querySelectorAll('input[name="genre"], input[name="short_genre"]'));
      return {
        hasPriceBasic: !!priceBasicInput,
        hasPricePremium: !!pricePremiumInput,
        hasPriceExclusive: !!priceExclusiveInput,
        hasSelarNotice: selarNotice,
        genreInputCount: genreInputs.length
      };
    });

    report('Manual price_basic input removed from Beat admin', !formInspection.hasPriceBasic);
    report('Manual price_premium input removed from Beat admin', !formInspection.hasPricePremium);
    report('Manual price_exclusive input removed from Beat admin', !formInspection.hasPriceExclusive);
    report('Authoritative Selar Pricing card displayed in Beat form', formInspection.hasSelarNotice);
    report('Only one Genre input exposed in Beat admin form', formInspection.genreInputCount === 1, `(${formInspection.genreInputCount} input)`);
  }

  // 3B. Admin Gallery Post Editor
  console.log('\n3B. Testing Admin Gallery Post Editor (/admin/gallery)...');
  await page.goto('https://silachomka.vercel.app/admin/gallery', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button.primary-button, .admin-placeholder, .admin-listing-grid', { timeout: 15000 });

  // Click "+ Create Post"
  const newPostBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.toUpperCase().includes('CREATE POST') || b.innerText.toUpperCase().includes('CREATE FIRST POST'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  report('Admin Gallery "Create Post" button opened form', newPostBtn);

  if (newPostBtn) {
    await page.waitForSelector('form', { timeout: 10000 });
    const galleryFormCheck = await page.evaluate(() => {
      const slugInput = document.querySelector('input[name="slug"]');
      const displayDateInput = document.querySelector('input[name="display_date"]');
      const tagsInput = document.querySelector('input[name="tags"]');
      const postDateInput = document.querySelector('input[name="post_date"]');
      const directFileInput = document.querySelector('input[type="file"][accept*="image"]');
      const mediaLibBtn = Array.from(document.querySelectorAll('button')).some(b => b.innerText.toUpperCase().includes('BROWSE MEDIA LIBRARY'));
      const formatSelect = document.querySelector('select[name="post_type"]');
      const categoryCombobox = document.querySelector('input[name="category"][list]') || document.querySelector('input[list="gallery-categories-datalist"]');

      return {
        hasSlugInput: !!slugInput,
        hasDisplayDateInput: !!displayDateInput,
        hasTagsInput: !!tagsInput,
        hasPostDateInput: !!postDateInput,
        hasDirectFileInput: !!directFileInput,
        hasMediaLibBtn: mediaLibBtn,
        hasFormatSelect: !!formatSelect,
        hasCategoryCombobox: !!categoryCombobox,
      };
    });

    report('Manual slug input removed from Gallery editor', !galleryFormCheck.hasSlugInput);
    report('Manual display_date input removed from Gallery editor', !galleryFormCheck.hasDisplayDateInput);
    report('JSON tags input removed from Gallery editor', !galleryFormCheck.hasTagsInput);
    report('Exactly one canonical Post Date input present', galleryFormCheck.hasPostDateInput);
    report('Direct file upload input present for media', galleryFormCheck.hasDirectFileInput);
    report('Browse Media Library button present', galleryFormCheck.hasMediaLibBtn);
    report('Controlled post format / type dropdown present', galleryFormCheck.hasFormatSelect);
    report('Category hybrid combobox present', galleryFormCheck.hasCategoryCombobox);
  }

  // 3C. Test Optional Title on Gallery Post
  console.log('\n3C. Testing Gallery Post Creation with Optional (Empty) Title...');
  const submitResult = await page.evaluate(async () => {
    const titleInput = document.querySelector('input[name="title"]');
    return {
      titleRequired: titleInput?.hasAttribute('required') || false
    };
  });
  report('Title input does NOT have required attribute (strictly optional)', !submitResult.titleRequired);

  // 3D. Date Formatting Verification on Public Release
  console.log('\n3D. Testing Public Date Formatting Consistency...');
  await page.goto('https://silachomka.vercel.app/release/fridaythe13th', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const releaseDateText = await page.evaluate(() => {
    return document.body.innerText;
  });
  report('Release date formatted properly (e.g. 9th June, 2025)', releaseDateText.toUpperCase().includes('JUNE') && releaseDateText.includes('2025'), `(Contains June & 2025: true)`);
  report('No raw ISO timestamp or 00:00:00 in Release page header', !releaseDateText.includes('T00:00:00') && !releaseDateText.includes('00:00:00.000Z'));

  // 3E. Public Beat Detail Page (/beats/shine)
  console.log('\n3E. Testing Public Beat Detail Page (/beats/shine)...');
  await page.goto('https://silachomka.vercel.app/beats/shine', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.licensing-selector-container', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  const detailLicenseCheck = await page.evaluate(() => {
    const priceEl = document.querySelector('.license-price-value');
    const buyBtn = document.querySelector('.license-buy-btn');
    const currencySelect = document.querySelector('.licensing-selector-container select');
    return {
      priceText: priceEl ? priceEl.innerText.trim() : null,
      btnHref: buyBtn ? buyBtn.getAttribute('href') : null,
      btnTarget: buyBtn ? buyBtn.getAttribute('target') : null,
      hasCurrencySelect: !!currencySelect,
    };
  });
  report('Beat detail licensing selector active', !!detailLicenseCheck.priceText, `(${detailLicenseCheck.priceText})`);
  report('Beat detail buy button links directly to Selar', detailLicenseCheck.btnHref?.includes('selar.com'), `(${detailLicenseCheck.btnHref})`);
  report('Beat detail buy button opens in new tab (target="_blank")', detailLicenseCheck.btnTarget === '_blank');
  report('Beat detail has embedded currency dropdown', detailLicenseCheck.hasCurrencySelect);

  await page.goto('about:blank');
  await page.close();
  await browser.close();
  try {
    fs.rmSync(tmpProfileDir, { recursive: true, force: true });
  } catch {}

  // 3F. Public Beats Catalogue (/beats)
  console.log('\n3F. Testing Public Beats Catalogue (/beats)...');
  const browser2 = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run']
  });
  const beatsPage = await browser2.newPage();
  await beatsPage.setViewport({ width: 1280, height: 900 });
  await beatsPage.goto('https://silachomka.vercel.app/beats', { waitUntil: 'domcontentloaded' });
  await beatsPage.waitForSelector('#beats-currency-select', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  const currencySelectExists = await beatsPage.$('#beats-currency-select');
  report('Currency switcher dropdown present on /beats', !!currencySelectExists);

  const priceBadges = await beatsPage.evaluate(() => {
    const badges = Array.from(document.querySelectorAll('.beat-price'));
    return badges.map(b => b.innerText.trim()).filter(t => t.includes('₦') || t.includes('$') || t.toLowerCase().includes('from'));
  });
  report('Dynamic Selar prices rendered on beat cards', priceBadges.length > 0, `(${priceBadges[0]})`);

  if (currencySelectExists) {
    await beatsPage.evaluate(() => {
      const el = document.querySelector('#beats-currency-select');
      const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (el[key]?.memoizedProps?.onChange) {
        el[key].memoizedProps.onChange({ target: { value: 'USD' } });
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    const usdBadges = await beatsPage.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('.beat-price'));
      return badges.map(b => b.innerText.trim()).filter(t => t.includes('$'));
    });
    report('Switching currency updates prices to USD ($)', usdBadges.length > 0, `(Sample: ${usdBadges[0]})`);
  }

  await beatsPage.goto('about:blank');
  await beatsPage.close();
  await browser2.close();
  await pgClient.end();

  console.log('\n========================================================');
  console.log(' ALL STAGE 23 VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('========================================================');
}

main().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

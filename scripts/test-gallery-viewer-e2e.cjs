// scripts/test-gallery-viewer-e2e.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const assert = require('assert');

const mockData = {
  '/api/releases': [],
  '/api/beats': [],
  '/api/gallery': [
    {
      id: 'gal-carousel-1',
      slug: 'gal-carousel-1',
      title: 'Midnight Echoes Session',
      caption: 'Live studio recordings and vocal sessions in West London. #studiosessions #chomkamusic',
      category: 'STUDIO & BTS',
      location: 'London, UK',
      date: '2026-02-08T00:00:00.000Z',
      displayDate: 'Sunday, February 8, 2026',
      post_type: 'carousel',
      type: 'carousel',
      slides: [
        '/api/media/asset/slide-1.jpg',
        '/api/media/asset/slide-2.jpg',
        '/api/media/asset/slide-3.jpg',
        '/api/media/asset/slide-4.jpg',
      ],
      tags: ['studiosessions', 'chomkamusic'],
    }
  ],
  '/api/gallery/gal-carousel-1': {
    id: 'gal-carousel-1',
    slug: 'gal-carousel-1',
    title: 'Midnight Echoes Session',
    caption: 'Live studio recordings and vocal sessions in West London. #studiosessions #chomkamusic',
    category: 'STUDIO & BTS',
    location: 'London, UK',
    date: '2026-02-08T00:00:00.000Z',
    displayDate: 'Sunday, February 8, 2026',
    post_type: 'carousel',
    type: 'carousel',
    slides: [
      '/api/media/asset/slide-1.jpg',
      '/api/media/asset/slide-2.jpg',
      '/api/media/asset/slide-3.jpg',
      '/api/media/asset/slide-4.jpg',
    ],
    tags: ['studiosessions', 'chomkamusic'],
  },
  '/api/music-videos': [],
  '/api/social-links': {
    artist: [{ name: 'Instagram', url: 'https://instagram.com/silachomka' }],
    ecosystem: [{ name: 'chomkaMUSIC', url: 'https://chomkamusic.com' }],
    galleryEligible: []
  },
  '/api/events': [],
  '/api/calendar': [
    {
      id: 'gal-gal-carousel-1',
      title: 'Midnight Echoes Session',
      slug: 'gal-carousel-1',
      subtype: 'STUDIO & BTS',
      date: '2026-02-08',
      image: '/api/media/asset/slide-1.jpg',
      type: 'gallery',
      badge: 'GALLERY MOMENT',
      url: '/gallery/gal-carousel-1',
    }
  ]
};

function startServer(port = 5199) {
  return new Promise((resolve) => {
    const distPath = path.join(__dirname, '../dist');
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://localhost:${port}`);
      const pathname = parsedUrl.pathname;

      if (mockData[pathname]) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(mockData[pathname]));
      }

      if (pathname.startsWith('/api/media/asset/')) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        return res.end(Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
      }

      const cleanUrl = pathname.replace(/^\/+/, '');
      let filePath = path.join(distPath, cleanUrl);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const types = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.ico': 'image/x-icon'
        };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        return fs.createReadStream(filePath).pipe(res);
      }

      if (path.extname(cleanUrl)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
      }

      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return fs.createReadStream(indexHtml).pipe(res);
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function runTest() {
  console.log('=== STARTING E2E GALLERY VIEWER REDESIGN TEST IN HEADLESS BROWSER ===\n');
  const port = 5199;
  const server = await startServer(port);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') && !text.includes('Failed to load resource')) {
          errors.push(text);
        }
      }
    });

    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    console.log(`Navigating to http://localhost:${port}/#gallery ...`);
    await page.goto(`http://localhost:${port}/#gallery`, { waitUntil: 'networkidle0' });

    // Click on the gallery card to open the interactive modal
    await page.waitForSelector('.gallery-card', { timeout: 6000 });
    await page.click('.gallery-card');

    // Wait for Gallery Post Viewer modal to open
    await page.waitForSelector('.gallery-modal-backdrop .gallery-modal-dialog', { timeout: 6000 });
    console.log('✓ Test 2: Gallery viewer interactive modal mounted');

    // 1. Verify Google Search Console Token in <head>
    const gscToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="google-site-verification"]');
      return meta ? meta.getAttribute('content') : null;
    });
    console.log('Google verification token in <head>:', gscToken);
    assert.strictEqual(gscToken, '-Lu4QZDYaWbSVxfGZZlr2Q5xQqlZvM-6wTfMyWwMXBs', 'Google verification token is intact in <head>');
    console.log('✓ Test 1: Google verification token preserved in <head>');

    // 3. Inspect Editorial Location Signature
    const locationInfo = await page.evaluate(() => {
      const el = document.querySelector('.gallery-editorial-location');
      const textEl = el ? el.querySelector('.location-name') : null;
      const glyphEl = el ? el.querySelector('.location-marker-glyph') : null;
      return {
        exists: Boolean(el),
        text: textEl ? textEl.innerText.trim() : null,
        hasGlyph: Boolean(glyphEl),
      };
    });
    console.log('Editorial location info:', locationInfo);
    assert(locationInfo.exists, 'Editorial location exists');
    assert.strictEqual(locationInfo.text, 'London, UK', 'Location text is correctly displayed');
    assert(locationInfo.hasGlyph, 'Location marker glyph is present');
    console.log('✓ Test 3: Signature Editorial Location Detail verified');

    // 4. Inspect Date as Functional Calendar Gateway
    const dateGatewayInfo = await page.evaluate(() => {
      const el = document.querySelector('.gallery-date-gateway');
      const textEl = el ? el.querySelector('.date-gateway-text') : null;
      const pillEl = el ? el.querySelector('.date-gateway-pill') : null;
      const href = el ? el.getAttribute('href') : null;
      const icon = el ? el.querySelector('.date-gateway-icon') : null;
      return {
        exists: Boolean(el),
        text: textEl ? textEl.innerText.trim() : null,
        pill: pillEl ? pillEl.innerText.trim() : null,
        href,
        hasIcon: Boolean(icon),
      };
    });
    console.log('Date Gateway info:', dateGatewayInfo);
    assert(dateGatewayInfo.exists, 'Date Gateway element exists');
    assert(dateGatewayInfo.text.includes('Sunday, February 8, 2026'), 'Date Gateway displays formatted date');
    assert(dateGatewayInfo.href.includes('/calendar?'), 'Date Gateway links to /calendar');
    assert(dateGatewayInfo.href.includes('date=2026-02-08'), 'Date Gateway URL includes date parameter');
    assert(dateGatewayInfo.href.includes('month=2026-02'), 'Date Gateway URL includes month parameter');
    assert(dateGatewayInfo.href.includes('actId=gal-gal-carousel-1'), 'Date Gateway URL includes actId parameter');
    assert(dateGatewayInfo.hasIcon, 'Date Gateway contains calendar SVG icon');
    console.log('✓ Test 4: Date as Functional Calendar Gateway verified');

    // 5. Inspect Header & Close Button Layout Non-Collision
    const layoutCollisionCheck = await page.evaluate(() => {
      const dateEl = document.querySelector('.gallery-date-gateway');
      const headerEl = document.querySelector('.gallery-sidebar-header');
      const closeBtn = document.querySelector('.gallery-modal-close');

      const dateRect = dateEl ? dateEl.getBoundingClientRect() : null;
      const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
      const closeRect = closeBtn ? closeBtn.getBoundingClientRect() : null;

      if (!closeRect || !dateRect || !headerRect) {
        return {
          valid: false,
          reason: `Elements missing: close=${Boolean(closeRect)} date=${Boolean(dateRect)} header=${Boolean(headerRect)}`
        };
      }

      // Check if closeRect overlaps with dateRect
      const overlapDate = !(
        closeRect.right < dateRect.left ||
        closeRect.left > dateRect.right ||
        closeRect.bottom < dateRect.top ||
        closeRect.top > dateRect.bottom
      );

      return {
        valid: true,
        overlapDate,
        closeRect: { top: closeRect.top, right: closeRect.right, bottom: closeRect.bottom, left: closeRect.left },
        dateRect: { top: dateRect.top, right: dateRect.right, bottom: dateRect.bottom, left: dateRect.left },
      };
    });
    console.log('Layout collision check:', layoutCollisionCheck);
    assert(layoutCollisionCheck.valid, `Layout collision check valid: ${layoutCollisionCheck.reason}`);
    assert(!layoutCollisionCheck.overlapDate, 'Close button does NOT overlap with the date gateway!');
    console.log('✓ Test 5: Close button is completely decoupled and does not collide with date');

    // 6. Test Carousel Navigation & Zero-Padded Counter
    const initialCounter = await page.evaluate(() => {
      const el = document.querySelector('.carousel-counter-badge');
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    console.log('Initial slide counter:', initialCounter);
    assert.strictEqual(initialCounter, '01 / 04', 'Slide counter starts at 01 / 04');

    // Click next slide
    await page.click('.carousel-next');
    await new Promise((r) => setTimeout(r, 600));

    const nextCounter = await page.evaluate(() => {
      const el = document.querySelector('.carousel-counter-badge');
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    console.log('Counter after clicking Next:', nextCounter);
    assert.strictEqual(nextCounter, '02 / 04', 'Slide counter advances to 02 / 04');

    // Click prev slide
    await page.click('.carousel-prev');
    await new Promise((r) => setTimeout(r, 600));

    const prevCounter = await page.evaluate(() => {
      const el = document.querySelector('.carousel-counter-badge');
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
    });
    console.log('Counter after clicking Prev:', prevCounter);
    assert.strictEqual(prevCounter, '01 / 04', 'Slide counter returns to 01 / 04');
    console.log('✓ Test 6: Carousel slide navigation and zero-padded counter verified');

    // 7. Test Calendar Navigation from Date Gateway Click
    console.log('Clicking Date Gateway to navigate to Calendar...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.gallery-date-gateway'),
    ]);

    const calendarUrl = page.url();
    console.log('Current URL after Date Gateway click:', calendarUrl);
    assert(calendarUrl.includes('/calendar'), 'Navigated to /calendar');
    assert(calendarUrl.includes('date=2026-02-08'), 'URL preserves targeted date');
    assert(calendarUrl.includes('actId=gal-gal-carousel-1'), 'URL preserves targeted actId');

    // Wait for calendar day drawer or card
    await page.waitForSelector('.calendar-grid-wrapper, .calendar-drawer-card, .timeline-entry', { timeout: 6000 });
    console.log('✓ Test 7: Calendar navigation from Date Gateway successfully opened targeted day');

    assert.strictEqual(errors.length, 0, `Page errors encountered: ${JSON.stringify(errors)}`);
    console.log('✓ Test 8: Zero console or runtime errors during interaction');

    console.log('\nALL E2E GALLERY VIEWER & CALENDAR INTEGRATION TESTS PASSED PERFECTLY!');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

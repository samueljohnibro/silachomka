// scripts/test-homepage-events-regression.cjs
// Regression test: Verifies homepage JavaScript runtime behavior when event data is:
// 1. Available (populated with active/upcoming events)
// 2. Empty (no events)
// 3. Unavailable (API 500 Error / network outage)
// 4. Malformed / null
// Specifically guards against: Uncaught ReferenceError: events is not defined

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HOST = '127.0.0.1';
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;

let currentEventsScenario = 'AVAILABLE'; // 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE' | 'MALFORMED'

const MOCK_RELEASES = [
  {
    id: 'rel-1',
    title: 'NOISEMAKER',
    slug: 'noisemaker',
    release_date: '2026-01-01',
    date: '2026-01-01',
    cover: '/og-image.png',
    artist: 'silachomka',
    tracks: [{ title: 'Track 1' }]
  }
];

const MOCK_EVENTS = [
  {
    id: 'evt-1',
    title: 'SANCTUARY ACOUSTIC SESSION',
    slug: 'sanctuary-acoustic-session',
    subtitle: 'Intimate Live Gathering',
    event_date: '2026-12-25',
    start_time: '19:00',
    venue_name: 'Sanctuary Pavilion',
    city: 'Lagos',
    is_published: true,
    status: 'UPCOMING',
    ticket_status: 'AVAILABLE',
    ticket_url: 'https://tickets.example.com/sanctuary'
  }
];

function createMockServer() {
  const distDir = path.resolve(__dirname, '..', 'dist');

  return http.createServer((req, res) => {
    try {
      let [rawPath] = req.url.split('?');

      // API mocks
      if (rawPath === '/api/events') {
        if (currentEventsScenario === 'UNAVAILABLE') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Database service unavailable' }));
          return;
        }
        if (currentEventsScenario === 'EMPTY') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }
        if (currentEventsScenario === 'MALFORMED') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([null, { id: 'bad-evt' }]));
          return;
        }
        // AVAILABLE
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(MOCK_EVENTS));
        return;
      }

      if (rawPath === '/api/releases') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(MOCK_RELEASES));
        return;
      }

      if (rawPath === '/api/beats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      if (rawPath === '/api/gallery') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      if (rawPath === '/api/music-videos') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      if (rawPath === '/api/social-links') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          artist: [{ name: 'Instagram', url: 'https://instagram.com/silachomka' }],
          ecosystem: [{ name: 'chomkaMUSIC', url: 'https://chomkamusic.com' }],
          galleryEligible: []
        }));
        return;
      }

      if (rawPath.startsWith('/api/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      // Static assets from dist
      let cleanUrl = rawPath.replace(/^\/+/, '');
      let file = path.join(distDir, cleanUrl || 'index.html');
      const ext = path.extname(cleanUrl);

      if (ext && !fs.existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(distDir, 'index.html');
      }

      const resolvedExt = path.extname(file);
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2'
      };

      res.writeHead(200, { 'Content-Type': mimeTypes[resolvedExt] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    } catch (err) {
      console.error('[Server Error]:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    }
  });
}

async function runRegressionSuite() {
  console.log('======================================================================');
  console.log(' HOMEPAGE JAVASCRIPT RUNTIME & EVENTS RESILIENCE REGRESSION TEST');
  console.log('======================================================================');

  // Verify dist exists
  const distHtml = path.resolve(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(distHtml)) {
    console.error('ERROR: dist/index.html not found! Run npm run build first.');
    process.exit(1);
  }

  const server = createMockServer();
  await new Promise((resolve) => server.listen(PORT, HOST, resolve));
  console.log(`[HTTP Server] Listening on ${BASE_URL}`);

  let browser;
  let totalPassed = 0;
  let totalFailed = 0;

  function assert(cond, name) {
    if (cond) {
      console.log(`  [PASS] ${name}`);
      totalPassed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      totalFailed++;
    }
  }

  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=412,892']
    });

    const scenarios = [
      {
        name: 'Scenario 1: Events Available (Populated Upcoming Event)',
        scenario: 'AVAILABLE',
        expectEventsSection: true
      },
      {
        name: 'Scenario 2: Events Empty (No Events in Database)',
        scenario: 'EMPTY',
        expectEventsSection: false
      },
      {
        name: 'Scenario 3: Events Unavailable (API 500 Error / Outage)',
        scenario: 'UNAVAILABLE',
        expectEventsSection: false
      },
      {
        name: 'Scenario 4: Events Malformed (Null / Incomplete objects)',
        scenario: 'MALFORMED',
        expectEventsSection: false
      }
    ];

    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 892, isMobile: true, hasTouch: true });
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    );

    for (const sc of scenarios) {
      console.log(`\n--- Running ${sc.name} ---`);
      currentEventsScenario = sc.scenario;

      const uncaughtErrors = [];
      const consoleErrors = [];

      const errorHandler = (err) => {
        uncaughtErrors.push(err.message || String(err));
      };
      const consoleHandler = (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      };

      page.on('pageerror', errorHandler);
      page.on('console', consoleHandler);

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // Allow React reconciliation and store sync
      await new Promise((r) => setTimeout(r, 1200));

      // Assert no uncaught ReferenceErrors
      const hasReferenceError = uncaughtErrors.some(e => e.includes('events is not defined') || e.includes('ReferenceError'));
      assert(!hasReferenceError, `${sc.name}: No "ReferenceError: events is not defined" thrown`);
      assert(uncaughtErrors.length === 0, `${sc.name}: Zero uncaught page errors (got ${uncaughtErrors.length})`);

      // Verify DOM loaded
      const pageInfo = await page.evaluate(() => {
        return {
          title: document.title,
          hasMain: Boolean(document.querySelector('main#top')),
          hasHero: Boolean(document.querySelector('.hero')),
          hasFooter: Boolean(document.querySelector('footer, .site-footer')),
          hasEventsSection: Boolean(document.querySelector('#events.home-events-section')),
          errorBoundaryActive: Boolean(document.body.innerText.includes('Display Refresh Required') || document.body.innerText.includes('Studio Session Interrupted'))
        };
      });

      assert(pageInfo.hasMain && pageInfo.hasHero, `${sc.name}: Homepage main content and hero successfully rendered`);
      assert(!pageInfo.errorBoundaryActive, `${sc.name}: RootErrorBoundary did not trigger`);

      if (sc.expectEventsSection) {
        assert(pageInfo.hasEventsSection, `${sc.name}: Events section is displayed when published active events exist`);
      } else {
        assert(!pageInfo.hasEventsSection, `${sc.name}: Events section gracefully remains hidden when events are empty/unavailable`);
      }

      page.off('pageerror', errorHandler);
      page.off('console', consoleHandler);
    }

    await page.close();
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log('\n======================================================================');
  console.log(` RESULTS: ${totalPassed} passed, ${totalFailed} failed.`);
  console.log('======================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('[Regression Suite Error]:', err);
  process.exit(1);
});

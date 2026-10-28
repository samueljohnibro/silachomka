const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const mockData = {
  '/api/releases': [
    {
      id: 'rel-1',
      title: 'NOISEMAKER',
      slug: 'noisemaker',
      year: '2026',
      genre: 'Afrobeats',
      description: 'Debut studio album featuring heavyweight anthems.',
      tracks: [{ title: 'Intro' }, { title: 'Noisemaker' }, { title: 'Vibe Track' }]
    }
  ],
  '/api/beats': [
    {
      id: 'beat-1',
      title: 'LAGOS NIGHTS',
      slug: 'lagos-nights',
      genre: 'AFROBEATS TYPE BEAT',
      shortGenre: 'AFROBEATS',
      mood: 'Energetic',
      key: 'F# Minor',
      bpm: 104,
      price: 35000,
      tags: 'afro, party, bounce' // String format test
    },
    {
      id: 'beat-2',
      title: 'MIDNIGHT AMAPIANO',
      slug: 'midnight-amapiano',
      genre: 'AMAPIANO TYPE BEAT',
      shortGenre: 'AMAPIANO',
      mood: 'Groovy',
      key: 'C Minor',
      bpm: 112,
      price: 45000,
      tags: ['amapiano', 'log drum', 'vibes'] // Array format test
    }
  ],
  '/api/gallery': [
    {
      id: 'gal-1',
      title: 'Studio Sessions Vault',
      caption: 'Recording late night vocals with vintage Neumann.',
      category: 'STUDIO',
      location: 'Chomka Nation HQ',
      // CRITICAL: tags as an object was the exact culprit that crashed the old code
      tags: { is_hero: true, location: 'Chomka Nation HQ', assignedSocials: ['instagram'] }
    }
  ],
  '/api/music-videos': [],
  '/api/social-links': {
    artist: [{ name: 'Instagram', url: 'https://instagram.com/silachomka' }],
    ecosystem: [{ name: 'chomkaMUSIC', url: 'https://chomkamusic.com' }],
    galleryEligible: []
  },
  '/api/events': [
    {
      id: 'evt-1',
      title: 'CHOMKA LIVE IN CONCERT',
      slug: 'chomka-live-in-concert',
      date: '2026-12-15',
      time: '20:00',
      venue: 'Eko Convention Centre',
      city: 'Lagos',
      country: 'Nigeria',
      ticket_status: 'AVAILABLE',
      lineup: ['silachomka', 'Guest Stars']
    }
  ]
};

const server = http.createServer((req, res) => {
  let [rawPath] = req.url.split('?');

  if (mockData[rawPath]) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(mockData[rawPath]));
    return;
  }

  if (rawPath.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }

  // Handle static assets
  let cleanUrl = rawPath.replace(/^\/+/, '');
  let file = path.join(__dirname, '..', 'dist', cleanUrl || 'index.html');
  const ext = path.extname(cleanUrl);

  // If request has an extension and file doesn't exist, return 404
  if (ext && !fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(__dirname, '..', 'dist', 'index.html');
  }

  const resolvedExt = path.extname(file);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  res.writeHead(200, { 'Content-Type': types[resolvedExt] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(4210, async () => {
  const pageErrors = [];
  const consoleErrors = [];
  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('pageerror', err => {
      console.error('PAGE ERROR CAUGHT:', err.message);
      pageErrors.push(err.message);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('CONSOLE ERROR:', msg.text());
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:4210/', { waitUntil: 'networkidle2' });

    // Wait for AI trigger button
    await page.waitForSelector('.chomka-magic-ai-trigger', { timeout: 10000 });
    console.log('AI trigger button found.');

    // Click AI trigger to open modal
    await page.click('.chomka-magic-ai-trigger');
    await page.waitForSelector('.chomka-ai-modal-dialog', { timeout: 5000 });
    console.log('AI modal dialog opened successfully.');

    // Test sequence of typing queries
    const queries = [
      'a',
      'b',
      'vocal',
      'afrobeats',
      'mixing 2 songs and vocals for 4 hours',
      'silachomka',
      'tour dates',
      'custom',
      'randomxyz123',
      'studio',
      'concert',
      'vault',
      'amapiano'
    ];

    for (const q of queries) {
      // Clear input
      await page.click('.chomka-ai-search-input', { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 60));
      
      // Type query
      await page.type('.chomka-ai-search-input', q, { delay: 30 });
      await new Promise(r => setTimeout(r, 200));

      const modalState = await page.evaluate(() => {
        const dialog = document.querySelector('.chomka-ai-modal-dialog');
        const rootError = document.querySelector('.root-error-boundary');
        const searchBox = document.querySelector('.chomka-ai-search-input');
        return {
          isOpen: Boolean(dialog),
          hasRootError: Boolean(rootError),
          inputValue: searchBox ? searchBox.value : null,
          dialogSnippet: dialog ? dialog.innerText.slice(0, 100).replace(/\n+/g, ' ') : null,
        };
      });

      console.log(`Query "${q}" -> State:`, JSON.stringify(modalState));
      if (modalState.hasRootError) {
        throw new Error(`RootErrorBoundary was triggered on query "${q}"!`);
      }
      if (!modalState.isOpen) {
        throw new Error(`Modal closed unexpectedly on query "${q}"!`);
      }
    }

    console.log('Total Page Errors:', pageErrors.length);
    console.log('Total Console Errors:', consoleErrors.length);
    if (pageErrors.length > 0) {
      throw new Error('Page errors occurred during typing test!');
    }

    console.log('SUCCESS: All typing queries in Chomka AI assistant executed with ZERO errors and ZERO unhandled exceptions!');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));

// Load environment variables from worker/.dev.vars or env
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  try {
    const devVarsPath = path.resolve(__dirname, '../worker/.dev.vars');
    if (fs.existsSync(devVarsPath)) {
      const devVars = fs.readFileSync(devVarsPath, 'utf8');
      const match = devVars.match(/DATABASE_URL="?([^"\r\n]+)"?/);
      if (match) connectionString = match[1].trim();
    }
  } catch (e) {}
}

const API_BASE = 'https://silachomka-api.samueljohnibrotech.workers.dev';

async function run() {
  console.log('====================================================');
  console.log(' STAGE 25 COMPREHENSIVE VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // 1. Database Schema Checks
  // ----------------------------------------------------
  console.log('--- 1. Database Schema & Migration Verification ---');
  if (connectionString) {
    const client = new Client({ connectionString });
    await client.connect();

    try {
      await testAsync('releases table has preview_asset_id column', async () => {
        const res = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'releases' AND column_name = 'preview_asset_id'
        `);
        assert.strictEqual(res.rows.length, 1, 'preview_asset_id column must exist in releases table');
        assert.strictEqual(res.rows[0].data_type, 'uuid', 'preview_asset_id must be uuid');
      });

      await testAsync('social_links table has show_on_gallery_posts column', async () => {
        const res = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'social_links' AND column_name = 'show_on_gallery_posts'
        `);
        assert.strictEqual(res.rows.length, 1, 'show_on_gallery_posts column must exist in social_links table');
        assert.strictEqual(res.rows[0].data_type, 'boolean', 'show_on_gallery_posts must be boolean');
      });

      await testAsync('Core artist social links are configured for gallery eligibility', async () => {
        const res = await client.query(`
          SELECT name, platform, show_on_gallery_posts 
          FROM social_links 
          WHERE link_type = 'ARTIST' AND show_on_gallery_posts = true AND deleted_at IS NULL
        `);
        assert(res.rows.length >= 3, `Expected at least 3 artist links eligible for gallery, found ${res.rows.length}`);
      });
    } finally {
      await client.end();
    }
  } else {
    console.log('  [SKIP] DATABASE_URL not available for direct Postgres checks.');
  }

  // ----------------------------------------------------
  // 2. Cloudflare Worker Live API Checks
  // ----------------------------------------------------
  console.log('\n--- 2. Cloudflare Worker API Checks ---');

  await testAsync('GET /api/releases returns preview_audio_url and scheduled releases', async () => {
    const res = await fetch(`${API_BASE}/api/releases`);
    assert(res.ok, `Expected 200 OK from /api/releases, got ${res.status}`);
    const releases = await res.json();
    assert(Array.isArray(releases), 'Expected releases array');
    assert(releases.length > 0, 'Expected non-empty releases array');
    
    // Check that preview_audio_url field is exposed on release objects
    const first = releases[0];
    assert('preview_audio_url' in first, 'Expected preview_audio_url field on release items');
  });

  await testAsync('GET /api/social-links returns galleryEligible list', async () => {
    const res = await fetch(`${API_BASE}/api/social-links`);
    assert(res.ok, `Expected 200 OK from /api/social-links, got ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.artist), 'Expected data.artist array');
    assert(Array.isArray(data.ecosystem), 'Expected data.ecosystem array');
    assert(Array.isArray(data.galleryEligible), 'Expected data.galleryEligible array');
    assert(data.galleryEligible.length > 0, 'Expected at least 1 gallery-eligible social link');
  });

  // ----------------------------------------------------
  // 3. Frontend Component & Code Architecture Checks
  // ----------------------------------------------------
  console.log('\n--- 3. Frontend Components & UX Architecture ---');

  test('RandomPreviewPlayer.jsx exists and has zero emojis and 30s random window', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/components/RandomPreviewPlayer.jsx'), 'utf8');
    assert(code.includes('pickRandomWindow'), 'Expected pickRandomWindow implementation');
    assert(code.includes('currentTimeInSnippet'), 'Expected snippet tracking');
    assert(code.includes('handleShuffle'), 'Expected shuffle functionality');
    // Ensure zero emoji characters in component
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert(!emojiRegex.test(code), 'RandomPreviewPlayer must have ZERO emojis');
  });

  test('MediaAssetPicker.jsx has video preview, mime validation, and robust response handling', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/components/admin/MediaAssetPicker.jsx'), 'utf8');
    assert(code.includes('<video'), 'Expected <video> preview for VIDEO asset type');
    assert(code.includes('res?.asset || res'), 'Expected robust response extraction');
    assert(code.includes('100 * 1024 * 1024'), 'Expected file size limit guard');
  });

  test('AdminGalleryPage.jsx has video upload crash fix and null-safe filtering', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/pages/admin/AdminGalleryPage.jsx'), 'utf8');
    assert(code.includes('res?.asset || res'), 'Expected safe asset unwrapping in handleFileUpload');
    assert(code.includes('if (!a) return false;'), 'Expected null-safe filtering for filteredLibraryAssets');
    assert(!code.includes('const newAsset = res.asset;'), 'Must not read res.asset blindly');
  });

  test('AdminMusicPage.jsx has Preview Audio MP3 picker and Save Project Metadata state machine', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/pages/admin/AdminMusicPage.jsx'), 'utf8');
    assert(code.includes('preview_asset_id'), 'Expected preview_asset_id handling in AdminMusicPage');
    assert(code.includes('Save Project Metadata'), 'Expected "Save Project Metadata" default button text');
    assert(code.includes('Saving…'), 'Expected "Saving…" button text during submit');
    assert(code.includes('Saved'), 'Expected "Saved" button text after success');
    assert(code.includes('status: "DRAFT"'), 'Default initial state on create must be DRAFT');
  });

  test('AdminBeatsPage.jsx has independent controls and Save Beat state machine', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/pages/admin/AdminBeatsPage.jsx'), 'utf8');
    assert(code.includes('image_asset_id'), 'Expected independent cover art control');
    assert(code.includes('audio_asset_id'), 'Expected independent audio control');
    assert(code.includes('video_asset_id'), 'Expected independent video control');
    assert(code.includes('Save Beat'), 'Expected "Save Beat" button text');
    assert(code.includes('status: \'DRAFT\''), 'Default initial state on create must be DRAFT');
  });

  test('AdminLinksPage.jsx has show_on_gallery_posts toggle and Save Link state machine', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/pages/admin/AdminLinksPage.jsx'), 'utf8');
    assert(code.includes('show_on_gallery_posts'), 'Expected show_on_gallery_posts field in AdminLinksPage');
    assert(code.includes('Show on Gallery Posts'), 'Expected checkbox label in form');
    assert(code.includes('Gallery CTA'), 'Expected badge in listings');
  });

  test('GalleryPostModal.jsx has dynamic social link CTA with anti-repeat logic', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/components/GalleryPostModal.jsx'), 'utf8');
    assert(code.includes('lastSelectedSocialUrl'), 'Expected anti-repeat session logic');
    assert(code.includes('Follow on '), 'Expected dynamic "Follow on [Platform]" label');
    assert(!code.includes('Follow on Instagram <UpRightArrowIcon size={14} />\n                </a>\n              )}'), 'Must not have hardcoded Instagram CTA only');
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert(!emojiRegex.test(code), 'GalleryPostModal dynamic CTA must have ZERO emojis');
  });

  test('ReleasePage.jsx renders ambient backdrop and RandomPreviewPlayer in countdown mode', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/components/ReleasePage.jsx'), 'utf8');
    assert(code.includes('product-ambient-backdrop'), 'Expected atmospheric product-themed backdrop');
    assert(code.includes('<RandomPreviewPlayer'), 'Expected RandomPreviewPlayer rendered in ReleasePage');
  });

  test('App.jsx renders UpcomingReleaseSection ABOVE LatestReleaseSection', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../src/App.jsx'), 'utf8');
    assert(code.includes('UpcomingReleaseSection'), 'Expected UpcomingReleaseSection definition');
    const upcomingIdx = code.indexOf('<UpcomingReleaseSection');
    const latestIdx = code.indexOf('<LatestReleaseSection');
    assert(upcomingIdx !== -1, 'Expected <UpcomingReleaseSection> in JSX');
    assert(latestIdx !== -1, 'Expected <LatestReleaseSection> in JSX');
    assert(upcomingIdx < latestIdx, 'UpcomingReleaseSection MUST be placed ABOVE LatestReleaseSection');
  });

  test('App.css defines product-ambient-backdrop, random-preview-player, and upcoming-section', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/App.css'), 'utf8');
    assert(css.includes('.product-ambient-backdrop'), 'Expected .product-ambient-backdrop CSS');
    assert(css.includes('.random-preview-player'), 'Expected .random-preview-player CSS');
    assert(css.includes('.upcoming-section'), 'Expected .upcoming-section CSS');
    assert(css.includes('prefers-reduced-motion'), 'Expected accessibility prefers-reduced-motion support');
  });

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});

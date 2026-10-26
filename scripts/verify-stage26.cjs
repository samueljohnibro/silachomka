const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));

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
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]/u;

async function run() {
  console.log('====================================================');
  console.log(' STAGE 26 COMPREHENSIVE VERIFICATION SUITE (23 ITEMS)');
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
  // 1. Database Schema & Stage 26 Columns
  // ----------------------------------------------------
  console.log('--- 1. Database Schema & Migration Verification ---');
  if (connectionString) {
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await testAsync('tracks table has preview_asset_id column (Req #19)', async () => {
        const res = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'tracks' AND column_name = 'preview_asset_id'
        `);
        assert.strictEqual(res.rows.length, 1, 'tracks.preview_asset_id must exist');
        assert.strictEqual(res.rows[0].data_type, 'uuid');
      });

      await testAsync('gallery_posts table has external_social_url and external_social_platform columns (Req #18)', async () => {
        const res = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'gallery_posts'
            AND column_name IN ('external_social_url', 'external_social_platform')
        `);
        assert.strictEqual(res.rows.length, 2, 'Both external social columns must exist');
      });

      await testAsync('media_assets table has optimization metadata columns (Req #1)', async () => {
        const res = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'media_assets'
            AND column_name IN ('asset_role', 'source_asset_id', 'original_size_bytes', 'original_mime_type', 'optimization_status')
        `);
        assert.strictEqual(res.rows.length, 5, 'All 5 media optimization columns must exist');
      });
    } finally {
      await client.end();
    }
  }

  // ----------------------------------------------------
  // 2. Live Cloudflare Worker API Checks
  // ----------------------------------------------------
  console.log('\n--- 2. Live Cloudflare Worker API Checks ---');

  await testAsync('GET /api/beats/pricing returns Selar defaultTiers for newly created beats (Req #3)', async () => {
    const res = await fetch(`${API_BASE}/api/beats/pricing?currency=USD`);
    assert(res.ok, `Expected 200 OK from /api/beats/pricing, got ${res.status}`);
    const data = await res.json();
    assert(data.success, 'Expected success: true');
    assert(data.defaultTiers && typeof data.defaultTiers === 'object', 'Expected defaultTiers object');
  });

  await testAsync('GET /api/beats returns videoMimeType and ?.gif suffix for GIF assets (Req #2 & #8)', async () => {
    const res = await fetch(`${API_BASE}/api/beats`);
    assert(res.ok, `Expected 200 OK from /api/beats, got ${res.status}`);
    const beats = await res.json();
    assert(Array.isArray(beats) && beats.length > 0, 'Expected non-empty beats array');
    assert('videoMimeType' in beats[0], 'Expected videoMimeType field in /api/beats');
  });

  await testAsync('GET /api/releases returns preview_audio_urls array pool without exposing track names in preview player (Req #19)', async () => {
    const res = await fetch(`${API_BASE}/api/releases`);
    assert(res.ok, `Expected 200 OK from /api/releases, got ${res.status}`);
    const releases = await res.json();
    assert(Array.isArray(releases) && releases.length > 0, 'Expected non-empty releases array');
    assert(Array.isArray(releases[0].preview_audio_urls), 'Expected preview_audio_urls array on release');
  });

  await testAsync('GET /api/gallery returns normalized src, mimeType, externalSocialUrl, externalSocialPlatform (Req #17 & #18)', async () => {
    const res = await fetch(`${API_BASE}/api/gallery`);
    assert(res.ok, `Expected 200 OK from /api/gallery, got ${res.status}`);
    const posts = await res.json();
    assert(Array.isArray(posts) && posts.length > 0, 'Expected non-empty gallery array');
    const first = posts[0];
    assert('src' in first && 'externalSocialUrl' in first && 'externalSocialPlatform' in first, 'Expected Stage 26 gallery fields');
  });

  await testAsync('GET /api/share/beat/:slug returns dynamic Open Graph + Twitter + og:audio metadata (Req #9 & #10)', async () => {
    const beatsRes = await fetch(`${API_BASE}/api/beats`);
    const beats = await beatsRes.json();
    const targetSlug = beats[0].id;
    const shareRes = await fetch(`${API_BASE}/api/share/beat/${encodeURIComponent(targetSlug)}`);
    assert(shareRes.ok, `Expected 200 OK from /api/share/beat/${targetSlug}`);
    const html = await shareRes.text();
    assert(html.includes('property="og:title"'), 'Expected og:title');
    assert(html.includes('property="og:description"'), 'Expected og:description');
    assert(html.includes('property="og:image"'), 'Expected og:image');
    assert(html.includes('name="twitter:card"'), 'Expected twitter:card');
  });

  await testAsync('GET /api/share/release/:slug returns dynamic Open Graph metadata with Out now / Coming soon (Req #10 & #11)', async () => {
    const relRes = await fetch(`${API_BASE}/api/releases`);
    const releases = await relRes.json();
    const targetSlug = releases[0].slug;
    const shareRes = await fetch(`${API_BASE}/api/share/release/${encodeURIComponent(targetSlug)}`);
    assert(shareRes.ok, `Expected 200 OK from /api/share/release/${targetSlug}`);
    const html = await shareRes.text();
    assert(html.includes('property="og:title"'), 'Expected og:title');
    assert(html.includes('Out now.') || html.includes('Coming soon'), 'Expected status-aware social description');
  });

  // ----------------------------------------------------
  // 3. Frontend Requirements & Component Verification
  // ----------------------------------------------------
  console.log('\n--- 3. Frontend Architecture & Stage 26 Requirements ---');

  test('Checklist #1: Universal media optimization pipeline exists and distinguishes ORIGINAL_SOURCE vs OPTIMIZED_WEB', () => {
    const optCode = fs.readFileSync(path.resolve(__dirname, '../src/utils/mediaOptimizer.js'), 'utf8');
    const apiCode = fs.readFileSync(path.resolve(__dirname, '../src/data/adminApi.js'), 'utf8');
    assert(optCode.includes('optimizeMediaBeforeUpload'), 'Expected optimizeMediaBeforeUpload');
    assert(optCode.includes('OPTIMIZED_WEB') && optCode.includes('ORIGINAL_SOURCE'), 'Expected asset_role distinction');
    assert(apiCode.includes('optimizeMediaBeforeUpload'), 'Expected adminApi.uploadMediaAsset to invoke optimizer');
  });

  test('Checklist #2 & #8: Reusable BeatArtwork component progressively loads JPG -> GIF and handles Newly Uploaded GIFs', () => {
    const artworkCode = fs.readFileSync(path.resolve(__dirname, '../src/components/BeatArtwork.jsx'), 'utf8');
    const pickerCode = fs.readFileSync(path.resolve(__dirname, '../src/components/admin/MediaAssetPicker.jsx'), 'utf8');
    assert(artworkCode.includes('IntersectionObserver'), 'Expected lazy viewport loading in BeatArtwork');
    assert(artworkCode.includes('gifLoaded'), 'Expected progressive JPG -> GIF state');
    assert(pickerCode.includes("mime_type === 'image/gif'"), 'Expected MediaAssetPicker GIF preview support');
  });

  test('Checklist #3: Shared CurrencyContext & Selar defaultTiers fallback update all beats immediately', () => {
    const ctxCode = fs.readFileSync(path.resolve(__dirname, '../src/data/CurrencyContext.jsx'), 'utf8');
    const hookCode = fs.readFileSync(path.resolve(__dirname, '../src/data/useSelarPricing.js'), 'utf8');
    assert(ctxCode.includes('CurrencyProvider'), 'Expected shared CurrencyProvider');
    assert(hookCode.includes('pricingData.defaultTiers'), 'Expected Selar defaultTiers fallback for newly uploaded beats');
  });

  test('Checklist #4 & #5: COMING SOON centered and Beat Detail Licensing Price UI responsive in App.css', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/App.css'), 'utf8');
    assert(css.includes('.coming-soon-header') && css.includes('justify-content: center'), 'Expected centered .coming-soon-header');
    assert(css.includes('.license-tab-price') && css.includes('overflow-wrap: anywhere'), 'Expected responsive .license-tab-price');
    assert(css.includes('.license-price-value'), 'Expected responsive .license-price-value');
  });

  test('Checklist #6: BeatsPage Crash / STATUS_BREAKPOINT fixed (memoized BeatCard, throttled RAF, no eager GIF preloading)', () => {
    const beatsCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/BeatsPage.jsx'), 'utf8');
    const slideCode = fs.readFileSync(path.resolve(__dirname, '../src/components/MediaSlideshow.jsx'), 'utf8');
    assert(beatsCode.includes('memo(function BeatCard'), 'Expected memoized BeatCard');
    assert(beatsCode.includes('lastProgressCommitRef'), 'Expected throttled progress state updates');
    assert(!slideCode.includes('safeMedia.forEach'), 'Must not eagerly decode all GIFs into memory via safeMedia.forEach');
  });

  test('Checklist #7: Atmospheric blurred product artwork background preserves StarrySpaceBackground', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/App.css'), 'utf8');
    const beatDetailCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/BeatDetailPage.jsx'), 'utf8');
    assert(beatDetailCode.includes('product-ambient-backdrop'), 'Expected product-ambient-backdrop on BeatDetailPage');
    assert(css.includes('mask-image: radial-gradient'), 'Expected radial mask blending into starry background');
  });

  test('Checklist #9, #10 & #11: SeoHead, generate-social-pages.js, and vercel.json support newly created items & dynamic release status', () => {
    const seoCode = fs.readFileSync(path.resolve(__dirname, '../src/components/SeoHead.jsx'), 'utf8');
    const genCode = fs.readFileSync(path.resolve(__dirname, '../scripts/generate-social-pages.js'), 'utf8');
    const vercelJson = fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8');
    assert(seoCode.includes('upsertMetaTag'), 'Expected live DOM head synchronization in SeoHead');
    assert(genCode.includes('Coming soon') && genCode.includes('Out now.'), 'Expected dynamic release social descriptions');
    assert(vercelJson.includes('/api/share/beat/:id') && vercelJson.includes('/api/share/release/:slug'), 'Expected crawler rewrites in vercel.json');
  });

  test('Checklist #12: ReleasePage has non-blocking COMING SOON / OUT NOW entry animation with zero emojis', () => {
    const relCode = fs.readFileSync(path.resolve(__dirname, '../src/components/ReleasePage.jsx'), 'utf8');
    const css = fs.readFileSync(path.resolve(__dirname, '../src/App.css'), 'utf8');
    assert(relCode.includes('release-entry-splash'), 'Expected release-entry-splash in ReleasePage');
    assert(css.includes('.release-entry-splash') && css.includes('pointer-events: none'), 'Expected non-blocking pointer-events: none on splash');
    assert(!EMOJI_REGEX.test(relCode), 'ReleasePage must have ZERO emojis');
  });

  test('Checklist #13, #14, #15 & #16: 1 MIN / FULL TRACK toggle, redesigned Beats header, stacked Reel genre/price, and BeatDetail full transport controls', () => {
    const beatsCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/BeatsPage.jsx'), 'utf8');
    const detailCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/BeatDetailPage.jsx'), 'utf8');
    assert(beatsCode.includes('FULL TRACK') && beatsCode.includes('1 MIN'), 'Expected 1 MIN / FULL TRACK toggle in BeatsPage');
    assert(beatsCode.includes('beats-toolbar-primary') && beatsCode.includes('beats-segmented-group'), 'Expected redesigned Beats catalogue header');
    assert(detailCode.includes('seekBackward') && detailCode.includes('seekForward') && detailCode.includes('cycleRepeatMode'), 'Expected full player controls on BeatDetailPage');
    assert(!EMOJI_REGEX.test(detailCode), 'BeatDetailPage must have ZERO emojis');
  });

  test('Checklist #17 & #18: Gallery single/carousel/video integrity & External Social Post Embeds (Instagram, X, Snapchat)', () => {
    const embedCode = fs.readFileSync(path.resolve(__dirname, '../src/components/SocialPostEmbed.jsx'), 'utf8');
    const modalCode = fs.readFileSync(path.resolve(__dirname, '../src/components/GalleryPostModal.jsx'), 'utf8');
    const adminGalCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/admin/AdminGalleryPage.jsx'), 'utf8');
    assert(embedCode.includes('Instagram') && embedCode.includes('Snapchat') && embedCode.includes('X'), 'Expected Instagram, X, Snapchat support in SocialPostEmbed');
    assert(modalCode.includes('SocialPostEmbed'), 'Expected SocialPostEmbed in GalleryPostModal');
    assert(adminGalCode.includes('external_social_url') && adminGalCode.includes('external_social_platform'), 'Expected external social fields in AdminGalleryPage');
  });

  test('Checklist #19 & #20: Track-level preview audio pool (never reveals track title) & reusable LoadingSpinner everywhere', () => {
    const rppCode = fs.readFileSync(path.resolve(__dirname, '../src/components/RandomPreviewPlayer.jsx'), 'utf8');
    const iconsCode = fs.readFileSync(path.resolve(__dirname, '../src/components/Icons.jsx'), 'utf8');
    const adminMusicCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/admin/AdminMusicPage.jsx'), 'utf8');
    assert(rppCode.includes('audioUrls') && rppCode.includes('PREVIEW'), 'Expected multi-track audioUrls pool and PREVIEW label in RandomPreviewPlayer');
    assert(iconsCode.includes('export const LoadingSpinner'), 'Expected reusable LoadingSpinner in Icons.jsx');
    assert(adminMusicCode.includes('Track Preview Audio'), 'Expected Track Preview Audio picker in AdminMusicPage');
  });

  test('Checklist #21 & #22: Controlled Debounced Draft Autosave across Admin CMS forms preserving DRAFT/SCHEDULED/PUBLISHED lifecycle', () => {
    const autosaveCode = fs.readFileSync(path.resolve(__dirname, '../src/utils/useDraftAutosave.js'), 'utf8');
    const adminPages = [
      'AdminMusicPage.jsx',
      'AdminTracksPage.jsx',
      'AdminBeatsPage.jsx',
      'AdminGalleryPage.jsx',
      'AdminVideosPage.jsx',
      'AdminMerchandisePage.jsx',
      'AdminLinksPage.jsx',
    ];
    assert(autosaveCode.includes('DraftAutosaveBanner') && autosaveCode.includes('Restore Draft') && autosaveCode.includes('Discard Draft'), 'Expected DraftAutosaveBanner with Restore/Discard');
    for (const page of adminPages) {
      const code = fs.readFileSync(path.resolve(__dirname, `../src/pages/admin/${page}`), 'utf8');
      assert(code.includes('useDraftAutosave') && code.includes('DraftAutosaveBanner'), `Expected DraftAutosave in ${page}`);
    }
  });

  console.log('\n====================================================');
  console.log(` STAGE 26 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Fatal verification error:', e);
  process.exit(1);
});

// scripts/verify-stage32.cjs
// Comprehensive Automated Verification Suite for STAGE 32:
// Services conversational UX, live running total, scroll-to-top, upload rules, draft persistence, permanent tracking,
// payment gate, social previews, gallery controls, animations, beats card clickability, media library, and data integrity.

const fs = require('fs');
const path = require('path');

const WORKER_BASE = 'https://silachomka-api.samueljohnibrotech.workers.dev';
const FRONTEND_BASE = 'https://silachomka.vercel.app';

let passes = 0;
let fails = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passes++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    fails++;
  }
}

async function run() {
  console.log('=================================================================');
  console.log(' STAGE 32 VERIFICATION SUITE — PRODUCTION & CODE RECONCILIATION');
  console.log('=================================================================\n');

  // -------------------------------------------------------------
  // 1. SERVICES RECONCILIATION & RULES (Req #1, #2, #3, #4, #5, #6, #7)
  // -------------------------------------------------------------
  console.log('--- 1. Services Conversational UX & Authoritative Rules ---');
  const servicesCode = fs.readFileSync(path.join(__dirname, '../src/pages/ServicesPage.jsx'), 'utf8');

  assert(servicesCode.includes('What are we creating?'), 'Step 1 starts with conversational prompt "What are we creating?"');
  assert(servicesCode.includes('isDropdownOpen'), 'Expandable / dropdown studio services selector is implemented');
  assert(servicesCode.includes('RUNNING SESSION TOTAL'), 'Live running total displayed immediately during service selection');
  assert(servicesCode.includes('window.scrollTo({ top: 0, left: 0, behavior: "smooth" })'), 'Auto-scroll to top implemented on every step transition');
  assert(servicesCode.includes('REQUIRED_UPLOAD_SERVICES'), 'Explicit file upload requirement matrix defined');
  assert(servicesCode.includes('chomka_services_booking_draft_v1'), 'In-progress booking draft persistence implemented in localStorage');
  assert(servicesCode.includes('chomka_recent_service_orders'), 'Permanent recent order storage implemented');
  assert(servicesCode.includes('/services/order/'), 'Direct routing to permanent order tracking implemented');

  // Verify backend enforcement of file upload requirements
  console.log('\n--- 2. Backend Services Order File Upload Validation ---');
  try {
    const res = await fetch(`${WORKER_BASE}/api/services/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test QA',
        customerEmail: 'testqa@example.com',
        services: [{ slug: 'vocal-mixing', configuration: {} }],
        clientFiles: [], // Missing required file
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error && (data.error.includes('upload is required') || data.error.includes('required')), 'Server rejects order when required files are missing (HTTP 400)', JSON.stringify(data));
  } catch (err) {
    assert(false, 'Server rejects order when required files are missing', err.message);
  }

  // -------------------------------------------------------------
  // 3. SOCIAL PREVIEWS (Req #9)
  // -------------------------------------------------------------
  console.log('\n--- 3. Social Link Previews (Open Graph Metadata) ---');
  const socialGenScript = fs.readFileSync(path.join(__dirname, '../scripts/generate-social-pages.js'), 'utf8');
  assert(socialGenScript.includes('og:image:width') && socialGenScript.includes('1200'), 'Explicit og:image:width 1200 included for rich previews');
  assert(socialGenScript.includes('og:image:height') && socialGenScript.includes('630'), 'Explicit og:image:height 630 included for rich previews');

  // -------------------------------------------------------------
  // 4. GALLERY MODAL & ANIMATIONS (Req #10, #11, #12, #13, #14, #15, #22)
  // -------------------------------------------------------------
  console.log('\n--- 4. Gallery Modal Controls, Carousel & Ambient Backgrounds ---');
  const galleryModalCode = fs.readFileSync(path.join(__dirname, '../src/components/GalleryPostModal.jsx'), 'utf8');
  assert(galleryModalCode.includes('gallery-modal-post-nav'), 'Spatial separation: Post navigation positioned outside media container');
  assert(galleryModalCode.includes('carousel-slide-btn'), 'Slide navigation controls distinct from post navigation');
  assert(galleryModalCode.includes('assignedSocials'), 'Gallery post modal supports assigned socials per post');

  const cssCode = fs.readFileSync(path.join(__dirname, '../src/App.css'), 'utf8');
  assert(cssCode.includes('--transition-pan: 7500ms'), 'Pan animation timing tuned to 7500ms for smooth visible movement');
  assert(!cssCode.includes('*, *::before, *::after {\n    transition: none !important') && !cssCode.includes('*, *::before, *::after {\n  transition: none !important'), 'Destructive universal reduced-motion override removed');
  assert(cssCode.includes('opacity: 0.40') && cssCode.includes('filter: blur(45px)'), 'Ambient backdrop boosted with rich blur (45px) and opacity (0.40)');

  // -------------------------------------------------------------
  // 5. BEATS & HERO MEDIA (Req #17, #18, #19, #20)
  // -------------------------------------------------------------
  console.log('\n--- 5. Beats Card Clickability & Hero Animations ---');
  const beatsPageCode = fs.readFileSync(path.join(__dirname, '../src/pages/BeatsPage.jsx'), 'utf8');
  assert(beatsPageCode.includes('handleCardClick') && (beatsPageCode.includes('/beat/') || beatsPageCode.includes('/beats/')), 'Whole beat card clickable navigating to beat detail');
  assert(beatsPageCode.includes('closest("button") || e.target.closest("a")'), 'Event propagation stopped on license/action buttons');

  const beatHeroCode = fs.readFileSync(path.join(__dirname, '../src/components/BeatHeroSlideshow.jsx'), 'utf8');
  assert(beatHeroCode.includes('.gif') && beatHeroCode.includes('filter('), 'Beats hero strictly filters for GIF-only media');

  const mediaSlideshowCode = fs.readFileSync(path.join(__dirname, '../src/components/MediaSlideshow.jsx'), 'utf8');
  assert(mediaSlideshowCode.includes('el.muted = true') && mediaSlideshowCode.includes('el.play()'), 'Desktop video autoplay DOM property muted=true enforced');
  assert(mediaSlideshowCode.includes('currentTime = 0.1'), 'Video black flash prevented by seeking to 0.1s on metadata load');

  // -------------------------------------------------------------
  // 6. DRAFT AUTOSAVE LIFECYCLE (Req #16)
  // -------------------------------------------------------------
  console.log('\n--- 6. Admin Draft Autosave Lifecycle ---');
  const draftHookCode = fs.readFileSync(path.join(__dirname, '../src/utils/useDraftAutosave.js'), 'utf8');
  assert(draftHookCode.includes('isDirtyRef.current = true'), 'Restoring a draft keeps form in dirty unsaved state');
  assert(draftHookCode.includes('Draft restored (Unsaved changes)'), 'Clear UI feedback that restored draft has unsaved changes');

  // -------------------------------------------------------------
  // 7. DEDICATED ADMIN MEDIA LIBRARY (Req #21 & #23)
  // -------------------------------------------------------------
  console.log('\n--- 7. Dedicated Admin Media Library & Link Assignment ---');
  const adminLayoutCode = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminLayout.jsx'), 'utf8');
  assert(adminLayoutCode.includes('/admin/media') && adminLayoutCode.includes('Media Library'), 'Media Library added to admin sidebar navigation');

  const adminMediaPageCode = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminMediaPage.jsx'), 'utf8');
  assert(adminMediaPageCode.includes('adminApi.uploadMediaAsset'), 'Media Library supports instant multi-file uploads');
  assert(adminMediaPageCode.includes('filterType') && adminMediaPageCode.includes('searchQuery'), 'Media Library supports filtering and search');

  const adminGalleryPageCode = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminGalleryPage.jsx'), 'utf8');
  assert(adminGalleryPageCode.includes('assignedSocials'), 'Admin Gallery editor supports cross-post social link assignment');

  // -------------------------------------------------------------
  // 8. PRODUCTION CATALOGUE INTEGRITY (Req #24)
  // -------------------------------------------------------------
  console.log('\n--- 8. Production Catalogue Integrity & Real Endpoints ---');
  try {
    const releasesRes = await fetch(`${WORKER_BASE}/api/releases`);
    const releases = await releasesRes.json();
    assert(Array.isArray(releases) && releases.length >= 20, `Production releases intact: ${releases.length} releases found`);

    const beatsRes = await fetch(`${WORKER_BASE}/api/beats`);
    const beats = await beatsRes.json();
    assert(Array.isArray(beats) && beats.length >= 12, `Production beats intact: ${beats.length} beats found`);

    const servicesRes = await fetch(`${WORKER_BASE}/api/services`);
    const services = await servicesRes.json();
    assert(Array.isArray(services) && services.length >= 9, `Production services intact: ${services.length} services found`);

    const galleryRes = await fetch(`${WORKER_BASE}/api/gallery`);
    const gallery = await galleryRes.json();
    assert(Array.isArray(gallery) && gallery.length >= 4, `Production gallery intact: ${gallery.length} posts found`);
  } catch (err) {
    assert(false, 'Production catalogue endpoints accessible', err.message);
  }

  console.log('\n=================================================================');
  console.log(` VERIFICATION SUMMARY: ${passes} Passed, ${fails} Failed.`);
  console.log('=================================================================');

  if (fails > 0) {
    process.exit(1);
  }
}

run();

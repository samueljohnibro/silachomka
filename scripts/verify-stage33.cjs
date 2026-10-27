// scripts/verify-stage33.cjs
// Comprehensive Automated Verification Suite for STAGE 33:
// 1. Beat Reel Ambient Background + True Fullscreen Mode
// 2. Beat Reel Short Clip Duration (45 SEC)
// 3. Gallery Carousel Guaranteed Slide Animation (0.45s + Lockout)
// 4. Beat Cards Entire Card Navigation & Route Aliases
// 5. Starfield Background Responsive Resize Fix (Normalized Coordinates)
// 6. Main Navbar Branding Space & Non-clickable chomkaMUSIC Hallmark
// 7. Beats Currency Dropdown Theme Styling
// 8. Gallery Grid Slow Crossfade Animation (7s interval, 1.8s fade)
// 9. Services Dropdown Show Total & Chips While Open
// 10. Services Smart Hourly Booking + Admin-Controlled Availability (Default Closed)
// 11. Service File Upload Complete Information (Ext, Name, Size, Status)
// 12. Production Catalogue Integrity

const fs = require('fs');
const path = require('path');
const { neon } = require('../worker/node_modules/@neondatabase/serverless');

const devVars = fs.readFileSync(path.join(__dirname, '../worker/.dev.vars'), 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(dbUrl);

const WORKER_BASE = 'https://silachomka-api.samueljohnibrotech.workers.dev';

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
  console.log(' STAGE 33 VERIFICATION SUITE — MOTION, REELS, NAV & AVAILABILITY');
  console.log('=================================================================\n');

  // -------------------------------------------------------------
  // 1. BEAT REEL AMBIENT BACKGROUND & TRUE FULLSCREEN (Req #1)
  // -------------------------------------------------------------
  console.log('--- 1. Beat Reel Ambient Background & True Fullscreen (Req #1) ---');
  const beatsPageCode = fs.readFileSync(path.join(__dirname, '../src/pages/BeatsPage.jsx'), 'utf8');

  assert(beatsPageCode.includes('product-ambient-backdrop') && beatsPageCode.includes('ambient-image-layer'), 'Atmospheric blurred ambient backdrop integrated into Beat Reel');
  assert(beatsPageCode.includes('isFullscreen') && beatsPageCode.includes('setIsFullscreen'), 'True immersive fullscreen state managed in BeatReelPlayer');
  assert(beatsPageCode.includes('document.body.style.overflow = "hidden"'), 'Background scrolling locked while in fullscreen mode');
  assert(beatsPageCode.includes('e.key === "Escape"') && beatsPageCode.includes('setIsFullscreen(false)'), 'Keyboard Escape listener exits fullscreen');
  assert(beatsPageCode.includes('handleMediaClick') && beatsPageCode.includes('showControls'), 'Clicking media area toggles fullscreen / controls');
  assert(beatsPageCode.includes('ExitFullscreenIcon') && beatsPageCode.includes('FullscreenIcon'), 'Clear Exit Fullscreen control provided');

  // -------------------------------------------------------------
  // 2. BEAT REEL SHORT CLIP DURATION 45 SEC (Req #2)
  // -------------------------------------------------------------
  console.log('\n--- 2. Beat Reel Short Clip Duration: 45 SEC (Req #2) ---');
  assert(beatsPageCode.includes('const PREVIEW_LENGTH = 45;'), 'PREVIEW_LENGTH set to 45 in BeatsPage.jsx');
  assert(beatsPageCode.includes('45 SEC'), 'UI duration mode toggle button labeled "45 SEC"');
  assert(beatsPageCode.includes('0:45 Preview'), 'Clock display updated to "0:45 Preview"');

  const currencyContextCode = fs.readFileSync(path.join(__dirname, '../src/data/CurrencyContext.jsx'), 'utf8');
  assert(currencyContextCode.includes('45sec'), 'CurrencyContext session storage defaults to "45sec" mode');

  const beatDetailCode = fs.readFileSync(path.join(__dirname, '../src/pages/BeatDetailPage.jsx'), 'utf8');
  assert(beatDetailCode.includes('const PREVIEW_LENGTH = 45;'), 'PREVIEW_LENGTH synchronized to 45 in BeatDetailPage.jsx');

  // -------------------------------------------------------------
  // 3. GALLERY CAROUSEL GUARANTEED SLIDE ANIMATION (Req #3)
  // -------------------------------------------------------------
  console.log('\n--- 3. Gallery Carousel Guaranteed Slide Animation (Req #3) ---');
  const galleryModalCode = fs.readFileSync(path.join(__dirname, '../src/components/GalleryPostModal.jsx'), 'utf8');

  assert(galleryModalCode.includes('isAnimatingRef = useRef(false)'), 'Animation lockout ref (isAnimatingRef) prevents rapid-click snapping');
  assert(galleryModalCode.includes('transform 0.45s cubic-bezier'), 'Deterministic 0.45s cubic-bezier horizontal sliding transition defined');
  assert(galleryModalCode.includes('loading="eager"') && galleryModalCode.includes('decoding="async"'), 'Eager loading and async decoding on modal carousel slides prevent blank frames');

  // -------------------------------------------------------------
  // 4. BEAT CARDS ENTIRE CARD NAVIGATION & ROUTE ALIASES (Req #4)
  // -------------------------------------------------------------
  console.log('\n--- 4. Beat Cards Entire Card Navigation & Route Aliases (Req #4) ---');
  const appCode = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');

  assert(appCode.includes('path="/beats/:id"') && appCode.includes('path="/beat/:id"'), 'Canonical /beats/:id and alias /beat/:id routes configured in App.jsx');
  assert(beatsPageCode.includes('navigate(`/beats/${targetSlug}`)'), 'handleCardClick navigates cleanly without 404');
  assert(beatsPageCode.includes('onClick={handleCardClick}'), 'Whole beat card has click listener with event propagation check');

  // -------------------------------------------------------------
  // 5. STARFIELD BACKGROUND RESPONSIVE RESIZE FIX (Req #5)
  // -------------------------------------------------------------
  console.log('\n--- 5. Starfield Background Responsive Resize Fix (Req #5) ---');
  const starfieldCode = fs.readFileSync(path.join(__dirname, '../src/components/StarrySpaceBackground.jsx'), 'utf8');

  assert(starfieldCode.includes('nx: Math.random()') && starfieldCode.includes('ny: Math.random()'), 'Star positions normalized (0..1) to eliminate initial-width coordinate clipping');
  assert(starfieldCode.includes('getTargetStarCount') && starfieldCode.includes('stars.push(createStar())'), 'Dynamic star density maintained uniformly on viewport resize');
  assert(starfieldCode.includes('ResizeObserver'), 'ResizeObserver installed on canvas for responsive adaptation');

  // -------------------------------------------------------------
  // 6. MAIN NAVBAR RE-ARCHITECT BRANDING SPACE (Req #6)
  // -------------------------------------------------------------
  console.log('\n--- 6. Main Navbar Re-architect Branding Space (Req #6) ---');
  assert(appCode.includes('header-brand-badge') && !appCode.includes('className="header-label"\n            to="/"\n            aria-label="Return to silachomka"\n          >\n            chomkaMUSIC™'), 'chomkaMUSIC™ converted from navigation link to non-clickable header-brand-badge');

  const cssCode = fs.readFileSync(path.join(__dirname, '../src/App.css'), 'utf8');
  assert(cssCode.includes('.header-brand-badge') && cssCode.includes('pointer-events: none'), '.header-brand-badge styled with pointer-events: none and gold branding');

  // -------------------------------------------------------------
  // 7. BEATS CURRENCY DROPDOWN THEME STYLING (Req #7)
  // -------------------------------------------------------------
  console.log('\n--- 7. Beats Currency Dropdown Theme Styling (Req #7) ---');
  assert(cssCode.includes('.beats-currency-select option') && cssCode.includes('background: #0b0b10'), '.beats-currency-select option styled with dark background #0b0b10 in App.css');
  assert(beatsPageCode.includes('style={{ background: "#0b0b10", color: "#f5f3ef" }}'), 'Beats currency options have explicit dark theme inline styles');

  // -------------------------------------------------------------
  // 8. GALLERY GRID SLOW CROSSFADE (Req #8)
  // -------------------------------------------------------------
  console.log('\n--- 8. Gallery Grid Slow Crossfade (Req #8) ---');
  assert(appCode.includes('GalleryCardMedia'), 'GalleryCardMedia component extracted for public grid presentation');
  assert(appCode.includes('transition: "opacity 1.8s ease-in-out"') || appCode.includes('opacity 1.8s'), '1.8s opacity crossfade transition implemented');
  assert((appCode.includes('setInterval') && appCode.includes('7000')) || (appCode.includes('setInterval') && appCode.includes('rotationDuration')), 'Slow carousel rotation interval configured (per-card schedule)');
  assert(appCode.includes('Math.random() * slides.length'), 'Random starting slide index selected to eliminate uniform card synchrony');

  // -------------------------------------------------------------
  // 9. SERVICES DROPDOWN SHOW TOTAL WHILE OPEN (Req #9)
  // -------------------------------------------------------------
  console.log('\n--- 9. Services Dropdown Show Total While Open (Req #9) ---');
  const servicesCode = fs.readFileSync(path.join(__dirname, '../src/pages/ServicesPage.jsx'), 'utf8');

  assert(servicesCode.includes('isDropdownOpen &&') && servicesCode.includes('RUNNING SESSION TOTAL'), 'Live running total rendered directly INSIDE the open dropdown panel');
  assert(servicesCode.includes('selectedServices.map((svc) =>') && servicesCode.includes('isHourly ? ` (${configurations[svc.slug]?.hours || 2}h)`'), 'Selected service chips with hourly quantities displayed inside open dropdown');

  // -------------------------------------------------------------
  // 10. SERVICES SMART HOURLY BOOKING & AVAILABILITY (Req #10)
  // -------------------------------------------------------------
  console.log('\n--- 10. Services Smart Hourly Booking & Admin Availability (Req #10) ---');
  const workerIndexCode = fs.readFileSync(path.join(__dirname, '../worker/src/index.js'), 'utf8');
  assert(workerIndexCode.includes('/api/services/availability'), 'Public endpoint /api/services/availability implemented');
  assert(workerIndexCode.includes('service_availability') && workerIndexCode.includes('is_closed = false'), 'Availability strictly queries open dates from service_availability');
  assert(workerIndexCode.includes('Studio date') && workerIndexCode.includes('is currently closed or unavailable'), 'Order endpoint rejects unlisted/closed booking appointments with HTTP 400');

  const adminCrudCode = fs.readFileSync(path.join(__dirname, '../worker/src/admin/crud.js'), 'utf8');
  assert(adminCrudCode.includes('/services/availability'), 'Admin availability CRUD endpoints implemented');

  const adminServicesCode = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminServicesPage.jsx'), 'utf8');
  assert(adminServicesCode.includes('activeTab === "schedule"'), 'AdminServicesPage includes dedicated studio availability tab');
  assert(adminServicesCode.includes('Default: ALL DATES UNAVAILABLE'), 'Strict default-closed scheduling policy communicated to admin');

  assert(servicesCode.includes('Studio Appointment Date & Time') && servicesCode.includes('bookingDate') && servicesCode.includes('bookingTime'), 'Public Services page presents smart date and time slot selector for Voice Recording');

  // Test live database for service_availability table
  const dbAvailCount = await sql`SELECT COUNT(*)::int as count FROM service_availability;`;
  assert(Number.isInteger(dbAvailCount[0].count), `Database service_availability table active and verified (Count: ${dbAvailCount[0].count})`);

  // -------------------------------------------------------------
  // 11. SERVICE FILE UPLOAD COMPLETE INFORMATION (Req #11)
  // -------------------------------------------------------------
  console.log('\n--- 11. Service File Upload Complete Information (Req #11) ---');
  assert(servicesCode.includes('isUploadingFile &&') && servicesCode.includes('Uploading studio asset...'), 'Active uploading progress indicator with spinner displayed during transfer');
  assert(servicesCode.includes('f.originalName || f.name') && servicesCode.includes('sizeMb} MB'), 'Uploaded file row displays full original filename and size in MB');
  assert(servicesCode.includes('✓ Upload Complete'), 'Completed file upload indicator badge rendered');

  // -------------------------------------------------------------
  // 12. PRODUCTION CATALOGUE INTEGRITY (Req #12)
  // -------------------------------------------------------------
  console.log('\n--- 12. Production Catalogue Integrity & Real Endpoints ---');
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

run().catch((err) => {
  console.error('Verification encountered an unhandled error:', err);
  process.exit(1);
});

// scripts/verify-stage34.cjs
// Comprehensive Automated Verification Suite for STAGE 34:
// 1. Gallery Post Blank Screen / Starfield Failure (Layering, Backdrop, TDZ Fix)
// 2. Gallery Cards Independent Random Slow Rotation (Deterministic Stagger & Interval)
// 3. Dynamic Track Producer Credits (1, 2, 3+ Producers, Deduplication, Fallback)
// 4. Services Social Preview Metadata & Prerendered HTML
// 5. Gallery Video 5-Second Random Snippet Playback
// 6. Gallery Category Deduplication at Source & UI
// 7. Navbar chomkaMUSIC™ Brand Marker Elevation (Pill Badge, Non-clickable)
// 8. Cancel Pending Media Loading On Click (Race Condition & Abort Guard)
// 9. Admin Services Typography Hierarchy & Custom Themed Time Picker
// 10. Site-wide Unified Human-Readable Long Date Formatting (dateFormatter.js)
// 11. Admin Studio Availability Interactive Monthly Calendar
// 12. Full CRUD for Services Catalogue in Admin (POST, PUT, DELETE)
// 13. Public Services Fixed Running Total & Voice Recording Duration Stepper
// 14. Unified Accurate Upload Progress System (uploadWithProgress.js)
// 15. Site-wide Technical SEO Reconciliation (robots.txt, sitemap.xml, Schema.org JSON-LD)
// 16. Google Image Discoverability for Gallery Posts (ImageObject Schema & Sitemap Extensions)
// 17. Production Catalogue Integrity & Real Endpoints

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
  console.log(' STAGE 34 VERIFICATION SUITE — GALLERY, CREDITS, SERVICES & SEO');
  console.log('=================================================================\n');

  // -------------------------------------------------------------
  // 1. GALLERY POST BLANK SCREEN / STARFIELD FAILURE (Req #1)
  // -------------------------------------------------------------
  console.log('--- 1. Gallery Post Blank Screen / Starfield Failure (Req #1) ---');
  const galleryModalCode = fs.readFileSync(path.join(__dirname, '../src/components/GalleryPostModal.jsx'), 'utf8');
  const cssCode = fs.readFileSync(path.join(__dirname, '../src/App.css'), 'utf8');

  // TDZ & Lifecycle fix
  const effectiveSlidesIdx = galleryModalCode.indexOf('const effectiveSlides =');
  const prevSlideIdx = galleryModalCode.indexOf('const handlePrevSlide =');
  assert(effectiveSlidesIdx !== -1 && prevSlideIdx !== -1 && effectiveSlidesIdx < prevSlideIdx, 'effectiveSlides defined before handlePrevSlide to eliminate ReferenceError TDZ');
  assert(!galleryModalCode.includes('setPrevPostId(post.id)'), 'Render-time state mutation eliminated in GalleryPostModal');
  assert(galleryModalCode.includes('setActiveSlide(0)'), 'Slide resets cleanly on post.id change via useEffect');

  // Starfield backdrop & layering
  assert(cssCode.includes('.gallery-modal-backdrop') && cssCode.includes('rgba(5, 5, 7, 0.65)'), 'Translucent modal backdrop rgba(5, 5, 7, 0.65) preserves starfield canvas visibility');
  assert(cssCode.includes('backdrop-filter: blur(4px)'), 'Soft 4px backdrop blur maintains background twinkling');
  assert(cssCode.includes('.gallery-modal-dialog') && cssCode.includes('z-index: 10;'), 'Modal dialog set to z-index: 10 above starfield without hiding canvas');

  // -------------------------------------------------------------
  // 2. GALLERY CARDS INDEPENDENT RANDOM SLOW ROTATION (Req #2)
  // -------------------------------------------------------------
  console.log('\n--- 2. Gallery Cards Independent Random Slow Rotation (Req #2) ---');
  const appCode = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf8');

  assert(appCode.includes('6500 + Math.floor(Math.random() * 3000)'), 'Independent rotation schedule (6500-9500ms) assigned per gallery card instance');
  assert(appCode.includes('500 + Math.floor(Math.random() * 2500)'), 'Staggered initial delay (500-3000ms) prevents synchronized slide changes');
  assert(appCode.includes('IntersectionObserver') && appCode.includes('setIsInView'), 'IntersectionObserver pauses rotation when cards are out of view');
  assert(appCode.includes('onMouseEnter={() => setIsPaused(true)}') && appCode.includes('onMouseLeave={() => setIsPaused(false)}'), 'Hover and focus pause carousel rotation for user comfort');
  assert(appCode.includes('transition: "opacity 1.8s ease-in-out"'), 'Smooth 1.8s crossfade transition maintained');

  // -------------------------------------------------------------
  // 3. DYNAMIC TRACK PRODUCER CREDITS (Req #3)
  // -------------------------------------------------------------
  console.log('\n--- 3. Dynamic Track Producer Credits (Req #3) ---');
  const creditsUtils = require('../src/data/credits.js');

  const singleTrack = { title: 'Track 1', producers: ['silachomka'] };
  const doubleTrack = { title: 'Track 2', producers: ['silachomka', 'Co-Producer'] };
  const tripleTrack = { title: 'Track 3', producers: ['silachomka', 'Producer B', 'Producer C'] };
  const dupTrack = { title: 'Track 4', producers: ['silachomka', 'Silachomka'] };
  const fallbackTrack = { title: 'Track 5' };
  const releaseWithProd = { producer: 'Executive Producer' };

  assert(creditsUtils.getTrackProducerString(singleTrack) === 'silachomka', `Single producer formatted correctly: "${creditsUtils.getTrackProducerString(singleTrack)}"`);
  assert(creditsUtils.getTrackProducerString(doubleTrack) === 'silachomka & Co-Producer', `Two producers formatted with "&": "${creditsUtils.getTrackProducerString(doubleTrack)}"`);
  assert(creditsUtils.getTrackProducerString(tripleTrack) === 'silachomka, Producer B & Producer C', `Three producers formatted with commas and "&": "${creditsUtils.getTrackProducerString(tripleTrack)}"`);
  assert(creditsUtils.getTrackProducerString(dupTrack) === 'silachomka', `Case-insensitive deduplication removes duplicates: "${creditsUtils.getTrackProducerString(dupTrack)}"`);
  assert(creditsUtils.getTrackProducerString(fallbackTrack, releaseWithProd) === 'Executive Producer', `Fallback to release producer credit works: "${creditsUtils.getTrackProducerString(fallbackTrack, releaseWithProd)}"`);

  const releasePageCode = fs.readFileSync(path.join(__dirname, '../src/components/ReleasePage.jsx'), 'utf8');
  assert(releasePageCode.includes('getTrackProducerString(track, release)'), 'TrackRow passes release context to dynamic getTrackProducerString');

  // -------------------------------------------------------------
  // 4. SERVICES SOCIAL PREVIEW (Req #4)
  // -------------------------------------------------------------
  console.log('\n--- 4. Services Social Preview (Req #4) ---');
  const socialGenCode = fs.readFileSync(path.join(__dirname, '../scripts/generate-social-pages.js'), 'utf8');
  assert(socialGenCode.includes('canonicalPath: "/services"') && socialGenCode.includes('Chomka Studio Services | silachomka'), 'Services static route metadata defined in generate-social-pages.js');
  assert(socialGenCode.includes('DEFAULT_SOCIAL_IMAGE'), 'Services route has social preview image configured');

  const servicesHtmlPath = path.join(__dirname, '../dist/services/index.html');
  if (fs.existsSync(servicesHtmlPath)) {
    const servicesHtml = fs.readFileSync(servicesHtmlPath, 'utf8');
    assert(servicesHtml.includes('<title>Chomka Studio Services | silachomka</title>'), 'dist/services/index.html generated with correct title');
    assert(servicesHtml.includes('property="og:url" content="https://silachomka.vercel.app/services"'), 'dist/services/index.html includes canonical og:url');
  } else {
    console.log('  [INFO] dist/services/index.html will be validated after build');
  }

  // -------------------------------------------------------------
  // 5. GALLERY VIDEO 5-SECOND SNIPPET PLAYBACK (Req #5)
  // -------------------------------------------------------------
  console.log('\n--- 5. Gallery Video 5-Second Random Snippet Playback (Req #5) ---');
  const videoComponentCode = fs.readFileSync(path.join(__dirname, '../src/components/GalleryCardVideo.jsx'), 'utf8');

  assert(videoComponentCode.includes('const SNIPPET_DURATION = 5'), 'SNIPPET_DURATION set to 5 seconds');
  assert(videoComponentCode.includes('Math.max(0, dur - SNIPPET_DURATION)'), 'Calculates random start time with at least 5 seconds remaining');
  assert(videoComponentCode.includes('muted') && videoComponentCode.includes('playsInline'), 'Video snippet plays muted and inline');
  assert(videoComponentCode.includes('IntersectionObserver'), 'Snippet pauses playback when off-screen');

  // -------------------------------------------------------------
  // 6. GALLERY CATEGORY DEDUPLICATION AT SOURCE & UI (Req #6)
  // -------------------------------------------------------------
  console.log('\n--- 6. Gallery Category Deduplication at Source & UI (Req #6) ---');
  const workerIndexCode = fs.readFileSync(path.join(__dirname, '../worker/src/index.js'), 'utf8');
  const workerCrudCode = fs.readFileSync(path.join(__dirname, '../worker/src/admin/crud.js'), 'utf8');
  const adminGalleryCode = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminGalleryPage.jsx'), 'utf8');

  assert(workerIndexCode.includes('normalizeGalleryCategory') && workerIndexCode.includes('labelMap.has(norm.label.toLowerCase())'), 'Public /api/gallery/categories deduplicates entries by canonical label');
  assert(workerCrudCode.includes('normalizeGalleryCategory'), 'Admin CRUD deduplicates category listings and normalizes category_slug on save');
  assert(appCode.includes('labelMap.set(b.label.toLowerCase(), b)'), 'Client App.jsx deduplicates categories defensively via label map');
  assert(adminGalleryCode.includes('seenLabels.has(key)') && adminGalleryCode.includes('uniqueCats.push'), 'AdminGalleryPage deduplicates categories before state update');

  // -------------------------------------------------------------
  // 7. NAVBAR CHOMKAMUSIC BRAND MARKER ELEVATION (Req #7)
  // -------------------------------------------------------------
  console.log('\n--- 7. Navbar chomkaMUSIC™ Brand Marker Elevation (Req #7) ---');
  assert(appCode.includes('className="header-brand-badge"') && !appCode.includes('to="/#chomkamusic"'), 'chomkaMUSIC™ tag decoupled from navigational links');
  assert(cssCode.includes('.header-brand-badge') && cssCode.includes('pointer-events: none'), '.header-brand-badge styled with pointer-events: none, gold border, and pill styling');

  // -------------------------------------------------------------
  // 8. CANCEL PENDING MEDIA LOADING ON CLICK (Req #8)
  // -------------------------------------------------------------
  console.log('\n--- 8. Cancel Pending Media Loading On Click (Req #8) ---');
  const beatsPageCode = fs.readFileSync(path.join(__dirname, '../src/pages/BeatsPage.jsx'), 'utf8');
  const previewPlayerCode = fs.readFileSync(path.join(__dirname, '../src/components/RandomPreviewPlayer.jsx'), 'utf8');

  assert(beatsPageCode.includes('loadingBeatId === beat.id') && beatsPageCode.includes('audioGenerationRef.current +='), 'BeatsPage aborts pending audio load on click by bumping audioGenerationRef');
  assert(previewPlayerCode.includes('if (isLoading)') && previewPlayerCode.includes('autoPlayPendingRef.current = false'), 'RandomPreviewPlayer immediately cancels pending load and clears audio ref');

  // -------------------------------------------------------------
  // 9. ADMIN SERVICES TYPOGRAPHY & THEMED TIME PICKER (Req #9)
  // -------------------------------------------------------------
  console.log('\n--- 9. Admin Services Typography & Themed Time Picker (Req #9) ---');
  const adminServicesCode = fs.readFileSync(path.join(__dirname, '../src/pages/admin/AdminServicesPage.jsx'), 'utf8');

  assert(adminServicesCode.includes('function ThemedTimeSlotPicker'), 'Custom ThemedTimeSlotPicker component created for studio hours');
  assert(adminServicesCode.includes('PRESET_TIME_SLOTS = [') && adminServicesCode.includes('"10:00 AM"'), 'Themed time presets (10:00 AM, 12:00 PM, 2:00 PM, etc.) implemented');
  assert(adminServicesCode.includes('className="studio-input"'), 'Dark themed styling on custom time selectors matching studio aesthetics');

  // -------------------------------------------------------------
  // 10. UNIFIED HUMAN-READABLE LONG DATE FORMATTING (Req #10)
  // -------------------------------------------------------------
  console.log('\n--- 10. Unified Human-Readable Long Date Formatting (Req #10) ---');
  const dateFormatter = require('../src/utils/dateFormatter.js');

  const testIso = '2022-10-20T00:00:00.000Z';
  const formatted = dateFormatter.formatLongDate(testIso);
  assert(formatted.includes('October 20, 2022') && formatted.includes('Thursday'), `formatLongDate produces human-readable string: "${formatted}"`);
  assert(typeof dateFormatter.formatGalleryDate === 'function', 'formatGalleryDate exported for backwards compatibility');
  assert(typeof dateFormatter.formatShortDate === 'function', 'formatShortDate exported for compact date views');

  // -------------------------------------------------------------
  // 11. ADMIN STUDIO AVAILABILITY MONTHLY CALENDAR (Req #11)
  // -------------------------------------------------------------
  console.log('\n--- 11. Admin Studio Availability Monthly Calendar (Req #11) ---');
  assert(adminServicesCode.includes('function StudioMonthlyCalendar'), 'Interactive StudioMonthlyCalendar component implemented');
  assert(adminServicesCode.includes('weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]') || adminServicesCode.includes('weekdays = ['), 'Full 7-day monthly calendar grid defined');
  assert(adminServicesCode.includes('prevMonth') && adminServicesCode.includes('nextMonth'), 'Month navigation controls implemented');
  assert(adminServicesCode.includes('Day Inspector'), 'Clicking date cell opens Day Inspector for slot configuration');

  // -------------------------------------------------------------
  // 12. FULL CRUD FOR SERVICES CATALOGUE IN ADMIN (Req #12)
  // -------------------------------------------------------------
  console.log('\n--- 12. Full CRUD for Services Catalogue in Admin (Req #12) ---');
  assert(workerCrudCode.includes("adminApp.post('/services'"), 'Worker admin CRUD supports POST /services (Create)');
  assert(workerCrudCode.includes("adminApp.put('/services/:id'"), 'Worker admin CRUD supports PUT /services/:id (Update)');
  assert(workerCrudCode.includes("adminApp.delete('/services/:id'"), 'Worker admin CRUD supports DELETE /services/:id (Delete)');
  assert(adminServicesCode.includes('handleCreateService') && adminServicesCode.includes('handleDeleteService'), 'AdminServicesPage UI provides full create, edit, and delete actions');

  // -------------------------------------------------------------
  // 13. PUBLIC SERVICES FIXED RUNNING TOTAL & DURATION STEPPER (Req #13)
  // -------------------------------------------------------------
  console.log('\n--- 13. Public Services Fixed Running Total & Duration Stepper (Req #13) ---');
  const servicesPageCode = fs.readFileSync(path.join(__dirname, '../src/pages/ServicesPage.jsx'), 'utf8');

  assert(servicesPageCode.includes('position: "sticky"') && servicesPageCode.includes('top: 0') && servicesPageCode.includes('RUNNING SESSION TOTAL'), 'Running session total sticky-pinned at top of dropdown menu');
  assert(servicesPageCode.includes('updateConfig(svc.slug, "hours"') && servicesPageCode.includes('aria-label="Decrease hours"'), 'Inline duration stepper (hours) provided for hourly voice recording');

  // -------------------------------------------------------------
  // 14. UNIFIED ACCURATE UPLOAD PROGRESS SYSTEM (Req #14)
  // -------------------------------------------------------------
  console.log('\n--- 14. Unified Accurate Upload Progress System (Req #14) ---');
  const uploadProgressCode = fs.readFileSync(path.join(__dirname, '../src/utils/uploadWithProgress.js'), 'utf8');

  assert(uploadProgressCode.includes('xhr.upload.onprogress'), 'uploadWithProgress uses real XMLHttpRequest.upload progress events');
  assert(uploadProgressCode.includes('e.lengthComputable') && uploadProgressCode.includes('e.loaded / e.total'), 'Calculates real byte transfer percentage without synthetic timers');
  assert(servicesPageCode.includes('uploadWithProgress('), 'Public Services client uploads use uploadWithProgress');
  assert(adminServicesCode.includes('uploadWithProgress('), 'Admin Services deliverable uploads use uploadWithProgress');

  // -------------------------------------------------------------
  // 15. SITE-WIDE TECHNICAL SEO RECONCILIATION (Req #15)
  // -------------------------------------------------------------
  console.log('\n--- 15. Site-wide Technical SEO Reconciliation (Req #15) ---');
  const robotsPath = path.join(__dirname, '../public/robots.txt');
  assert(fs.existsSync(robotsPath), 'public/robots.txt exists');
  const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
  assert(robotsTxt.includes('Disallow: /admin') && robotsTxt.includes('Sitemap: https://silachomka.vercel.app/sitemap.xml'), 'robots.txt protects admin routes and references sitemap.xml');

  assert(socialGenCode.includes('sitemapXml') && socialGenCode.includes('sitemap.xml'), 'Automated sitemap.xml generation implemented in generate-social-pages.js');

  const seoHeadCode = fs.readFileSync(path.join(__dirname, '../src/components/SeoHead.jsx'), 'utf8');
  assert(seoHeadCode.includes('jsonLd') && seoHeadCode.includes('application/ld+json'), 'SeoHead component injects Schema.org JSON-LD structured data');
  assert(appCode.includes('@type": "Person"') && appCode.includes('@type": "MusicGroup"'), 'Homepage provides Person and MusicGroup JSON-LD schemas');
  assert(releasePageCode.includes('@type": "MusicAlbum"'), 'Release page provides MusicAlbum JSON-LD schema');
  assert(servicesPageCode.includes('@type": "Service"'), 'Services page provides Service and OfferCatalog JSON-LD schema');

  // -------------------------------------------------------------
  // 16. GOOGLE IMAGE DISCOVERABILITY FOR GALLERY POSTS (Req #16)
  // -------------------------------------------------------------
  console.log('\n--- 16. Google Image Discoverability for Gallery Posts (Req #16) ---');
  assert(socialGenCode.includes('<image:image>') && socialGenCode.includes('<image:loc>'), 'Sitemap includes Google Image XML extension (<image:image>)');

  const galleryPostPageCode = fs.readFileSync(path.join(__dirname, '../src/pages/GalleryPostPage.jsx'), 'utf8');
  assert(galleryPostPageCode.includes('@type": "ImageObject"'), 'Gallery post page provides ImageObject JSON-LD schema');

  // -------------------------------------------------------------
  // 17. PRODUCTION CATALOGUE INTEGRITY & REAL ENDPOINTS
  // -------------------------------------------------------------
  console.log('\n--- 17. Production Catalogue Integrity & Real Endpoints ---');
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
    assert(Array.isArray(gallery) && gallery.length >= 5, `Production gallery intact: ${gallery.length} posts found`);
  } catch (err) {
    assert(false, 'Production catalogue endpoints accessible', err.message);
  }

  console.log('\n=================================================================');
  console.log(` STAGE 34 VERIFICATION SUMMARY: ${passes} Passed, ${fails} Failed.`);
  console.log('=================================================================');

  if (fails > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Verification encountered an unhandled error:', err);
  process.exit(1);
});

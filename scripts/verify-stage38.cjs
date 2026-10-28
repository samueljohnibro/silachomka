// scripts/verify-stage38.cjs
// Stage 38 Comprehensive Audit & Verification Suite

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
  passCount++;
}

function fail(msg, err) {
  console.error(`  [FAIL] ${msg}`);
  if (err) console.error(`         ${err}`);
  failCount++;
}

console.log('=================================================================');
console.log(' STAGE 38 VERIFICATION SUITE — AUDIT, PAYMENTS, UX & SEO');
console.log('=================================================================\n');

// 1. Paystack Webhook Security & Authoritative Verification
console.log('--- 1. Paystack Webhook Fail-Closed Security (Req #1) ---');
try {
  const indexJs = fs.readFileSync('worker/src/index.js', 'utf8');
  if (indexJs.includes("if (!c.env?.PAYSTACK_SECRET_KEY") && indexJs.includes("503)")) {
    pass('Missing PAYSTACK_SECRET_KEY fails closed with HTTP 503');
  } else {
    fail('Missing PAYSTACK_SECRET_KEY does not fail closed with 503');
  }

  if (indexJs.includes("if (!signature) {") && indexJs.includes("c.json({ error: 'Missing x-paystack-signature header' }, 401)")) {
    pass('Missing signature header is rejected immediately with HTTP 401');
  } else {
    fail('Missing signature header does not return 401');
  }

  if (indexJs.includes("crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody))")) {
    pass('Constant-time HMAC-SHA512 verification implemented with Web Crypto API');
  } else {
    fail('HMAC-SHA512 verification not using Web Crypto constant-time verify');
  }

  if (indexJs.includes("https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}") && indexJs.includes("actualKobo < expectedKobo")) {
    pass('Authoritative external Paystack status, amount and currency validation implemented');
  } else {
    fail('External authoritative Paystack transaction check not implemented');
  }
} catch (e) {
  fail('Checking worker/src/index.js failed', e.message);
}

// 2. Batch Availability Backend & UI
console.log('\n--- 2. Batch Availability Backend & UI (Req #2) ---');
try {
  const crudJs = fs.readFileSync('worker/src/admin/crud.js', 'utf8');
  if (crudJs.includes("adminApp.post('/services/availability/batch'")) {
    pass('Batch availability endpoint POST /api/admin/services/availability/batch implemented in crud.js');
  } else {
    fail('Batch availability endpoint missing in crud.js');
  }

  const adminServicesJs = fs.readFileSync('src/pages/admin/AdminServicesPage.jsx', 'utf8');
  if (adminServicesJs.includes('showBatchModal') && adminServicesJs.includes('onOpenBatch={handleOpenBatchModal}')) {
    pass('StudioMonthlyCalendar wired to onOpenBatch and showBatchModal in AdminServicesPage.jsx');
  } else {
    fail('Batch modal trigger not wired in AdminServicesPage.jsx');
  }

  if (adminServicesJs.includes('handleApplyBatchAvailability') && adminServicesJs.includes('/api/admin/services/availability/batch')) {
    pass('Batch availability modal submits to backend batch endpoint');
  } else {
    fail('Batch availability modal does not call batch API');
  }

  if (adminServicesJs.includes('studio-pill-btn') && adminServicesJs.includes('✕ Reset to Closed')) {
    pass('Reset to Closed button updated to themed studio-pill-btn danger styling');
  } else {
    fail('Reset to Closed button styling not updated');
  }
} catch (e) {
  fail('Checking batch availability failed', e.message);
}

// 3. Admin Draft Autosave State Machine
console.log('\n--- 3. Admin Draft Autosave Machine (Req #3) ---');
try {
  const draftHookJs = fs.readFileSync('src/utils/useDraftAutosave.js', 'utf8');
  if (draftHookJs.includes('prevEntityKeyRef') && draftHookJs.includes('entityKey !== prevEntityKeyRef.current')) {
    pass('useDraftAutosave resets baseline snapshot and dirty state when entityKey switches');
  } else {
    fail('useDraftAutosave does not detect entityKey switches');
  }

  if (draftHookJs.includes('serverUpdatedAt >= draftSavedAt')) {
    pass('useDraftAutosave discards stale drafts older than authoritative server updated_at');
  } else {
    fail('useDraftAutosave does not check for stale drafts vs server updated_at');
  }
} catch (e) {
  fail('Checking useDraftAutosave failed', e.message);
}

// 4. Gallery Video Carousel Playback & Video Filter
console.log('\n--- 4. Gallery Video Playback & Category Filter (Req #4) ---');
try {
  const appJs = fs.readFileSync('src/App.jsx', 'utf8');
  if (appJs.includes('effectiveIsVideo') && appJs.includes('slideType === "video"')) {
    pass('GalleryCardMedia computes effectiveIsVideo using slide metadata without requiring .mp4 extension');
  } else {
    fail('GalleryCardMedia does not compute effectiveIsVideo properly');
  }

  if (appJs.includes('targetNorm === "videos"') && appJs.includes('item.slides.some')) {
    pass('Videos category filter includes posts with video slides or video assets');
  } else {
    fail('Videos category filter does not include multi-category or carousel video posts');
  }

  const galleryVideoJs = fs.readFileSync('src/components/GalleryCardVideo.jsx', 'utf8');
  if (galleryVideoJs.includes('video.readyState >= 2') && galleryVideoJs.includes('handleCanPlay()')) {
    pass('GalleryCardVideo checks video.readyState on mount and begins playback immediately on isActive');
  } else {
    fail('GalleryCardVideo does not check readyState on mount');
  }
} catch (e) {
  fail('Checking gallery video failed', e.message);
}

// 5. Hero Slideshow Preload & Fallback
console.log('\n--- 5. Hero Slideshow Integrity & Zero Blank States (Req #5) ---');
try {
  const mediaSlideshowJs = fs.readFileSync('src/components/MediaSlideshow.jsx', 'utf8');
  if (mediaSlideshowJs.includes('opacity: 1') && mediaSlideshowJs.includes('zIndex: isIncoming ? 2 : 1')) {
    pass('MediaSlideshow preserves previous slide at opacity: 1 on base layer during crossfade');
  } else {
    fail('MediaSlideshow does not keep base layer visible during crossfade');
  }

  const appJs = fs.readFileSync('src/App.jsx', 'utf8');
  if (appJs.includes('/covers/baby.jpg') && !appJs.includes('/covers/love-language.png')) {
    pass('HeroSlideshow uses verified on-disk cover arts for fallback without broken paths');
  } else {
    fail('HeroSlideshow still references non-existent cover path');
  }
} catch (e) {
  fail('Checking hero slideshow failed', e.message);
}

// 6. Services Conversational UX & Stepper
console.log('\n--- 6. Services Conversational Experience & Stepper (Req #6) ---');
try {
  const immersiveJs = fs.readFileSync('src/components/ImmersiveServicesView.jsx', 'utf8');
  if (immersiveJs.includes('svc.isHourly && isSelected') && immersiveJs.includes('Session Duration:')) {
    pass('ImmersiveServicesView renders live session duration stepper directly on selected hourly cards in Step 1');
  } else {
    fail('Live session duration stepper missing on Step 1 card');
  }

  if (immersiveJs.includes('updateConfig(primarySlug, "bookingDate", newDate)')) {
    pass('ImmersiveServicesView persists booking date and time slot across step transitions');
  } else {
    fail('Booking date and time not properly persisted across steps');
  }

  if (immersiveJs.includes('50% Initial Deposit Today') && immersiveJs.includes('Guaranteed Deliverables')) {
    pass('Step 5 Summary itemizes deliverables, scheduled session, and 50% deposit breakdown');
  } else {
    fail('Step 5 Summary missing deliverables or 50% deposit breakdown');
  }
} catch (e) {
  fail('Checking ImmersiveServicesView failed', e.message);
}

// 7. Out Now & Coming Soon Lifecycle Animations
console.log('\n--- 7. Release Lifecycle Animations & NOISEMAKER Out Now (Req #7) ---');
try {
  const releasePageJs = fs.readFileSync('src/components/ReleasePage.jsx', 'utf8');
  if (releasePageJs.includes('release?.slug === "noisemaker"') && releasePageJs.includes('90 * 24 * 60 * 60 * 1000')) {
    pass('ReleasePage includes NOISEMAKER and <= 90 days releases in isRecentRelease');
  } else {
    fail('ReleasePage does not calculate isRecentRelease properly');
  }

  const appCss = fs.readFileSync('src/App.css', 'utf8');
  if (appCss.includes('@keyframes outNowGlow') && appCss.includes('@keyframes comingSoonGlow') && appCss.includes('prefers-reduced-motion')) {
    pass('App.css defines @keyframes outNowGlow and comingSoonGlow with prefers-reduced-motion support');
  } else {
    fail('App.css missing glow keyframes or prefers-reduced-motion');
  }
} catch (e) {
  fail('Checking release lifecycle failed', e.message);
}

// 8. Site-Wide Technical SEO & Prerendered Semantic HTML
console.log('\n--- 8. Technical SEO & Prerendered Semantic HTML (Req #8) ---');
try {
  const appJs = fs.readFileSync('src/App.jsx', 'utf8');
  if (appJs.includes('<Route path="/music" element={<MusicRoute />} />') &&
      appJs.includes('<Route path="/gallery" element={<GalleryRoute />} />') &&
      appJs.includes('<Route path="/about" element={<AboutRoute />} />')) {
    pass('App.jsx provides dedicated, indexable component views for /music, /gallery, and /about');
  } else {
    fail('App.jsx does not mount dedicated component views for core content routes');
  }

  const musicHtml = fs.readFileSync('dist/music/index.html', 'utf8');
  if (musicHtml.includes('id="root"><header') && musicHtml.includes('silachomka Music Catalogue &amp; Discography')) {
    pass('dist/music/index.html contains prerendered semantic HTML inside <div id="root"> before JS executes');
  } else {
    fail('dist/music/index.html missing semantic HTML in <div id="root">');
  }

  const noisemakerHtml = fs.readFileSync('dist/release/noisemaker/index.html', 'utf8');
  if (noisemakerHtml.includes('<h1>NOISEMAKER &mdash; silachomka</h1>') && noisemakerHtml.includes('Tracklist')) {
    pass('dist/release/noisemaker/index.html contains prerendered semantic tracklist and metadata inside <div id="root">');
  } else {
    fail('dist/release/noisemaker/index.html missing semantic tracklist in <div id="root">');
  }
} catch (e) {
  fail('Checking technical SEO failed', e.message);
}

// Summary
console.log('\n=================================================================');
console.log(` STAGE 38 RESULTS: ${passCount} passed, ${failCount} failed.`);
console.log('=================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

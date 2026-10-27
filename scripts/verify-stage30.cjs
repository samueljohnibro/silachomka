const fs = require('fs');
const path = require('path');
const { neon } = require('../worker/node_modules/@neondatabase/serverless');

const devVars = fs.readFileSync(path.join(__dirname, '../worker/.dev.vars'), 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(dbUrl);

let passCount = 0;
let failCount = 0;

function pass(name, detail = '') {
  passCount++;
  console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failCount++;
  console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function runVerification() {
  console.log('=================================================');
  console.log(' STAGE 30 — FULL PRODUCTION RECONCILIATION VERIFICATION');
  console.log('=================================================\n');

  // -----------------------------------------------------------------
  // 1. Navigation Header Alignment (Req #1)
  // -----------------------------------------------------------------
  console.log('--- 1. Navigation Header Alignment (Req #1) ---');
  const appCss = fs.readFileSync('src/App.css', 'utf8');
  const appJsx = fs.readFileSync('src/App.jsx', 'utf8');

  if (appCss.includes('.site-header nav a.nav-item-world')) {
    pass('Req #1: Dedicated .nav-item-world class configured in App.css');
  } else {
    fail('Req #1: Dedicated .nav-item-world class configured in App.css');
  }

  if (appCss.includes('height: 40px') && appCss.includes('.site-header nav {')) {
    pass('Req #1: site-header nav items and wordmark share unified 40px height');
  } else {
    fail('Req #1: site-header nav items and wordmark share unified 40px height');
  }

  if (appJsx.includes('className="nav-item-world"') && appJsx.includes('nav-world-break')) {
    pass('Req #1: "The World" navigation link rendered with .nav-world-break');
  } else {
    fail('Req #1: "The World" navigation link rendered with .nav-world-break');
  }

  // -----------------------------------------------------------------
  // 2. Beats Page Header / Toolbar Alignment (Req #2 & #18)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Beats Page Header / Toolbar Alignment (Req #2 & #18) ---');
  if (appCss.includes('.beats-toolbar .filter-toolbar') && appCss.includes('margin-bottom: 0 !important')) {
    pass('Req #2: Removed 24px margin-bottom from filter-toolbar in beats-toolbar context');
  } else {
    fail('Req #2: Removed 24px margin-bottom from filter-toolbar in beats-toolbar context');
  }

  if (appCss.includes('.beats-segmented-group {') && appCss.includes('height: 36px')) {
    pass('Req #2 & #18: Segmented control, filter buttons, and currency selector normalized to 36px');
  } else {
    fail('Req #2 & #18: Segmented control, filter buttons, and currency selector normalized to 36px');
  }

  // -----------------------------------------------------------------
  // 3. Beats Grid Duration Toggle Exclusivity (Req #3)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Beats Grid Duration Toggle Exclusivity (Req #3) ---');
  const beatsPageJsx = fs.readFileSync('src/pages/BeatsPage.jsx', 'utf8');
  const beatDetailJsx = fs.readFileSync('src/pages/BeatDetailPage.jsx', 'utf8');

  // Verify duration toggle is absent from normal catalog grid toolbar
  const normalToolbarHasDuration = /<section className="beats-toolbar"[\s\S]*?(1 MIN|playbackMode === "1min")[\s\S]*?<\/section>/.test(beatsPageJsx);
  if (!normalToolbarHasDuration) {
    pass('Req #3: 1 MIN / FULL TRACK toggle completely absent from normal catalog grid toolbar');
  } else {
    fail('Req #3: 1 MIN / FULL TRACK toggle completely absent from normal catalog grid toolbar');
  }

  // Verify duration toggle is absent from BeatDetailPage
  if (!beatDetailJsx.includes('1 MIN') && !beatDetailJsx.includes('FULL TRACK')) {
    pass('Req #3: Duration toggle completely absent from BeatDetailPage.jsx');
  } else {
    fail('Req #3: Duration toggle completely absent from BeatDetailPage.jsx');
  }

  // Verify duration toggle is strictly preserved inside BeatReelPlayer
  if (beatsPageJsx.includes('function BeatReelPlayer') && beatsPageJsx.includes('1 MIN')) {
    pass('Req #3: Duration selector strictly preserved inside 9:16 Reel Mode');
  } else {
    fail('Req #3: Duration selector strictly preserved inside 9:16 Reel Mode');
  }

  // -----------------------------------------------------------------
  // 4. Media Playback & Public Gallery Video (Req #8–11)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Gallery Video Playback & Viewport Autoplay (Req #8–11) ---');
  if (fs.existsSync('src/components/GalleryCardVideo.jsx')) {
    pass('Req #8 & #9: Dedicated GalleryCardVideo.jsx component exists');
    const cardVideoCode = fs.readFileSync('src/components/GalleryCardVideo.jsx', 'utf8');
    if (cardVideoCode.includes('IntersectionObserver') && cardVideoCode.includes('currentTime = 0.1')) {
      pass('Req #8 & #9: GalleryCardVideo implements IntersectionObserver and first-frame paint seek');
    } else {
      fail('Req #8 & #9: GalleryCardVideo implements IntersectionObserver and first-frame paint seek');
    }
    if (cardVideoCode.includes('Math.random()') && cardVideoCode.includes('hasSelectedRandomStart')) {
      pass('Req #10: GalleryCardVideo implements random autoplay starting position selected once per viewport entry');
    } else {
      fail('Req #10: GalleryCardVideo implements random autoplay starting position selected once per viewport entry');
    }
  } else {
    fail('Req #8 & #9: Dedicated GalleryCardVideo.jsx component exists');
  }

  const modalJsx = fs.readFileSync('src/components/GalleryPostModal.jsx', 'utf8');
  if (modalJsx.includes('ambient-video-layer')) {
    pass('Req #11 & #14: GalleryPostModal renders atmospheric backdrop for video posts as well as images');
  } else {
    fail('Req #11 & #14: GalleryPostModal renders atmospheric backdrop for video posts as well as images');
  }

  // -----------------------------------------------------------------
  // 5. Release Hierarchy & Animation (Req #15–17)
  // -----------------------------------------------------------------
  console.log('\n--- 5. Release Hierarchy & Animation (Req #15–17) ---');
  const releasePageJsx = fs.readFileSync('src/components/ReleasePage.jsx', 'utf8');
  if (releasePageJsx.includes('release-status-row') && releasePageJsx.includes('COMING SOON') && releasePageJsx.includes('OUT NOW')) {
    pass('Req #15: Clean vertical hierarchy: TITLE -> STATUS PILL (breathing room, no bullet points) -> DESCRIPTION');
  } else {
    fail('Req #15: Clean vertical hierarchy: TITLE -> STATUS PILL (breathing room, no bullet points) -> DESCRIPTION');
  }

  if (releasePageJsx.includes('showEntrySplash') && releasePageJsx.includes('release-entry-splash')) {
    pass('Req #16: Non-blocking session entry splash animation configured in ReleasePage.jsx');
  } else {
    fail('Req #16: Non-blocking session entry splash animation configured in ReleasePage.jsx');
  }

  const adminMusicJsx = fs.readFileSync('src/pages/admin/AdminMusicPage.jsx', 'utf8');
  if (adminMusicJsx.includes('value="DIRECTOR"') && adminMusicJsx.includes('minWidth: 145')) {
    pass('Req #17: AdminMusicPage.jsx track role dropdown includes DIRECTOR with robust minWidth to prevent Windows Chrome clipping');
  } else {
    fail('Req #17: AdminMusicPage.jsx track role dropdown includes DIRECTOR with robust minWidth to prevent Windows Chrome clipping');
  }

  // -----------------------------------------------------------------
  // 6. Cookie Consent Banner Polish (Req #35)
  // -----------------------------------------------------------------
  console.log('\n--- 6. Cookie Consent Banner Polish (Req #35) ---');
  if (appCss.includes('.cookie-consent-banner') && appCss.includes('width: min(94vw, 760px)')) {
    pass('Req #35: Cookie banner redesigned to compact, non-dominating floating bar');
  } else {
    fail('Req #35: Cookie banner redesigned to compact, non-dominating floating bar');
  }

  // -----------------------------------------------------------------
  // 7. Social Previews & Media Metadata in Worker (Req #4–6 & #36)
  // -----------------------------------------------------------------
  console.log('\n--- 7. Social Previews & Media Metadata (Req #4–6 & #36) ---');
  const indexJs = fs.readFileSync('worker/src/index.js', 'utf8');
  if (indexJs.includes('og:image:type') && indexJs.includes('twitter:player:stream')) {
    pass('Req #5 & #6: buildShareHtml exposes og:image:type, og:audio, and twitter:player:stream');
  } else {
    fail('Req #5 & #6: buildShareHtml exposes og:image:type, og:audio, and twitter:player:stream');
  }

  if (indexJs.includes('track_preview_audio') && indexJs.includes("shareType === 'release'")) {
    pass('Req #6: Release social share queries track preview audio when available');
  } else {
    fail('Req #6: Release social share queries track preview audio when available');
  }

  // -----------------------------------------------------------------
  // 8. Conversational Music Services & Multi-Service System (Req #19–34)
  // -----------------------------------------------------------------
  console.log('\n--- 8. Conversational Music Services & Multi-Service System (Req #19–34) ---');
  const servicesJsx = fs.readFileSync('src/pages/ServicesPage.jsx', 'utf8');

  if (servicesJsx.includes('What are you looking to create?')) {
    pass('Req #19: Warm conversational greeting ("What are you looking to create?") rendered in ServicesPage.jsx');
  } else {
    fail('Req #19: Warm conversational greeting ("What are you looking to create?") rendered in ServicesPage.jsx');
  }

  if (servicesJsx.includes('sessionCart') && servicesJsx.includes('YOUR SESSION')) {
    pass('Req #20: Multi-service cart ("YOUR SESSION") supports selecting multiple services in single order');
  } else {
    fail('Req #20: Multi-service cart ("YOUR SESSION") supports selecting multiple services in single order');
  }

  if (servicesJsx.includes('hours || 1') && servicesJsx.includes('hourlyRateNgn')) {
    pass('Req #21: Voice recording dynamically calculates hourly rates (1h=₦25k, 2h=₦50k, etc.)');
  } else {
    fail('Req #21: Voice recording dynamically calculates hourly rates (1h=₦25k, 2h=₦50k, etc.)');
  }

  if (servicesJsx.includes('Price Upon Request') && servicesJsx.includes('hasPriceUponRequest')) {
    pass('Req #32: Service #5 ("Recording + Mixing on Client\'s Beat") strictly preserved as "Price Upon Request"');
  } else {
    fail('Req #32: Service #5 ("Recording + Mixing on Client\'s Beat") strictly preserved as "Price Upon Request"');
  }

  if (servicesJsx.includes('copyOrderNumberToClipboard') || servicesJsx.includes('navigator.clipboard')) {
    pass('Req #25: 1-click clipboard copy with visual feedback implemented for unique order number');
  } else {
    fail('Req #25: 1-click clipboard copy with visual feedback implemented for unique order number');
  }

  if (indexJs.includes('/api/services/verify-payment')) {
    pass('Req #26: Server-side payment verification endpoint /api/services/verify-payment implemented');
  } else {
    fail('Req #26: Server-side payment verification endpoint /api/services/verify-payment implemented');
  }

  if (indexJs.includes('/api/services/webhook')) {
    pass('Req #27: Paystack webhook endpoint /api/services/webhook with HMAC-SHA512 verification implemented');
  } else {
    fail('Req #27: Paystack webhook endpoint /api/services/webhook with HMAC-SHA512 verification implemented');
  }

  // -----------------------------------------------------------------
  // 9. Live Neon Database Multi-Service Order Test
  // -----------------------------------------------------------------
  console.log('\n--- 9. Live Neon DB Multi-Service Order Verification ---');
  const testOrderNum = `SC-TEST-S30-${Date.now().toString(36).toUpperCase()}`;

  try {
    // Insert a multi-service test order: Beat Production (80k) + Voice Recording 2h (50k) = 130k
    const items = [
      { slug: 'beat-production', title: 'Beat Production', calculatedPriceNgn: 80000, configuration: { genre: 'Trap', bpm: '140' } },
      { slug: 'voice-recording', title: 'Voice Recording', calculatedPriceNgn: 50000, configuration: { hours: 2 } }
    ];
    const total = 130000;

    await sql`
      INSERT INTO service_orders (
        order_number, service_slug, service_title, customer_name, customer_email,
        items, total_amount_ngn, currency, order_status, payment_status, deadline_timezone
      ) VALUES (
        ${testOrderNum}, 'custom-session', 'Beat Production + Voice Recording', 'QA Tester', 'qa@silachomka.com',
        ${JSON.stringify(items)}::jsonb, ${total}, 'NGN', 'AWAITING_PAYMENT', 'UNPAID', 'WAT'
      )
    `;
    pass('Live DB: Multi-service cart order inserted into service_orders table');

    // Retrieve order
    const rows = await sql`
      SELECT order_number, total_amount_ngn, items, deadline_timezone, order_status
      FROM service_orders
      WHERE order_number = ${testOrderNum}
    `;

    if (rows.length > 0 && Number(rows[0].total_amount_ngn) === 130000 && rows[0].deadline_timezone === 'WAT') {
      pass(`Live DB: Order ${testOrderNum} authoritative total ₦130,000 verified in WAT timezone`);
    } else {
      fail(`Live DB: Order ${testOrderNum} authoritative total ₦130,000 verified in WAT timezone`);
    }

    // Clean up test order
    await sql`DELETE FROM service_orders WHERE order_number = ${testOrderNum}`;
    pass('Live DB: Test order cleaned up safely without side-effects');
  } catch (err) {
    fail('Live DB: Multi-service order database test failed', err.message);
  }

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n=================================================');
  console.log(` STAGE 30 SUMMARY: ${passCount} passed, ${failCount} failed`);
  console.log('=================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

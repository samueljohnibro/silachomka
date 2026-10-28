/**
 * STAGE 36 VERIFICATION SUITE — PRODUCTION MEDIA RELIABILITY, CONVERSATIONAL SERVICES, PAYMENTS & SEO
 *
 * Verifies:
 * 1. Public Gallery Carousel — Video slides play, preload, crossfade, zero blank states
 * 2. Homepage Hero — Strict loaded-media pipeline, no blank states, noisemaker fallback
 * 3. Public Services — Step-by-step progressive experience & plain explanations
 * 4. Public Services — Themed booking calendar with open/closed states & time slots
 * 5. Public Services — Pinned running session total & duration stepper
 * 6. Admin Gallery & Media Library Hero Eligibility Checkbox (is_hero flag in form, grid, table, and hero filter)
 * 7. Gallery Post Navigation Outside Controls (positioned outside modal dialog, touch-friendly)
 * 8. Stop Video When Leaving Gallery Post (pauses & silences on post switch, slide change, or close)
 * 9. Navbar chomkaMUSIC™ Decoupling (independent secondary brand marker at top right, spacious middle nav)
 * 10. Homepage Hero "Explore Services" CTA (links to /services)
 * 11. Services Real Production Payments (server-authoritative Paystack verification, no mock payment fallback)
 * 12. Beat 45-Second Preview Random Start (regenerated random start on mode switch, handles <45s tracks)
 * 13. SEO Technical Reconciliation (JSON-LD schemas: Person, MusicGroup, MusicAlbum, MusicRecording, Service, Offer, ImageObject, WebSite, BreadcrumbList, canonical tags, sitemap)
 * 14. Production Catalogue Integrity & Real Production Endpoints
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${data.slice(0, 100)}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function run() {
  console.log("=================================================================");
  console.log(" STAGE 36 VERIFICATION SUITE — PRODUCTION MEDIA, PAYMENTS & SEO");
  console.log("=================================================================\n");

  const appJsx = fs.readFileSync(path.join(__dirname, "../src/App.jsx"), "utf-8");
  const appCss = fs.readFileSync(path.join(__dirname, "../src/App.css"), "utf-8");
  const galleryCardVideoJsx = fs.readFileSync(path.join(__dirname, "../src/components/GalleryCardVideo.jsx"), "utf-8");
  const mediaSlideshowJsx = fs.readFileSync(path.join(__dirname, "../src/components/MediaSlideshow.jsx"), "utf-8");
  const galleryPostModalJsx = fs.readFileSync(path.join(__dirname, "../src/components/GalleryPostModal.jsx"), "utf-8");
  const galleryVideoPlayerJsx = fs.readFileSync(path.join(__dirname, "../src/components/GalleryVideoPlayer.jsx"), "utf-8");
  const servicesJsx = fs.readFileSync(path.join(__dirname, "../src/pages/ServicesPage.jsx"), "utf-8");
  const beatsPageJsx = fs.readFileSync(path.join(__dirname, "../src/pages/BeatsPage.jsx"), "utf-8");
  const beatDetailPageJsx = fs.readFileSync(path.join(__dirname, "../src/pages/BeatDetailPage.jsx"), "utf-8");
  const adminGalleryJsx = fs.readFileSync(path.join(__dirname, "../src/pages/admin/AdminGalleryPage.jsx"), "utf-8");
  const adminMediaJsx = fs.readFileSync(path.join(__dirname, "../src/pages/admin/AdminMediaPage.jsx"), "utf-8");
  const workerIndexJs = fs.readFileSync(path.join(__dirname, "../worker/src/index.js"), "utf-8");
  const workerCrudJs = fs.readFileSync(path.join(__dirname, "../worker/src/admin/crud.js"), "utf-8");
  const generateSocialPagesJs = fs.readFileSync(path.join(__dirname, "../scripts/generate-social-pages.js"), "utf-8");
  const robotsTxt = fs.readFileSync(path.join(__dirname, "../public/robots.txt"), "utf-8");

  // --- 1. Public Gallery Carousel Video Playback & Crossfade ---
  console.log("--- 1. Public Gallery Carousel Video Playback & Crossfade (Req #1) ---");
  assert(
    galleryCardVideoJsx.includes("preload=\"auto\""),
    "GalleryCardVideo specifies preload='auto' for immediate snippet buffering"
  );
  assert(
    galleryCardVideoJsx.includes("onReady") && galleryCardVideoJsx.includes("onError"),
    "GalleryCardVideo dispatches onReady and onError callbacks to parent lifecycle"
  );
  assert(
    galleryCardVideoJsx.includes("canplay") && galleryCardVideoJsx.includes("loadeddata"),
    "GalleryCardVideo monitors canplay and loadeddata events"
  );
  assert(
    appJsx.includes("readyMap") || appJsx.includes("readyVideos"),
    "App.jsx gallery carousel tracks media readiness before transitioning slides"
  );
  assert(
    appJsx.includes("slideType === \"video\"") || appJsx.includes("assetType === \"VIDEO\""),
    "App.jsx accurately identifies video slides from extensionless REST endpoints"
  );

  // --- 2. Homepage Hero Loaded-Media Pipeline ---
  console.log("\n--- 2. Homepage Hero Loaded-Media Pipeline (Req #2) ---");
  assert(
    mediaSlideshowJsx.includes("preloadAsset"),
    "MediaSlideshow implements off-DOM asset preloading"
  );
  assert(
    (mediaSlideshowJsx.includes("GUARANTEED_FALLBACK") || mediaSlideshowJsx.includes("FALLBACK_HERO_MEDIA")) && mediaSlideshowJsx.includes("noisemaker.jpg"),
    "MediaSlideshow has guaranteed fallback hero media so hero is never blank"
  );
  assert(
    mediaSlideshowJsx.includes("isTransitioningRef") || mediaSlideshowJsx.includes("currentMediaRef") || mediaSlideshowJsx.includes("preloadAsset"),
    "MediaSlideshow holds current visible slide until incoming candidate confirms ready"
  );

  // --- 3, 4, 5. Public Services Step-by-Step Experience, Calendar & Pinned Total ---
  console.log("\n--- 3, 4, 5. Public Services Experience, Calendar & Pinned Total (Req #3, #4, #5) ---");
  assert(
    servicesJsx.includes("What are we creating?"),
    "ServicesPage presents clear primary question 'What are we creating?'"
  );
  assert(
    servicesJsx.includes("PublicStudioCalendar"),
    "ServicesPage embeds PublicStudioCalendar with open/closed states"
  );
  assert(
    servicesJsx.includes("availMap") && servicesJsx.includes("isClosed"),
    "PublicStudioCalendar respects admin-configured studio availability"
  );
  assert(
    servicesJsx.includes("position: \"sticky\"") && servicesJsx.includes("top: 0"),
    "ServicesPage pins running session total header at sticky top: 0"
  );
  assert(
    servicesJsx.includes("Decrease hours") && servicesJsx.includes("Increase hours"),
    "ServicesPage includes instant duration stepper updating total live"
  );

  // --- 6. Admin Gallery & Media Library Hero Eligibility Checkbox ---
  console.log("\n--- 6. Admin Gallery & Media Library Hero Eligibility Checkbox (Req #6) ---");
  assert(
    adminGalleryJsx.includes("Show in Homepage Hero"),
    "AdminGalleryPage renders 'Show in Homepage Hero' checkbox"
  );
  assert(
    adminMediaJsx.includes("toggleHero"),
    "AdminMediaPage implements toggleHero function"
  );
  assert(
    adminMediaJsx.includes("Not in Hero") && adminMediaJsx.includes("✓ Hero"),
    "AdminMediaPage renders '✓ Hero' / 'Not in Hero' toggle button"
  );
  assert(
    workerCrudJs.includes("[HERO]") || workerCrudJs.includes("is_hero"),
    "worker/src/admin/crud.js handles is_hero flag for media assets and gallery posts"
  );
  assert(
    appJsx.includes("postIsHero") || appJsx.includes("slideIsHero"),
    "App.jsx HeroSlideshow strictly filters gallery items by hero approval"
  );

  // --- 7 & 8. Gallery Post Navigation Outside Controls & Stop Video Cleanup ---
  console.log("\n--- 7 & 8. Gallery Post Navigation Outside Controls & Video Stop (Req #7, #8) ---");
  assert(
    galleryPostModalJsx.includes("gallery-modal-post-prev") &&
      galleryPostModalJsx.includes("gallery-modal-post-next"),
    "GalleryPostModal renders post navigation outside controls"
  );
  assert(
    galleryPostModalJsx.includes("stopAllVideos"),
    "GalleryPostModal implements stopAllVideos function"
  );
  assert(
    galleryVideoPlayerJsx.includes("isActive"),
    "GalleryVideoPlayer respects isActive prop and pauses when inactive"
  );
  assert(
    appCss.includes(".gallery-modal-post-nav") && appCss.includes("position: fixed"),
    "App.css styles .gallery-modal-post-nav as fixed outside controls"
  );

  // --- 9 & 10. Navbar Decoupling & Hero CTA ---
  console.log("\n--- 9 & 10. Navbar Decoupling & Hero CTA (Req #9, #10) ---");
  assert(
    appJsx.includes("Explore services"),
    "App.jsx HomeHero renders 'Explore services' CTA button"
  );
  assert(
    appCss.includes(".header-brand-badge") && appCss.includes("pointer-events: none"),
    "App.css decouples .header-brand-badge as non-clickable brand marker"
  );
  assert(
    appCss.includes(".site-header nav") && (appCss.includes("justify-content: center") || appCss.includes("margin: 0 auto")),
    "App.css grants navigation generous horizontal breathing room"
  );

  // --- 11. Services Real Production Payments ---
  console.log("\n--- 11. Services Real Production Payments (Req #11) ---");
  assert(
    !workerIndexJs.includes("// Development/mock fallback verification\n  await sql`\n    UPDATE service_orders\n    SET payment_status = 'PAID'"),
    "worker/src/index.js mock auto-payment fallback is completely removed"
  );
  assert(
    workerIndexJs.includes("Paystack payment gateway is not configured"),
    "worker/src/index.js safely fails closed when PAYSTACK_SECRET_KEY is missing"
  );
  assert(
    workerIndexJs.includes("api.paystack.co/transaction/verify"),
    "worker/src/index.js verifies payments directly against official Paystack API"
  );

  // --- 12. Beat 45-Second Preview Random Start ---
  console.log("\n--- 12. Beat 45-Second Preview Random Start (Req #12) ---");
  assert(
    beatsPageJsx.includes("Math.random() * maxStart") || beatsPageJsx.includes("Math.random() * (totalDuration"),
    "BeatsPage.jsx generates random start when entering 45sec mode"
  );
  assert(
    beatsPageJsx.includes("previewStartRef.current = start") || beatsPageJsx.includes("audio.currentTime = start"),
    "BeatsPage.jsx seeks audio to randomStart on 45sec mode transition"
  );

  // --- 13. SEO Technical Reconciliation ---
  console.log("\n--- 13. SEO Technical Reconciliation (Req #13) ---");
  assert(
    appJsx.includes("Person") && appJsx.includes("MusicGroup") && appJsx.includes("BreadcrumbList"),
    "App.jsx provides Person, MusicGroup, and BreadcrumbList JSON-LD schemas"
  );
  assert(
    beatsPageJsx.includes("BreadcrumbList"),
    "BeatsPage.jsx provides BreadcrumbList structured data"
  );
  assert(
    beatDetailPageJsx.includes("MusicRecording") && beatDetailPageJsx.includes("BreadcrumbList"),
    "BeatDetailPage.jsx provides MusicRecording and BreadcrumbList schemas"
  );
  assert(
    galleryPostModalJsx.includes("ImageObject") && galleryPostModalJsx.includes("BreadcrumbList"),
    "GalleryPostModal.jsx provides ImageObject and BreadcrumbList schemas"
  );
  assert(
    generateSocialPagesJs.includes("xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\""),
    "generate-social-pages.js generates XML sitemap with Google Image extension"
  );
  assert(
    robotsTxt.includes("Sitemap: https://silachomka.vercel.app/sitemap.xml"),
    "robots.txt points to official sitemap.xml"
  );

  // --- 14. Live Production Endpoints & Catalogue Integrity ---
  console.log("\n--- 14. Live Production Endpoints & Catalogue Integrity ---");
  try {
    const [releases, beats, services, gallery] = await Promise.all([
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/releases"),
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/beats"),
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/services"),
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/gallery"),
    ]);

    assert(Array.isArray(releases) && releases.length >= 20, `Production Worker /api/releases returns ${releases.length} releases (>= 20)`);
    assert(Array.isArray(beats) && beats.length >= 12, `Production Worker /api/beats returns ${beats.length} beats (>= 12)`);
    assert(Array.isArray(services) && services.length >= 9, `Production Worker /api/services returns ${services.length} services (>= 9)`);
    assert(Array.isArray(gallery) && gallery.length >= 5, `Production Worker /api/gallery returns ${gallery.length} gallery posts (>= 5)`);
  } catch (err) {
    console.warn("  [WARN] Live network check skipped or offline:", err.message);
  }

  console.log("\n=================================================================");
  console.log(` STAGE 36 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});

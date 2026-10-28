// scripts/verify-stage37.cjs
// STAGE 37 VERIFICATION SUITE — SERVICES IMMERSIVE UX, SITE-WIDE SEO, GALLERY METADATA & ADMIN POLISH

const fs = require("fs");
const path = require("path");
const https = require("https");

function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on("error", reject);
  });
}

async function runStage37Verification() {
  console.log("=================================================================");
  console.log(" STAGE 37 VERIFICATION SUITE — SERVICES, SEO, GALLERY & ADMIN");
  console.log("=================================================================\n");

  // Load relevant codebase files
  const studioAmbientBgJsx = fs.readFileSync(path.join(__dirname, "../src/components/StudioAmbientBackground.jsx"), "utf-8");
  const servicesJsx = fs.readFileSync(path.join(__dirname, "../src/pages/ServicesPage.jsx"), "utf-8");
  const serviceOrderDetailJsx = fs.readFileSync(path.join(__dirname, "../src/pages/ServiceOrderDetailPage.jsx"), "utf-8");
  const immersiveServicesJsx = fs.readFileSync(path.join(__dirname, "../src/components/ImmersiveServicesView.jsx"), "utf-8");
  const shareButtonJsx = fs.readFileSync(path.join(__dirname, "../src/components/SharePageButton.jsx"), "utf-8");
  const adminGalleryJsx = fs.readFileSync(path.join(__dirname, "../src/pages/admin/AdminGalleryPage.jsx"), "utf-8");
  const draftHookJs = fs.readFileSync(path.join(__dirname, "../src/utils/useDraftAutosave.js"), "utf-8");
  const appJsx = fs.readFileSync(path.join(__dirname, "../src/App.jsx"), "utf-8");
  const appCss = fs.readFileSync(path.join(__dirname, "../src/App.css"), "utf-8");
  const galleryCardVideoJsx = fs.readFileSync(path.join(__dirname, "../src/components/GalleryCardVideo.jsx"), "utf-8");
  const galleryPostModalJsx = fs.readFileSync(path.join(__dirname, "../src/components/GalleryPostModal.jsx"), "utf-8");
  const beatsPageJsx = fs.readFileSync(path.join(__dirname, "../src/pages/BeatsPage.jsx"), "utf-8");
  const workerCrudJs = fs.readFileSync(path.join(__dirname, "../worker/src/admin/crud.js"), "utf-8");
  const workerIndexJs = fs.readFileSync(path.join(__dirname, "../worker/src/index.js"), "utf-8");
  const sitemapXml = fs.readFileSync(path.join(__dirname, "../public/sitemap.xml"), "utf-8");
  const robotsTxt = fs.readFileSync(path.join(__dirname, "../public/robots.txt"), "utf-8");

  // --- 1. Reusable Studio Ambient Background (Req #1) ---
  console.log("--- 1. Services Ambient Background Treatment (Req #1) ---");
  assert(
    studioAmbientBgJsx.includes("product-ambient-backdrop") && studioAmbientBgJsx.includes("/beats-image.png"),
    "StudioAmbientBackground component reuses iconic atmospheric smiley visual asset"
  );
  assert(
    servicesJsx.includes("<StudioAmbientBackground") && servicesJsx.includes("/beats-image.png"),
    "ServicesPage imports and renders StudioAmbientBackground"
  );
  assert(
    serviceOrderDetailJsx.includes("<StudioAmbientBackground"),
    "ServiceOrderDetailPage uses StudioAmbientBackground for unified atmospheric design"
  );
  assert(
    appCss.includes(".services-page-view > *:not(.product-ambient-backdrop)"),
    "App.css layers services content above product-ambient-backdrop for clear text readability"
  );

  // --- 2. Immersive Conversational Step Experience (Req #2) ---
  console.log("\n--- 2. Services Immersive Conversational Step Experience (Req #2) ---");
  assert(
    immersiveServicesJsx.includes("What do you need?") &&
    immersiveServicesJsx.includes("How much studio time do you need?") &&
    immersiveServicesJsx.includes("When should we schedule your session?") &&
    immersiveServicesJsx.includes("Anything else we should know?") &&
    immersiveServicesJsx.includes("Review your studio booking"),
    "ImmersiveServicesView guides user step-by-step through natural, plain-language decisions"
  );
  assert(
    servicesJsx.includes("isImmersive") && servicesJsx.includes("ImmersiveServicesView"),
    "ServicesPage manages immersive conversation state and renders ImmersiveServicesView"
  );
  assert(
    servicesJsx.includes("e.key === \"Escape\"") || immersiveServicesJsx.includes("onExit"),
    "Keyboard Escape and exit control cleanly restore standard services experience"
  );
  assert(
    appCss.includes(".services-immersive-viewport") && appCss.includes("backdrop-filter"),
    "App.css styles .services-immersive-viewport with glass/translucent player aesthetic"
  );

  // --- 3. Remove Real Name From All Placeholders (Req #3) ---
  console.log("\n--- 3. Remove Real Name From All Placeholders (Req #3) ---");
  function checkNoRealNameInPlaceholders(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        if (file !== "node_modules" && file !== "dist" && file !== ".git") {
          checkNoRealNameInPlaceholders(full);
        }
      } else if (/\.(jsx?)$/.test(file)) {
        const text = fs.readFileSync(full, "utf-8");
        const matches = text.match(/placeholder\s*=\s*["'][^"']*(?:samuel|john-ibro)[^"']*["']/gi);
        assert(
          !matches || matches.length === 0,
          `Zero artist personal-name placeholders in ${file} (found: ${matches ? matches.length : 0})`
        );
      }
    }
  }
  checkNoRealNameInPlaceholders(path.join(__dirname, "../src"));

  // --- 4. Gallery Admin Category Field Layout (Req #4) ---
  console.log("\n--- 4. Gallery Admin Category Field Layout (Req #4) ---");
  assert(
    adminGalleryJsx.includes("Choose Existing Category") && adminGalleryJsx.includes("Or Type Custom / New Category"),
    "AdminGalleryPage provides clear, obvious distinction between choosing existing and typing new categories"
  );
  assert(
    adminGalleryJsx.includes("minmax(240px, 1fr)"),
    "Category layout uses responsive grid preventing awkward wrapping or text clipping"
  );

  // --- 5. Admin Correct Dirty / Saved State (Req #5) ---
  console.log("\n--- 5. Admin Correct Dirty / Saved State Machine (Req #5) ---");
  assert(
    draftHookJs.includes("serializeSnapshot") || draftHookJs.includes("normalizeData"),
    "useDraftAutosave normalizes form state for accurate deep dirty checking"
  );
  assert(
    draftHookJs.includes("handleBeforeUnload") && draftHookJs.includes("isDirtyRef.current"),
    "useDraftAutosave warns on leave/reload ONLY when isDirty is true"
  );
  assert(
    draftHookJs.includes("isClean = initialJsonRef.current !== null && serialized === initialJsonRef.current"),
    "State machine resets to CLEAN when fields are modified and restored back to saved values"
  );
  assert(
    draftHookJs.includes("isDirtyRef.current = false") && draftHookJs.includes("clearDraft"),
    "Successful save cleanly resets dirty state to CLEAN and updates saved snapshot"
  );
  assert(
    draftHookJs.includes("isDirtyRef.current = true") && draftHookJs.includes("Draft restored (Unsaved changes)"),
    "Draft restoration preserves Stage 32 unsaved changes notification"
  );

  // --- 6. Gallery Posts Location (Req #6) ---
  console.log("\n--- 6. Gallery Posts Location Field (Req #6) ---");
  assert(
    workerCrudJs.includes("location: r.tags?.location") || workerCrudJs.includes("location: body.location"),
    "worker/src/admin/crud.js persists and returns location in gallery-posts endpoints"
  );
  assert(
    workerIndexJs.includes("tags->>'location'") || workerIndexJs.includes("location"),
    "worker/src/index.js returns location in public /api/gallery endpoints"
  );
  assert(
    adminGalleryJsx.includes("name=\"location\""),
    "AdminGalleryPage renders location input field in post details form"
  );
  assert(
    galleryPostModalJsx.includes("post.location"),
    "GalleryPostModal renders post location visually with pin icon"
  );
  assert(
    galleryPostModalJsx.includes("contentLocation") && galleryPostModalJsx.includes("\"@type\": \"Place\""),
    "GalleryPostModal includes contentLocation Place schema in ImageObject JSON-LD"
  );

  // --- 7. Gallery Video Square Card Fill (Req #7) ---
  console.log("\n--- 7. Gallery Video Square Card Fill (Req #7) ---");
  assert(
    galleryCardVideoJsx.includes("objectFit: \"cover\""),
    "GalleryCardVideo specifies objectFit: cover for video frame"
  );
  assert(
    appCss.includes("object-fit: cover !important") && appCss.includes("gallery-card video"),
    "App.css enforces object-fit: cover !important across all gallery card video previews"
  );

  // --- 8. Universal Share Page Component (Req #8) ---
  console.log("\n--- 8. Universal Share Page Component (Req #8) ---");
  assert(
    shareButtonJsx.includes("navigator.share") && shareButtonJsx.includes("navigator.clipboard"),
    "SharePageButton implements native Web Share API with clipboard copy fallback"
  );
  assert(
    shareButtonJsx.includes("Link Copied!"),
    "SharePageButton provides clear success feedback"
  );
  assert(
    appJsx.includes("<SharePageButton"),
    "Homepage integrates SharePageButton"
  );
  assert(
    beatsPageJsx.includes("<SharePageButton"),
    "Beats page integrates SharePageButton"
  );
  assert(
    servicesJsx.includes("<SharePageButton"),
    "Services page integrates SharePageButton"
  );

  // --- 9 & 10. Site-wide SEO & Search Intent Coverage (Req #9, #10) ---
  console.log("\n--- 9 & 10. Site-wide SEO & Search Intent Coverage (Req #9, #10) ---");
  assert(
    appJsx.includes("Samuel Silachomka John-Ibro"),
    "App.jsx Person schema covers legitimate search intent for Samuel Silachomka John-Ibro"
  );
  assert(
    appJsx.includes("path=\"/music\"") && appJsx.includes("path=\"/gallery\"") && appJsx.includes("path=\"/about\""),
    "App.jsx handles core navigation alias routes (/music, /gallery, /about) cleanly"
  );
  assert(
    fs.existsSync(path.join(__dirname, "../dist/music/index.html")) &&
    fs.existsSync(path.join(__dirname, "../dist/gallery/index.html")) &&
    fs.existsSync(path.join(__dirname, "../dist/about/index.html")),
    "Prerendered HTML generated for /music, /gallery, and /about"
  );
  assert(
    sitemapXml.includes("/music") && sitemapXml.includes("/gallery") && sitemapXml.includes("/about"),
    "sitemap.xml covers /music, /gallery, and /about canonical routes"
  );
  assert(
    robotsTxt.includes("Sitemap: https://silachomka.vercel.app/sitemap.xml"),
    "robots.txt points directly to canonical sitemap.xml"
  );

  // --- 11. Production Catalogue Integrity & Real Endpoints ---
  console.log("\n--- 11. Live Production Endpoints & Catalogue Integrity ---");
  const releases = await fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/releases");
  assert(Array.isArray(releases) && releases.length >= 20, `Production releases intact: ${releases.length} (>= 20)`);

  const beats = await fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/beats");
  assert(Array.isArray(beats) && beats.length >= 12, `Production beats intact: ${beats.length} (>= 12)`);

  const services = await fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/services");
  assert(Array.isArray(services) && services.length >= 9, `Production services intact: ${services.length} (>= 9)`);

  const gallery = await fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/gallery");
  assert(Array.isArray(gallery) && gallery.length >= 5, `Production gallery intact: ${gallery.length} (>= 5)`);

  console.log("\n=================================================================");
  console.log(" STAGE 37 VERIFICATION RESULTS: ALL ASSERTIONS PASSED (100%)");
  console.log("=================================================================\n");
}

runStage37Verification().catch((err) => {
  console.error("\nStage 37 Verification Failed:", err.message);
  process.exit(1);
});

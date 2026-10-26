const fs = require("fs");
const path = require("path");

const API_BASE = "https://silachomka-api.samueljohnibrotech.workers.dev";
const FRONTEND_BASE = "https://silachomka.vercel.app";

async function verifyStage28() {
  console.log("=================================================");
  console.log(" STAGE 28 — FULL SYSTEM RECONCILIATION VERIFICATION");
  console.log("=================================================");
  let passed = 0;
  let failed = 0;

  function assert(condition, label, details = "") {
    if (condition) {
      console.log(`  [PASS] ${label}${details ? " — " + details : ""}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${label}${details ? " — " + details : ""}`);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. LIVE WORKER API RECONCILIATION
  // -----------------------------------------------------------------
  console.log("\n--- 1. Live Worker API Checks ---");
  try {
    const relRes = await fetch(`${API_BASE}/api/releases`);
    assert(relRes.status === 200, "GET /api/releases returns HTTP 200");
    const releases = await relRes.json();
    assert(Array.isArray(releases) && releases.length >= 20, `Total live releases preserved: ${releases.length} (>= 20)`);

    const pipedown = releases.find((r) => r.slug === "pipedown" || r.title.toLowerCase() === "pipedown");
    assert(Boolean(pipedown), "Project 'pipedown' exists in live catalogue");
    assert(pipedown?.slug === "pipedown", "Project 'pipedown' has slug 'pipedown'");
    assert(Array.isArray(pipedown?.tracks) && pipedown.tracks.length > 0, "Project 'pipedown' has tracks populated");

    const track1 = pipedown?.tracks?.[0];
    assert(Boolean(track1?.preview_audio_url), "Pipedown track #1 has preview_audio_url", track1?.preview_audio_url);

    // Legacy slug alias resolution on Worker API: /api/releases/bite-me
    const aliasRes = await fetch(`${API_BASE}/api/releases/bite-me`);
    assert(aliasRes.status === 200, "GET /api/releases/bite-me (legacy slug) resolves to HTTP 200");
    const aliasData = await aliasRes.json();
    assert(aliasData.slug === "pipedown", "Legacy slug 'bite-me' resolves to canonical project 'pipedown'");

    // Canonical slug on Worker API: /api/releases/pipedown
    const pipedownRes = await fetch(`${API_BASE}/api/releases/pipedown`);
    assert(pipedownRes.status === 200, "GET /api/releases/pipedown returns HTTP 200");
    const pipedownData = await pipedownRes.json();
    assert(pipedownData.title.toLowerCase() === "pipedown", "GET /api/releases/pipedown returns project 'pipedown'");

    // Social share endpoint alias resolution
    const shareAliasRes = await fetch(`${API_BASE}/api/share/release/bite-me`);
    assert(shareAliasRes.status === 200, "GET /api/share/release/bite-me resolves to HTTP 200");
    const shareAliasHtml = await shareAliasRes.text();
    assert(shareAliasHtml.includes("/release/pipedown"), "Share endpoint for legacy slug points to canonical URL /release/pipedown");

    // Beats catalogue normalization: genre and short_genre
    const beatsRes = await fetch(`${API_BASE}/api/beats`);
    assert(beatsRes.status === 200, "GET /api/beats returns HTTP 200");
    const beats = await beatsRes.json();
    assert(Array.isArray(beats) && beats.length >= 12, `Total live beats preserved: ${beats.length} (>= 12)`);

    let allBeatsNormalized = true;
    for (const b of beats) {
      if (b.genre && !b.genre.endsWith(" TYPE BEAT")) {
        allBeatsNormalized = false;
        console.error(`    Beat ${b.id} genre not ending with TYPE BEAT: ${b.genre}`);
      }
      if (b.short_genre && /\s+X\s+/.test(b.short_genre)) {
        allBeatsNormalized = false;
        console.error(`    Beat ${b.id} short_genre contains uppercase 'X': ${b.short_genre}`);
      }
    }
    assert(allBeatsNormalized, "All beats have genre ending with 'TYPE BEAT' and lowercase 'x' separator");

    const shineBeat = beats.find((b) => b.id === "shine" || b.slug === "shine");
    assert(Boolean(shineBeat), "Beat 'shine' exists in beats catalogue");
    assert(shineBeat?.genre === "AFRO x ALTERNATIVE TYPE BEAT", "Beat 'shine' genre is 'AFRO x ALTERNATIVE TYPE BEAT'", shineBeat?.genre);
    const shineShortGenre = shineBeat?.shortGenre || shineBeat?.short_genre;
    assert(shineShortGenre === "AFRO x ALTERNATIVE", "Beat 'shine' short_genre is 'AFRO x ALTERNATIVE'", shineShortGenre);

    // Audio streaming 206 Partial Content verification
    if (track1?.preview_audio_url) {
      const mediaUrl = track1.preview_audio_url.startsWith("http")
        ? track1.preview_audio_url
        : `${API_BASE}${track1.preview_audio_url}`;
      const audioRes = await fetch(mediaUrl, {
        headers: { Range: "bytes=0-1023" },
      });
      assert(audioRes.status === 206, "Preview audio endpoint supports HTTP 206 Partial Content");
      assert(audioRes.headers.get("accept-ranges") === "bytes", "Preview audio advertises Accept-Ranges: bytes");
    }
  } catch (err) {
    console.error("Worker API check error:", err);
    failed++;
  }

  // -----------------------------------------------------------------
  // 2. LIVE FRONTEND & STATIC ROUTE CHECKS
  // -----------------------------------------------------------------
  console.log("\n--- 2. Live Frontend Route Checks ---");
  try {
    const homeRes = await fetch(`${FRONTEND_BASE}/`);
    assert(homeRes.status === 200, "GET / (Homepage) returns HTTP 200");

    const pipedownPageRes = await fetch(`${FRONTEND_BASE}/release/pipedown`);
    assert(pipedownPageRes.status === 200, "GET /release/pipedown returns HTTP 200");
    const pipedownHtml = await pipedownPageRes.text();
    assert(pipedownHtml.includes("pipedown"), "Frontend /release/pipedown contains 'pipedown'");

    const beatsHubRes = await fetch(`${FRONTEND_BASE}/beats`);
    assert(beatsHubRes.status === 200, "GET /beats returns HTTP 200");

    const privacyRes = await fetch(`${FRONTEND_BASE}/privacy`);
    assert(privacyRes.status === 200, "GET /privacy returns HTTP 200");

    const cookiesRes = await fetch(`${FRONTEND_BASE}/cookies`);
    assert(cookiesRes.status === 200, "GET /cookies returns HTTP 200");

    const termsRes = await fetch(`${FRONTEND_BASE}/terms`);
    assert(termsRes.status === 200, "GET /terms returns HTTP 200");
  } catch (err) {
    console.error("Frontend check error:", err);
    failed++;
  }

  // -----------------------------------------------------------------
  // 3. CODEBASE RECONCILIATION & ARCHITECTURE CHECKS
  // -----------------------------------------------------------------
  console.log("\n--- 3. Codebase Architectural Assertions ---");

  // Legal transparency disclosures
  const legalCode = fs.readFileSync(path.join(__dirname, "../src/pages/LegalPages.jsx"), "utf8");
  assert(
    legalCode.includes("silachomka_cookie_consent_v1"),
    "LegalPages.jsx explicitly discloses silachomka_cookie_consent_v1 storage key"
  );
  assert(
    legalCode.includes("chomka_preferred_currency") && legalCode.includes("chomka_beat_playback_mode"),
    "LegalPages.jsx explicitly discloses chomka_preferred_currency and chomka_beat_playback_mode"
  );

  // CSS text-transform protection: prevents CSS from turning lowercase 'x' into uppercase 'X'
  const css = fs.readFileSync(path.join(__dirname, "../src/App.css"), "utf8");
  assert(
    css.includes("text-transform: none !important") && css.includes(".beat-genre"),
    "App.css enforces text-transform: none !important on beat-genre and type badges"
  );
  assert(
    css.includes(".ambient-video-layer"),
    "App.css includes .ambient-video-layer styling for video ambient backdrop"
  );

  // ReleasePage legacy slug redirect and unreleased track masking
  const releasePageCode = fs.readFileSync(path.join(__dirname, "../src/components/ReleasePage.jsx"), "utf8");
  assert(
    releasePageCode.includes("navigate(`/release/${data.slug}`, { replace: true })"),
    "ReleasePage.jsx redirects legacy slug (e.g. bite-me) to canonical slug (e.g. pipedown)"
  );
  assert(
    releasePageCode.includes("isUnreleased={isFuture}"),
    "ReleasePage.jsx passes isUnreleased={isFuture} to TrackRow"
  );
  assert(
    releasePageCode.includes("cookiePrefs?.embeddedMedia"),
    "ReleasePage.jsx gates Spotify embed on cookiePrefs.embeddedMedia"
  );

  // BeatsPage repeat modes
  const beatsPageCode = fs.readFileSync(path.join(__dirname, "../src/pages/BeatsPage.jsx"), "utf8");
  assert(
    beatsPageCode.includes("repeatModeRef.current") &&
      beatsPageCode.includes('mode === "one"') &&
      beatsPageCode.includes('mode === "all"'),
    "BeatsPage.jsx handles repeat modes ('one', 'all', 'none') in handleEnded without playback mode conflicts"
  );

  // BeatDetailPage repeat modes and ambient backdrop
  const beatDetailCode = fs.readFileSync(path.join(__dirname, "../src/pages/BeatDetailPage.jsx"), "utf8");
  assert(
    beatDetailCode.includes("handleTrackFinish"),
    "BeatDetailPage.jsx unifies track finish into handleTrackFinish without conflicting timers"
  );
  assert(
    beatDetailCode.includes("ambientArtworkUrl"),
    "BeatDetailPage.jsx defines robust ambientArtworkUrl supporting both new and legacy beats"
  );

  // Draft autosave flush on unmount / beforeunload and List view resume banner
  const draftAutosaveCode = fs.readFileSync(path.join(__dirname, "../src/utils/useDraftAutosave.js"), "utf8");
  assert(
    draftAutosaveCode.includes("flushDraft") && draftAutosaveCode.includes("beforeunload"),
    "useDraftAutosave.js flushes dirty drafts on beforeunload and unmount"
  );
  assert(
    draftAutosaveCode.includes("DraftListResumeBanner") && draftAutosaveCode.includes("useExistingDraft"),
    "useDraftAutosave.js exports DraftListResumeBanner and useExistingDraft for admin list views"
  );

  // Admin pages list view resume banner and save as draft
  for (const pageName of ["AdminMusicPage.jsx", "AdminBeatsPage.jsx", "AdminGalleryPage.jsx", "AdminVideosPage.jsx"]) {
    const code = fs.readFileSync(path.join(__dirname, `../src/pages/admin/${pageName}`), "utf8");
    assert(
      code.includes("DraftListResumeBanner"),
      `${pageName} includes DraftListResumeBanner in list view`
    );
    assert(
      code.includes("Save as Draft"),
      `${pageName} includes explicit 'Save as Draft' action`
    );
  }

  // Recycle Bin refreshCatalogue
  const recycleBinCode = fs.readFileSync(path.join(__dirname, "../src/pages/admin/AdminRecycleBinPage.jsx"), "utf8");
  assert(
    recycleBinCode.includes("refreshCatalogue") && recycleBinCode.includes("restoreItem"),
    "AdminRecycleBinPage.jsx calls refreshCatalogue() upon restore and deletion"
  );

  // Social Post Embed cookie gating
  const socialEmbedCode = fs.readFileSync(path.join(__dirname, "../src/components/SocialPostEmbed.jsx"), "utf8");
  assert(
    socialEmbedCode.includes("cookiePrefs?.embeddedMedia"),
    "SocialPostEmbed.jsx gates external iframes on cookiePrefs.embeddedMedia"
  );

  console.log(`\n=================================================`);
  console.log(` STAGE 28 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`=================================================`);
  if (failed > 0) process.exit(1);
}

verifyStage28().catch((err) => {
  console.error(err);
  process.exit(1);
});

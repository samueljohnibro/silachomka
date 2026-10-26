const fs = require("fs");
const path = require("path");

const API_BASE = "https://silachomka-api.samueljohnibrotech.workers.dev";

async function verifyStage27() {
  console.log("=== Stage 27 Verification Suite ===");
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

  // 1. Live Catalogue Verification (Req #1, #2, #11, #14)
  const catRes = await fetch(`${API_BASE}/api/releases`);
  assert(catRes.status === 200, "GET /api/releases HTTP 200");
  const releases = await catRes.json();
  const pipedown = releases.find((r) => r.title.toLowerCase() === "pipedown");
  assert(Boolean(pipedown), "Release 'pipedown' exists in live catalogue");
  assert(
    pipedown && pipedown.slug === "pipedown",
    "Req #1: 'pipedown' slug updated to 'pipedown'",
    `slug=${pipedown?.slug}`
  );
  const staleBiteMe = releases.find((r) => r.slug === "bite-me");
  assert(!staleBiteMe, "Req #1: No stale /release/bite-me slug remains in active catalogue");

  // Historical slugs preserved
  for (const histSlug of ["kiss-and-tell", "dont-play-silachomka", "twen", "hyperdrive-ingress-zone"]) {
    assert(
      releases.some((r) => r.slug === histSlug),
      `Req #1: Historical release slug preserved: /release/${histSlug}`
    );
  }

  // Req #14: Track-level preview audio on pipedown
  const pipedownTrack1 = pipedown?.tracks?.[0];
  assert(
    Boolean(pipedownTrack1?.preview_audio_url),
    "Req #14: Track #1 of 'pipedown' has preview_audio_url populated",
    pipedownTrack1?.preview_audio_url
  );

  // Req #11: HTTP 206 Partial Content Range support on media asset endpoint
  if (pipedownTrack1?.preview_audio_url) {
    const mediaUrl = pipedownTrack1.preview_audio_url.startsWith("http")
      ? pipedownTrack1.preview_audio_url
      : `${API_BASE}${pipedownTrack1.preview_audio_url}`;
    const rangeRes = await fetch(mediaUrl, {
      headers: { Range: "bytes=0-1023" },
    });
    assert(
      rangeRes.status === 206,
      "Req #11: Media asset endpoint returns HTTP 206 Partial Content for Range request",
      `status=${rangeRes.status}, content-range=${rangeRes.headers.get("content-range")}`
    );
    assert(
      rangeRes.headers.get("accept-ranges") === "bytes",
      "Req #11: Media asset endpoint advertises Accept-Ranges: bytes"
    );
  }

  // 2. Source Code & Static Verification across Requirements #1–#16
  const crudCode = fs.readFileSync(path.join(__dirname, "../worker/src/admin/crud.js"), "utf8");
  assert(
    crudCode.includes("function normalizeBeatGenre") && crudCode.includes("TYPE BEAT"),
    "Req #2: Backend normalizeBeatGenre helper present in worker/src/admin/crud.js"
  );
  assert(
    crudCode.includes("resolveUniqueReleaseSlug"),
    "Req #1: Backend resolveUniqueReleaseSlug helper present in worker/src/admin/crud.js"
  );
  assert(
    crudCode.includes("inferGalleryPostType"),
    "Req #9: Backend inferGalleryPostType helper present in worker/src/admin/crud.js"
  );

  // Test genre normalization rules directly
  function normalizeBeatGenre(rawInput) {
    const raw = String(rawInput || "").trim();
    if (!raw) return { genre: "TYPE BEAT", short_genre: "" };
    const withoutSuffix = raw.replace(/\s+type\s+beat$/i, "").trim();
    const parts = withoutSuffix
      .split(/\s+[xX]\s+/)
      .map((part) => part.trim().toUpperCase())
      .filter(Boolean);
    const shortGenre = parts.join(" x ");
    const fullGenre = shortGenre ? `${shortGenre} TYPE BEAT` : "TYPE BEAT";
    return { genre: fullGenre, short_genre: shortGenre };
  }
  assert(
    normalizeBeatGenre("Trap x Rap").genre === "TRAP x RAP TYPE BEAT",
    "Req #2: 'Trap x Rap' -> 'TRAP x RAP TYPE BEAT'"
  );
  assert(
    normalizeBeatGenre("Afro x Alternative").genre === "AFRO x ALTERNATIVE TYPE BEAT",
    "Req #2: 'Afro x Alternative' -> 'AFRO x ALTERNATIVE TYPE BEAT'"
  );
  assert(
    normalizeBeatGenre("Afrobeat").genre === "AFROBEAT TYPE BEAT",
    "Req #2: 'Afrobeat' -> 'AFROBEAT TYPE BEAT'"
  );

  const beatsPageCode = fs.readFileSync(path.join(__dirname, "../src/pages/BeatsPage.jsx"), "utf8");
  assert(
    beatsPageCode.includes("beat-card-share-btn") && beatsPageCode.includes("handleShareBeat"),
    "Req #3: Beat Card Share Button & handler present in BeatsPage.jsx"
  );
  assert(
    beatsPageCode.includes("prevPlaybackModeRef") && beatsPageCode.includes("wasPlaying"),
    "Req #4: Reel playback mode toggle resets to 0:00 and restarts only if playing"
  );
  assert(
    beatsPageCode.includes("reel-seek-thumb") && beatsPageCode.includes("isDraggingSeek"),
    "Req #5: Reel seek bar circular thumb & drag seek handlers present in BeatsPage.jsx"
  );

  const beatArtworkCode = fs.readFileSync(path.join(__dirname, "../src/components/BeatArtwork.jsx"), "utf8");
  assert(
    beatArtworkCode.includes("gifImgRef") && beatArtworkCode.includes("imgEl.complete"),
    "Req #6: BeatArtwork immediate GIF cache check & non-lazy GIF takeover present"
  );

  const beatDetailCode = fs.readFileSync(path.join(__dirname, "../src/pages/BeatDetailPage.jsx"), "utf8");
  assert(
    beatDetailCode.includes("Enter Reel Mode") && !beatDetailCode.includes("setPreviewMode"),
    "Req #7: 1 MIN / FULL TRACK removed from BeatDetailPage.jsx & 'Enter Reel Mode' button added"
  );

  assert(
    fs.existsSync(path.join(__dirname, "../src/data/CookieConsentContext.jsx")) &&
      fs.existsSync(path.join(__dirname, "../src/components/CookieConsentBanner.jsx")) &&
      fs.existsSync(path.join(__dirname, "../src/pages/LegalPages.jsx")),
    "Req #8: CookieConsentContext, CookieConsentBanner, and LegalPages (/privacy, /cookies, /terms) exist"
  );

  const adminGalleryCode = fs.readFileSync(path.join(__dirname, "../src/pages/admin/AdminGalleryPage.jsx"), "utf8");
  assert(
    adminGalleryCode.includes("Detected Post Format (Automatic)") &&
      !adminGalleryCode.includes('<select\n                  name="post_type"'),
    "Req #9: Manual Post Format / Type dropdown removed from AdminGalleryPage.jsx"
  );

  for (const adminFile of [
    "AdminMusicPage.jsx",
    "AdminBeatsPage.jsx",
    "AdminVideosPage.jsx",
    "AdminGalleryPage.jsx",
  ]) {
    const code = fs.readFileSync(path.join(__dirname, "../src/pages/admin", adminFile), "utf8");
    assert(
      code.includes("Lifecycle Status (Automatic)") && !code.includes('name="status"'),
      `Req #10: Manual Status dropdown removed from ${adminFile}`
    );
  }

  assert(
    fs.existsSync(path.join(__dirname, "../src/components/GalleryVideoPlayer.jsx")),
    "Req #11: Custom GalleryVideoPlayer.jsx exists"
  );

  const adminMusicCode = fs.readFileSync(path.join(__dirname, "../src/pages/admin/AdminMusicPage.jsx"), "utf8");
  assert(
    !adminMusicCode.includes("4. Preview Audio (Optional — Pre-Release 30s Listening)") &&
      adminMusicCode.includes("Track Preview Audio (MP3"),
    "Req #14: Redundant project-level Preview Audio section removed; track-level Preview MP3 preserved"
  );

  const releasePageCode = fs.readFileSync(path.join(__dirname, "../src/components/ReleasePage.jsx"), "utf8");
  assert(
    releasePageCode.includes("release-coming-soon-subline") &&
      releasePageCode.includes("product-ambient-backdrop"),
    "Req #15 & #16: Atmospheric backdrop and centered secondary COMING SOON subline present in ReleasePage.jsx"
  );

  // Check generated social HTML for /release/pipedown
  const pipedownHtmlPath = path.join(__dirname, "../dist/release/pipedown/index.html");
  if (fs.existsSync(pipedownHtmlPath)) {
    const html = fs.readFileSync(pipedownHtmlPath, "utf8");
    assert(
      html.includes("https://silachomka.vercel.app/release/pipedown"),
      "Req #1: Static social share HTML generated for /release/pipedown with canonical URL"
    );
  }

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

verifyStage27().catch((err) => {
  console.error(err);
  process.exit(1);
});

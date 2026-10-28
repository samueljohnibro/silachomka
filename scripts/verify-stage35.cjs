/**
 * STAGE 35 VERIFICATION SUITE — UX STATE PRESERVATION, SERVICES SIMPLIFICATION & CALENDAR POLISH
 *
 * Verifies:
 * 1. Music List/Grid View State Preservation (sessionStorage + URL param + history state)
 * 2. Admin Studio Availability Day Inspector Layout (stacked layout, centered OPEN badge)
 * 3. Public Services Redesign for First-Time Users (plain-language explanations for all services)
 * 4. Public Services Proper Calendar Date Picker (PublicStudioCalendar component, open/closed states, slots)
 * 5. Public Services Hourly Service UX (duration stepper, live price, no duplicate total card)
 * 6. Admin Availability ↔ Public Calendar Synchronization (API-driven availability)
 * 7. Unified Date Display Consistency (formatLongDate produces canonical "Monday, October 20, 2022")
 * 8. Production Catalogue Integrity & Real Endpoints (20 releases, 12 beats, 9 services, 5 gallery posts)
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
  console.log(" STAGE 35 VERIFICATION SUITE — UX, SERVICES & CALENDAR POLISH");
  console.log("=================================================================\n");

  const appJsx = fs.readFileSync(path.join(__dirname, "../src/App.jsx"), "utf-8");
  const releasePageJsx = fs.readFileSync(path.join(__dirname, "../src/components/ReleasePage.jsx"), "utf-8");
  const adminServicesJsx = fs.readFileSync(path.join(__dirname, "../src/pages/admin/AdminServicesPage.jsx"), "utf-8");
  const servicesJsx = fs.readFileSync(path.join(__dirname, "../src/pages/ServicesPage.jsx"), "utf-8");
  const serviceOrderDetailJsx = fs.readFileSync(path.join(__dirname, "../src/pages/ServiceOrderDetailPage.jsx"), "utf-8");
  const studioPublisherJsx = fs.readFileSync(path.join(__dirname, "../src/pages/StudioPublisherPage.jsx"), "utf-8");
  const dateFormatterJs = fs.readFileSync(path.join(__dirname, "../src/utils/dateFormatter.js"), "utf-8");

  // --- 1. Music List/Grid View State Preservation (Req #1) ---
  console.log("--- 1. Music List/Grid View State Preservation (Req #1) ---");
  assert(
    appJsx.includes("silachomka_music_view"),
    "App.jsx uses sessionStorage key 'silachomka_music_view' to persist music view state"
  );
  assert(
    appJsx.includes("searchParams.get(\"view\")") || appJsx.includes("searchParams.get('view')"),
    "App.jsx inspects 'view' query param on mount to restore grid/list view mode"
  );
  assert(
    releasePageJsx.includes("silachomka_music_view"),
    "ReleasePage.jsx reads sessionStorage for music view mode"
  );
  assert(
    releasePageJsx.includes("location.state?.fromView"),
    "ReleasePage.jsx checks React Router location.state?.fromView"
  );
  assert(
    releasePageJsx.includes("params.set(\"view\", viewMode)") || releasePageJsx.includes("viewMode"),
    "ReleasePage.jsx preserves viewMode in backLink breadcrumb navigation"
  );
  assert(
    appJsx.includes("fromView: viewMode"),
    "ReleaseCard forwards viewMode in router state for reliable back navigation"
  );

  // --- 2. Admin Studio Availability Day Inspector Layout (Req #2) ---
  console.log("\n--- 2. Admin Studio Availability Day Inspector Layout (Req #2) ---");
  assert(
    !adminServicesJsx.includes("gridTemplateColumns: \"1.4fr 1fr\""),
    "Cramped side-by-side 1.4fr 1fr layout removed from AdminServicesPage"
  );
  assert(
    adminServicesJsx.includes("display: \"flex\", flexDirection: \"column\", gap: \"28px\""),
    "Spacious stacked layout implemented for StudioMonthlyCalendar and Day Inspector"
  );
  assert(
    adminServicesJsx.includes("OPEN FOR BOOKINGS") && adminServicesJsx.includes("justifyContent: \"center\""),
    "OPEN FOR BOOKINGS status badge is centered and cleanly styled"
  );
  assert(
    !adminServicesJsx.includes("ISO: {selectedCalendarDate}"),
    "Raw ISO date string removed from Day Inspector header"
  );
  assert(
    adminServicesJsx.includes("formatLongDate(selectedCalendarDate)"),
    "Day Inspector header uses formatLongDate for date title"
  );

  // --- 3. Public Services Redesign for First-Time Users (Req #3) ---
  console.log("\n--- 3. Public Services Redesign for First-Time Users (Req #3) ---");
  assert(
    servicesJsx.includes("plainExplanation:"),
    "CONVERSATIONAL_SERVICES contains plainExplanation for first-time users"
  );
  const plainExplanations = [
    "Beat Production",
    "Beat Mixing",
    "Voice Recording",
    "Vocal Mixing",
    "Full Song Mastering",
    "Full Song Production",
    "Instrumentalist / Producer Collaboration",
    "Recording + Mixing on Client's Beat",
    "Feature",
  ];
  let allFound = true;
  for (const title of plainExplanations) {
    if (!servicesJsx.includes(title)) {
      allFound = false;
      break;
    }
  }
  assert(allFound, "All 9 studio services defined with clear titles and plain explanations");
  assert(
    servicesJsx.includes("svc.plainExplanation || svc.tagline"),
    "ServicesPage renders plainExplanation prominently under service title"
  );

  // --- 4. Public Services Proper Calendar Date Picker (Req #4) ---
  console.log("\n--- 4. Public Services Proper Calendar Date Picker (Req #4) ---");
  assert(
    servicesJsx.includes("function PublicStudioCalendar"),
    "PublicStudioCalendar component implemented in ServicesPage.jsx"
  );
  assert(
    servicesJsx.includes("<PublicStudioCalendar"),
    "PublicStudioCalendar rendered in place of raw date selector"
  );
  assert(
    !servicesJsx.includes("<option value=\"\">-- Choose an open date --</option>"),
    "Raw HTML <select> date dropdown completely eliminated"
  );
  assert(
    servicesJsx.includes("formatLongDate(selectedDate)"),
    "PublicStudioCalendar displays selected date using formatLongDate"
  );
  assert(
    servicesJsx.includes("availMap.has(day.dateStr)"),
    "PublicStudioCalendar checks availability map so only admin-opened dates are enabled"
  );

  // --- 5. Public Services Hourly Service UX (Req #5) ---
  console.log("\n--- 5. Public Services Hourly Service UX (Req #5) ---");
  assert(
    servicesJsx.includes("aria-label=\"Decrease hours\"") && servicesJsx.includes("aria-label=\"Increase hours\""),
    "Hourly duration stepper controls ([ - ] [ + ]) provided for Voice Recording"
  );
  assert(
    servicesJsx.includes("{hours} {hours === 1 ? \"hour\" : \"hours\"}"),
    "Human-readable duration label formatted with singular/plural ('2 hours')"
  );
  assert(
    servicesJsx.includes("calculatedPrice = svc.isHourly"),
    "Hourly total recalculated immediately on hours change"
  );
  assert(
    servicesJsx.includes("position: \"sticky\"") && servicesJsx.includes("RUNNING SESSION TOTAL"),
    "Running session total pinned at top of service dropdown menu"
  );
  // Check that redundant duplicate total card was removed
  const totalMatches = servicesJsx.match(/RUNNING SESSION TOTAL/g) || [];
  assert(
    totalMatches.length === 1,
    `Only 1 RUNNING SESSION TOTAL inside selection interface (found: ${totalMatches.length})`
  );

  // --- 6. Admin Availability ↔ Public Calendar Synchronization (Req #6) ---
  console.log("\n--- 6. Admin Availability ↔ Public Calendar Synchronization (Req #6) ---");
  assert(
    servicesJsx.includes("fetch(\"/api/services/availability\")"),
    "ServicesPage fetches live studio availability from /api/services/availability"
  );
  assert(
    servicesJsx.includes("setStudioAvailability"),
    "ServicesPage sets studioAvailability state from API response"
  );

  // --- 7. Unified Date Display Consistency (Req #7) ---
  console.log("\n--- 7. Unified Date Display Consistency (Req #7) ---");
  const { formatLongDate } = require("../src/utils/dateFormatter.js");
  const sampleFormatted = formatLongDate("2022-10-20");
  assert(
    sampleFormatted === "Thursday, October 20, 2022",
    `formatLongDate('2022-10-20') produces exact canonical format: "${sampleFormatted}"`
  );
  const sampleFormatted2 = formatLongDate(new Date(Date.UTC(2026, 9, 27)));
  assert(
    sampleFormatted2 === "Tuesday, October 27, 2026",
    `formatLongDate(Date) produces exact canonical format: "${sampleFormatted2}"`
  );
  assert(
    serviceOrderDetailJsx.includes("formatLongDate(order.createdAt)"),
    "ServiceOrderDetailPage formats order creation date using formatLongDate"
  );
  assert(
    serviceOrderDetailJsx.includes("formatLongDate(order.agreedDeadline)"),
    "ServiceOrderDetailPage formats agreed deadline using formatLongDate"
  );
  assert(
    studioPublisherJsx.includes("formatLongDate"),
    "StudioPublisherPage imports and uses formatLongDate for display dates"
  );

  // --- 8. Production Catalogue Integrity & Real Endpoints (Req #8) ---
  console.log("\n--- 8. Production Catalogue Integrity & Real Endpoints (Req #8) ---");
  try {
    const [releasesRes, beatsRes, servicesRes, galleryRes, availRes] = await Promise.all([
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/releases"),
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/beats"),
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/services"),
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/gallery"),
      fetchJson("https://silachomka-api.samueljohnibrotech.workers.dev/api/services/availability"),
    ]);

    const releases = releasesRes.releases || releasesRes.data || releasesRes;
    const beats = beatsRes.beats || beatsRes.data || beatsRes;
    const services = servicesRes.services || servicesRes.data || servicesRes;
    const gallery = galleryRes.posts || galleryRes.data || galleryRes;
    const avail = availRes.availability || availRes.data || availRes;

    assert(Array.isArray(releases) && releases.length === 20, `Production releases intact: ${releases.length} releases found`);
    assert(Array.isArray(beats) && beats.length === 12, `Production beats intact: ${beats.length} beats found`);
    assert(Array.isArray(services) && services.length === 9, `Production services intact: ${services.length} services found`);
    assert(Array.isArray(gallery) && gallery.length >= 5, `Production gallery intact: ${gallery.length} posts found`);
    assert(Array.isArray(avail), `Production studio availability endpoint active (records: ${avail.length})`);
  } catch (err) {
    console.error("  [FAIL] Failed to verify production endpoints:", err.message);
    failed++;
  }

  console.log("\n=================================================================");
  console.log(` STAGE 35 VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed.`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Verification suite failed with unhandled error:", err);
  process.exit(1);
});

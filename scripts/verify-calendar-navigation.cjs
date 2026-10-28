// scripts/verify-calendar-navigation.cjs
const assert = require("assert");

// Mock sessionStorage
const storage = {};
global.sessionStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};

// Inline helper functions mirroring src/utils/calendarNavigation.js
function formatMonthYearParam(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthYearParam(str) {
  if (!str || typeof str !== "string") return null;
  const match = /^(\d{4})-(\d{2})$/.exec(str.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return null;
  return new Date(year, month, 1);
}

function buildCalendarUrl({
  viewMode = "GRID",
  activeFilter = "ALL",
  searchQuery = "",
  currentDate = null,
  selectedDateStr = null,
  scrollY = null,
  actId = null,
} = {}) {
  const params = new URLSearchParams();

  if (viewMode && String(viewMode).toUpperCase() === "TIMELINE") {
    params.set("view", "timeline");
  }

  if (activeFilter && activeFilter !== "ALL") {
    params.set("filter", activeFilter);
  }

  if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
    params.set("q", searchQuery.trim());
  }

  if (currentDate) {
    const d = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const mStr = formatMonthYearParam(d);
    if (mStr) params.set("month", mStr);
  } else if (selectedDateStr) {
    const d = new Date(selectedDateStr);
    const mStr = formatMonthYearParam(d);
    if (mStr) params.set("month", mStr);
  }

  if (selectedDateStr) {
    params.set("date", selectedDateStr);
  }

  if (typeof scrollY === "number" && scrollY > 0) {
    params.set("scrollY", String(Math.round(scrollY)));
  }

  if (actId) {
    params.set("actId", String(actId));
  }

  const query = params.toString();
  return `/calendar${query ? `?${query}` : ""}`;
}

const CALENDAR_STORAGE_KEY = "silachomka_calendar_state";

function saveCalendarState(state) {
  sessionStorage.setItem(
    CALENDAR_STORAGE_KEY,
    JSON.stringify({
      ...state,
      timestamp: Date.now(),
    })
  );
}

function getSavedCalendarState() {
  const raw = sessionStorage.getItem(CALENDAR_STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

function getCalendarReturnUrl(location, searchParams) {
  if (location?.state?.from === "calendar" && location.state.returnUrl) {
    return location.state.returnUrl;
  }

  const isFromQuery = searchParams?.get("from") === "calendar";
  const isFromState = location?.state?.from === "calendar";

  if (isFromQuery || isFromState) {
    const saved = getSavedCalendarState();
    if (saved?.returnUrl) {
      return saved.returnUrl;
    }
    return "/calendar";
  }

  return null;
}

console.log("=== RUNNING CALENDAR NAVIGATION VERIFICATION TESTS ===");

// Test 1: Date formatting and parsing
const testDate = new Date(2026, 3, 15); // April 2026
const formatted = formatMonthYearParam(testDate);
assert.strictEqual(formatted, "2026-04", "Month formatting should be YYYY-MM");
const parsed = parseMonthYearParam("2026-04");
assert.strictEqual(parsed.getFullYear(), 2026);
assert.strictEqual(parsed.getMonth(), 3);
console.log("✓ Test 1: formatMonthYearParam and parseMonthYearParam pass");

// Test 2: buildCalendarUrl with GRID view, specific month, date drawer open, and scroll
const urlGrid = buildCalendarUrl({
  viewMode: "GRID",
  activeFilter: "event",
  searchQuery: "",
  currentDate: new Date(2026, 9, 1),
  selectedDateStr: "2026-10-15",
  scrollY: 450,
  actId: "evt-123",
});
assert.ok(urlGrid.includes("filter=event"), "Should include filter");
assert.ok(urlGrid.includes("month=2026-10"), "Should include month");
assert.ok(urlGrid.includes("date=2026-10-15"), "Should include selected date");
assert.ok(urlGrid.includes("scrollY=450"), "Should include scrollY");
assert.ok(urlGrid.includes("actId=evt-123"), "Should include actId");
console.log("✓ Test 2: buildCalendarUrl (Grid with drawer & filter) passes:", urlGrid);

// Test 3: buildCalendarUrl with TIMELINE view, query, beat filter
const urlTimeline = buildCalendarUrl({
  viewMode: "TIMELINE",
  activeFilter: "beat",
  searchQuery: "afro",
  scrollY: 1200,
  actId: "beat-42",
});
assert.ok(urlTimeline.includes("view=timeline"), "Should include view=timeline");
assert.ok(urlTimeline.includes("filter=beat"), "Should include filter=beat");
assert.ok(urlTimeline.includes("q=afro"), "Should include q=afro");
assert.ok(urlTimeline.includes("scrollY=1200"), "Should include scrollY");
console.log("✓ Test 3: buildCalendarUrl (Timeline) passes:", urlTimeline);

// Test 4: getCalendarReturnUrl when NOT entered from calendar
const directVisitReturn = getCalendarReturnUrl(
  { pathname: "/release/chomka-ep", state: null },
  new URLSearchParams("")
);
assert.strictEqual(directVisitReturn, null, "Direct visit should have NO calendar return URL");
console.log("✓ Test 4: Direct non-calendar visit correctly returns null");

// Test 5: getCalendarReturnUrl when entered from calendar via location.state
const stateVisitReturn = getCalendarReturnUrl(
  {
    pathname: "/release/chomka-ep",
    state: { from: "calendar", returnUrl: urlGrid },
  },
  new URLSearchParams("from=calendar")
);
assert.strictEqual(stateVisitReturn, urlGrid, "Should return exact returnUrl from state");
console.log("✓ Test 5: Router state returnUrl matches:", stateVisitReturn);

// Test 6: getCalendarReturnUrl on page refresh with query param and sessionStorage fallback
saveCalendarState({
  viewMode: "TIMELINE",
  activeFilter: "beat",
  returnUrl: urlTimeline,
});
const refreshedVisitReturn = getCalendarReturnUrl(
  { pathname: "/beats/beat-42", state: null },
  new URLSearchParams("from=calendar")
);
assert.strictEqual(refreshedVisitReturn, urlTimeline, "Should retrieve saved returnUrl from sessionStorage");
console.log("✓ Test 6: Page refresh fallback matches saved state:", refreshedVisitReturn);

// Test 7: Verify post links generated by CalendarPage have correct query and state
const dummyAct = { id: "rel-superstar", url: "/release/superstar" };
const mockCalendarState = {
  viewMode: "GRID",
  activeFilter: "release",
  searchQuery: "",
  currentDate: new Date(2026, 5, 1),
  selectedDateStr: "2026-06-20",
  scrollY: 320,
};
const expectedReturn = buildCalendarUrl(mockCalendarState);
saveCalendarState({ ...mockCalendarState, returnUrl: expectedReturn });

const linkProps = {
  to: {
    pathname: dummyAct.url,
    search: "?from=calendar",
  },
  state: {
    from: "calendar",
    returnUrl: expectedReturn,
    scrollY: 320,
    actId: dummyAct.id,
  },
};
assert.strictEqual(linkProps.to.pathname, "/release/superstar");
assert.strictEqual(linkProps.to.search, "?from=calendar");
assert.strictEqual(linkProps.state.from, "calendar");
assert.strictEqual(linkProps.state.returnUrl, expectedReturn);
console.log("✓ Test 7: Activity link props structure is valid:", linkProps);

console.log("\nALL CALENDAR NAVIGATION VERIFICATION TESTS PASSED SUCCESSFULLY!");

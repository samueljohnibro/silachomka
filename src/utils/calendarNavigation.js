// src/utils/calendarNavigation.js

const CALENDAR_STORAGE_KEY = "silachomka_calendar_state";

/**
 * Formats a Date object to "YYYY-MM" string for searchParams.
 */
export function formatMonthYearParam(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Parses a "YYYY-MM" string into a Date object (1st day of that month).
 */
export function parseMonthYearParam(str) {
  if (!str || typeof str !== "string") return null;
  const match = /^(\d{4})-(\d{2})$/.exec(str.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return null;
  return new Date(year, month, 1);
}

/**
 * Constructs the canonical calendar URL with all query parameters preserving the exact view,
 * month, selected date, filter, search query, and scroll offset.
 */
export function buildCalendarUrl({
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

/**
 * Saves current calendar state to sessionStorage for robust fallback across refreshes.
 */
export function saveCalendarState(state) {
  try {
    sessionStorage.setItem(
      CALENDAR_STORAGE_KEY,
      JSON.stringify({
        ...state,
        timestamp: Date.now(),
      })
    );
  } catch (err) {
    console.warn("Could not save calendar state to sessionStorage:", err);
  }
}

/**
 * Retrieves the saved calendar state from sessionStorage.
 */
export function getSavedCalendarState() {
  try {
    const raw = sessionStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears saved calendar state.
 */
export function clearCalendarState() {
  try {
    sessionStorage.removeItem(CALENDAR_STORAGE_KEY);
  } catch {}
}

/**
 * Determines whether the user entered the current page specifically from the calendar,
 * and if so, returns the exact return URL to restore the user's previous calendar view.
 * If not entered from the calendar, returns null.
 */
export function getCalendarReturnUrl(location, searchParams) {
  // 1. Explicit router state returnUrl
  if (location?.state?.from === "calendar" && location.state.returnUrl) {
    return location.state.returnUrl;
  }

  // 2. Query param ?from=calendar or state from === 'calendar'
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

/**
 * Unified Human-Readable Date Formatter
 * 
 * Formats any raw date, ISO timestamp, or date string into human-readable canonical format:
 * "Monday, October 20, 2022" ([Weekday], [Month] [Day], [Year])
 * 
 * Strictly prevents raw ISO strings like "2021-03-20T00:00:00.000Z" from displaying.
 */
export function formatLongDate(rawDate, fallback = "") {
  if (!rawDate) return fallback;

  // If already formatted like "Saturday, March 20, 2021", return directly
  if (
    typeof rawDate === "string" &&
    /^[A-Z][a-z]+,\s[A-Z][a-z]+\s\d{1,2},\s\d{4}$/.test(rawDate.trim())
  ) {
    return rawDate.trim();
  }

  try {
    const str = typeof rawDate === "string" ? rawDate.split("T")[0].split(" ")[0].trim() : "";
    const parts = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (parts) {
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      const day = parseInt(parts[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    }

    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    }

    return fallback || String(rawDate);
  } catch {
    return fallback || String(rawDate);
  }
}

export const formatGalleryDate = formatLongDate;

export function formatShortDate(rawDate, fallback = "") {
  if (!rawDate) return fallback;
  try {
    const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (isNaN(d.getTime())) return fallback || String(rawDate);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return fallback || String(rawDate);
  }
}

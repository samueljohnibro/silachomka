/**
 * Canonical Gallery Date Formatter
 * 
 * Formats any raw date, ISO timestamp, or date string into human-readable canonical format:
 * "Saturday, March 20, 2021"
 * 
 * Strictly prevents raw ISO strings like "2021-03-20T00:00:00.000Z" from displaying.
 */
export function formatGalleryDate(rawDate) {
  if (!rawDate) return "";

  // If already formatted like "Saturday, March 20, 2021", return directly
  if (
    typeof rawDate === "string" &&
    /^[A-Z][a-z]+,\s[A-Z][a-z]+\s\d{1,2},\s\d{4}$/.test(rawDate.trim())
  ) {
    return rawDate.trim();
  }

  try {
    const str = typeof rawDate === "string" ? rawDate.split("T")[0].split(" ")[0] : "";
    const parts = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    }

    return String(rawDate);
  } catch {
    return String(rawDate);
  }
}

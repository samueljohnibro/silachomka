// src/data/siteConfig.js
/**
 * Single source of truth for canonical site origin and absolute URL resolution.
 *
 * Current Production: https://silachomka.vercel.app
 * Future Production:  https://silachomka.com (when domain is purchased and mapped)
 *
 * To switch canonical origin in the future:
 * - Option A: Set VITE_SITE_ORIGIN in Vercel environment variables to "https://silachomka.com"
 * - Option B: Update DEFAULT_SITE_ORIGIN below
 */

export const DEFAULT_SITE_ORIGIN = "https://silachomka.vercel.app";

export const SITE_ORIGIN = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_ORIGIN) ||
  (typeof process !== "undefined" && process.env?.VITE_SITE_ORIGIN) ||
  DEFAULT_SITE_ORIGIN
).replace(/\/+$/, "");

/**
 * Resolves a canonical URL for SEO, Open Graph, and JSON-LD schema.
 * Always resolves against the authoritative SITE_ORIGIN rather than window.location.origin.
 */
export function canonicalUrl(pathname = "/") {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_ORIGIN}${path}`;
}

/**
 * Resolves an absolute URL, allowing client-side window.location override during local development if needed.
 */
export function absoluteUrl(pathname = "/") {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `${SITE_ORIGIN}${path}`;
}

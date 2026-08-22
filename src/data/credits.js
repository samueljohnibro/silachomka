export const DEFAULT_PRODUCER = "silachomka";
export const DEFAULT_SOURCE = "chomkaMUSIC™";
export const SITE_ORIGIN = "https://silachomka.com";

export function getTrackProducer(track) {
  const value = typeof track?.producer === "string" ? track.producer.trim() : "";
  return value || DEFAULT_PRODUCER;
}

export function getReleaseSource(release) {
  const value = typeof release?.source === "string" ? release.source.trim() : "";
  return value || DEFAULT_SOURCE;
}

export function getBeatProducer(beat) {
  const value = typeof beat?.producer === "string" ? beat.producer.trim() : "";
  return value || DEFAULT_PRODUCER;
}

export function getBeatSource(beat) {
  const value = typeof beat?.source === "string" ? beat.source.trim() : "";
  return value || DEFAULT_SOURCE;
}

export function absoluteUrl(pathname = "/") {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `${SITE_ORIGIN}${path}`;
}

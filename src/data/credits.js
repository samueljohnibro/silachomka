export const DEFAULT_PRODUCER = "silachomka";
export const DEFAULT_SOURCE = "chomkaMUSIC™";
export const SITE_ORIGIN = "https://silachomka.com";

export function formatCreditsList(items, defaultValue) {
  if (!items || items.length === 0) return defaultValue;
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

export function getTrackProducers(track) {
  if (Array.isArray(track?.producers) && track.producers.length > 0) return track.producers;
  if (typeof track?.producer === "string" && track.producer.trim()) return [track.producer.trim()];
  return [DEFAULT_PRODUCER];
}

export function getTrackProducerString(track) {
  return formatCreditsList(getTrackProducers(track), DEFAULT_PRODUCER);
}

export function getReleaseSources(release) {
  if (Array.isArray(release?.sources) && release.sources.length > 0) return release.sources;
  if (typeof release?.source === "string" && release.source.trim()) return [release.source.trim()];
  return [DEFAULT_SOURCE];
}

export function getReleaseSourceString(release) {
  return formatCreditsList(getReleaseSources(release), DEFAULT_SOURCE);
}

export function getBeatProducer(beat) {
  if (Array.isArray(beat?.producers) && beat.producers.length > 0) return formatCreditsList(beat.producers, DEFAULT_PRODUCER);
  const value = typeof beat?.producer === "string" ? beat.producer.trim() : "";
  return value || DEFAULT_PRODUCER;
}

export function getBeatSource(beat) {
  if (Array.isArray(beat?.sources) && beat.sources.length > 0) return formatCreditsList(beat.sources, DEFAULT_SOURCE);
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

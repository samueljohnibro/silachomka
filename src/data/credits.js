import { DEFAULT_SITE_ORIGIN, SITE_ORIGIN, canonicalUrl, absoluteUrl } from "./siteConfig.js";

export const DEFAULT_PRODUCER = "silachomka";
export const DEFAULT_SOURCE = "chomkaMUSIC™";
export { DEFAULT_SITE_ORIGIN, SITE_ORIGIN, canonicalUrl, absoluteUrl };

export function formatCreditsList(items, defaultValue) {
  if (!items || items.length === 0) return defaultValue;
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return defaultValue;
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} & ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")} & ${filtered[filtered.length - 1]}`;
}

export function getTrackProducers(track, release = null) {
  let list = [];

  // 1. Check track.producers
  if (Array.isArray(track?.producers) && track.producers.length > 0) {
    list = track.producers;
  } else if (typeof track?.producers === "string" && track.producers.trim()) {
    list = track.producers.split(/[,&]/).map((s) => s.trim());
  } else if (Array.isArray(track?.produced_by) && track.produced_by.length > 0) {
    list = track.produced_by;
  } else if (typeof track?.produced_by === "string" && track.produced_by.trim()) {
    list = track.produced_by.split(/[,&]/).map((s) => s.trim());
  } else if (typeof track?.producer === "string" && track.producer.trim()) {
    list = track.producer.split(/[,&]/).map((s) => s.trim());
  } else if (Array.isArray(track?.producer) && track.producer.length > 0) {
    list = track.producer;
  }

  // 2. Check track.credits (array, object or string)
  if (list.length === 0 && track?.credits) {
    if (Array.isArray(track.credits)) {
      track.credits.forEach((c) => {
        if (typeof c === "string") {
          const m = c.match(/produced\s+by\s+(.+)/i);
          if (m && m[1]) {
            list.push(...m[1].split(/[,&]/).map((s) => s.trim()));
          }
        } else if (c && typeof c === "object") {
          const role = (c.role || c.type || "").toLowerCase();
          if (role.includes("producer") && c.name) {
            list.push(c.name.trim());
          }
        }
      });
    } else if (typeof track.credits === "object") {
      const prod = track.credits.producer || track.credits.produced_by || track.credits.producers;
      if (Array.isArray(prod)) list.push(...prod);
      else if (typeof prod === "string" && prod.trim()) list.push(...prod.split(/[,&]/).map((s) => s.trim()));
    } else if (typeof track.credits === "string") {
      const m = track.credits.match(/produced\s+by\s+(.+)/i);
      if (m && m[1]) {
        list.push(...m[1].split(/[,&]/).map((s) => s.trim()));
      }
    }
  }

  // 3. Fall back to release-level producer credits
  if (list.length === 0 && release) {
    if (Array.isArray(release.producers) && release.producers.length > 0) {
      list = release.producers;
    } else if (typeof release.producers === "string" && release.producers.trim()) {
      list = release.producers.split(/[,&]/).map((s) => s.trim());
    } else if (typeof release.producer === "string" && release.producer.trim()) {
      list = release.producer.split(/[,&]/).map((s) => s.trim());
    } else if (typeof release.produced_by === "string" && release.produced_by.trim()) {
      list = release.produced_by.split(/[,&]/).map((s) => s.trim());
    }
  }

  // 4. Deduplicate names cleanly (case-insensitive while retaining clean display casing)
  const seen = new Set();
  const deduped = [];
  for (const item of list) {
    if (!item) continue;
    const clean = String(item).trim().replace(/^produced by\s+/i, "");
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(clean);
    }
  }

  if (deduped.length > 0) {
    return deduped;
  }

  return [DEFAULT_PRODUCER];
}

export function getTrackProducerString(track, release = null) {
  return formatCreditsList(getTrackProducers(track, release), DEFAULT_PRODUCER);
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

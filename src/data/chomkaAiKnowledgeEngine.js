// src/data/chomkaAiKnowledgeEngine.js
/**
 * CHOMKA AI KNOWLEDGE & NATURAL LANGUAGE CONCIERGE ENGINE
 *
 * Powers conversational Q&A, natural language intent recognition,
 * release chronology analysis, acronym & alias expansion (e.g. DPS -> "Don't Play Silachomka"),
 * and typo-tolerant catalogue intelligence across the chomkaMUSIC™ ecosystem.
 */

import canonicalReleases from "./releases.js";
import canonicalBeats from "./beats.js";

// Standard studio service rate baselines for intent calculation
export const STUDIO_SERVICE_CATALOGUE = [
  {
    slug: "vocal-recording",
    title: "Vocal Recording Sessions",
    category: "Recording",
    rateNgn: 30000,
    rateUsd: 60,
    unit: "hour",
    keywords: ["vocal", "vocals", "record", "recording", "voice", "sing", "booth", "mic", "studio time", "hours", "session"],
    description: "Pristine Neumann & Avalon vocal chain tracking with zero latency monitoring.",
  },
  {
    slug: "mixing-mastering",
    title: "Mixing & Mastering",
    category: "Engineering",
    rateNgn: 70000,
    rateUsd: 140,
    unit: "track",
    keywords: ["mix", "mixing", "master", "mastering", "mixdown", "stem", "stems", "polish", "analog", "clarity", "loudness"],
    description: "Hybrid analog/digital stem mixing and streaming-ready competitive mastering.",
  },
  {
    slug: "beat-production",
    title: "Custom Beat Production",
    category: "Production",
    rateNgn: 100000,
    rateUsd: 200,
    unit: "beat",
    keywords: ["beat", "beats", "produce", "production", "instrumental", "soundtrack", "custom beat", "afrobeats", "amapiano", "trap"],
    description: "Tailored custom composition crafted specifically around your vocal tone and artistic identity.",
  },
  {
    slug: "music-consultation",
    title: "Production Consultation & A&R",
    category: "Advisory",
    rateNgn: 25000,
    rateUsd: 50,
    unit: "session",
    keywords: ["consult", "consultation", "advice", "feedback", "a&r", "strategy", "review", "direction", "release plan"],
    description: "Direct 1-on-1 strategic review of your demos, sonic architecture, and release roadmap.",
  },
];

// Stop words that must NOT trigger false positive catalogue matches across every release
export const STOP_WORDS = new Set([
  "when", "did", "was", "were", "what", "whats", "who", "which", "where", "how", "why",
  "is", "are", "the", "a", "an", "of", "in", "on", "at", "to", "for", "by", "from",
  "with", "about", "tell", "me", "does", "do", "can", "could", "should", "would",
  "silachomka", "sila", "chomka", "chomkamusic", "release", "released", "drop",
  "dropped", "song", "songs", "track", "tracks", "album", "albums", "ep", "single",
  "singles", "beat", "beats", "music", "please", "out", "come", "coming", "published"
]);

/**
 * Splits text into clean word tokens without splitting English contractions
 * e.g., "Don't Play Silachomka" -> ["dont", "play", "silachomka"]
 */
export function cleanStringForWords(str) {
  if (!str) return [];
  const noApos = String(str).replace(/['’]/g, "");
  const clean = noApos.replace(/[^\w\s-]/g, " ").replace(/[-_]/g, " ").trim();
  return clean.split(/\s+/).filter(Boolean);
}

/**
 * Automatically extracts acronyms and initials for any title or track
 * e.g. "Don't Play Silachomka" -> ["dps"]
 * e.g. "The Imposter Package" -> ["tip", "ip"]
 * e.g. "Friday The 13th" -> ["ft13", "f13"]
 */
export function extractAcronyms(str) {
  if (!str) return [];
  const words = cleanStringForWords(str);
  if (words.length === 0) return [];

  const results = [];
  // Standard initials of every word
  const initials = words.map((w) => w[0].toLowerCase()).join("");
  if (initials.length >= 2) results.push(initials);

  // Without common particles/stop words: "the", "a", "an", "and", "of", "in", "on", "for"
  const particleStopWords = new Set(["the", "a", "an", "and", "of", "in", "on", "for"]);
  const filteredWords = words.filter((w) => !particleStopWords.has(w.toLowerCase()));
  if (filteredWords.length > 0 && filteredWords.length !== words.length) {
    const fInitials = filteredWords.map((w) => w[0].toLowerCase()).join("");
    if (fInitials.length >= 2) results.push(fInitials);
  }

  // Handle numbers in titles like "Friday The 13th" -> "ft13", "f13"
  const numbers = str.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const firstWordInitial = words[0]?.[0]?.toLowerCase() || "";
    results.push(`${firstWordInitial}${numbers[0]}`);
    if (words.length > 1) {
      results.push(`${words[0][0].toLowerCase()}t${numbers[0]}`);
    }
  }

  // Handle parenthetical shorthand, e.g. "HUH. (WYS?)" -> "wys"
  const parenMatch = str.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].replace(/[^\w]/g, "").toLowerCase();
    if (inside) results.push(inside);
  }

  return [...new Set(results)];
}

/**
 * Builds the comprehensive alias and acronym knowledge graph for the entire catalogue.
 */
export function buildCatalogueKnowledge(releases = canonicalReleases, beats = canonicalBeats) {
  const aliasToEntity = new Map();

  // 1. Explicit High-Priority Aliases & Acronyms
  const EXPLICIT_ALIASES = {
    // DON'T PLAY SILACHOMKA
    dps: "dont-play-silachomka",
    "dont play silachomka": "dont-play-silachomka",
    "don't play silachomka": "dont-play-silachomka",
    "dont play": "dont-play-silachomka",
    "don't play": "dont-play-silachomka",
    "dps single": "dont-play-silachomka",

    // FRIDAYTHE13TH
    f13: "fridaythe13th",
    ft13: "fridaythe13th",
    "friday the 13th": "fridaythe13th",
    "friday 13th": "fridaythe13th",
    "friday 13": "fridaythe13th",
    fridaythe13th: "fridaythe13th",

    // OYA NOW + HENNY
    onh: "oya-now-henny",
    "oya now": "oya-now-henny",
    henny: "oya-now-henny",
    "oya now henny": "oya-now-henny",
    "oya now freestyle": "oya-now-henny",

    // THE IMPOSTER PACKAGE
    tip: "the-imposter-package",
    imposter: "the-imposter-package",
    "imposter package": "the-imposter-package",
    "the imposter package": "the-imposter-package",

    // HYPERDRIVE: INGRËSS ZONE
    hiz: "hyperdrive-ingress-zone",
    hyperdrive: "hyperdrive-ingress-zone",
    "ingress zone": "hyperdrive-ingress-zone",
    ingress: "hyperdrive-ingress-zone",

    // NOISEMAKER
    nm: "noisemaker",
    noisemaker: "noisemaker",
    "noise maker": "noisemaker",

    // ITEM5
    item5: "item5",
    "item 5": "item5",
    i5: "item5",

    // KISS & TELL
    kt: "kiss-and-tell",
    knt: "kiss-and-tell",
    "kiss & tell": "kiss-and-tell",
    "kiss and tell": "kiss-and-tell",

    // KPE FOR ME
    kfm: "kpe-for-me",
    "kpe for me": "kpe-for-me",

    // HUH. (WYS?)
    wys: "huh-wys",
    huh: "huh-wys",
    "huh wys": "huh-wys",
    "what you saying": "huh-wys",

    // SOBOBO
    sobobo: "sobobo",
    sbb: "sobobo",

    // TWÈN
    twen: "twen",

    // SAVAGE
    savage: "savage",

    // BABY
    baby: "baby",

    // HORUS
    horus: "horus",

    // ATROCITY
    atrocity: "atrocity",

    // THURSDAY
    thursday: "thursday",

    // SPECIAAL
    speciaal: "speciaal",

    // DESPICABLE
    despicable: "despicable",
  };

  const safeReleases = Array.isArray(releases) && releases.length > 0 ? releases : canonicalReleases;
  const safeBeats = Array.isArray(beats) && beats.length > 0 ? beats : canonicalBeats;

  // Map explicit aliases first
  for (const [alias, slug] of Object.entries(EXPLICIT_ALIASES)) {
    const rel = safeReleases.find((r) => r.slug === slug);
    if (rel) {
      aliasToEntity.set(alias.toLowerCase(), { type: "release", data: rel });
    }
  }

  // Dynamic indexing of all releases and their tracks
  for (const rel of safeReleases) {
    if (!rel || !rel.title) continue;
    const normTitle = rel.title.toLowerCase().replace(/['’]/g, "").trim();
    aliasToEntity.set(normTitle, { type: "release", data: rel });
    aliasToEntity.set(rel.slug, { type: "release", data: rel });

    const acronyms = extractAcronyms(rel.title);
    for (const acr of acronyms) {
      if (!aliasToEntity.has(acr)) {
        aliasToEntity.set(acr, { type: "release", data: rel });
      }
    }

    if (Array.isArray(rel.tracks)) {
      for (const trk of rel.tracks) {
        if (!trk || !trk.title) continue;
        const normTrk = trk.title.toLowerCase().replace(/['’]/g, "").trim();
        if (!aliasToEntity.has(normTrk)) {
          aliasToEntity.set(normTrk, { type: "track", data: trk, release: rel });
        }
        const trkAcronyms = extractAcronyms(trk.title);
        for (const acr of trkAcronyms) {
          if (!aliasToEntity.has(acr)) {
            aliasToEntity.set(acr, { type: "track", data: trk, release: rel });
          }
        }
      }
    }
  }

  // Dynamic indexing of beats
  for (const b of safeBeats) {
    if (!b || !b.title) continue;
    const norm = b.title.toLowerCase().replace(/['’]/g, "").trim();
    aliasToEntity.set(norm, { type: "beat", data: b });
    aliasToEntity.set(b.id, { type: "beat", data: b });
    const bAcronyms = extractAcronyms(b.title);
    for (const acr of bAcronyms) {
      if (!aliasToEntity.has(acr)) {
        aliasToEntity.set(acr, { type: "beat", data: b });
      }
    }
  }

  // Studio Services
  for (const s of STUDIO_SERVICE_CATALOGUE) {
    const norm = s.title.toLowerCase().replace(/['’]/g, "").trim();
    aliasToEntity.set(norm, { type: "service", data: s });
    aliasToEntity.set(s.slug, { type: "service", data: s });
    if (Array.isArray(s.keywords)) {
      for (const kw of s.keywords) {
        const normKw = kw.toLowerCase().trim();
        if (!aliasToEntity.has(normKw) && normKw.length >= 4) {
          aliasToEntity.set(normKw, { type: "service", data: s });
        }
      }
    }
  }

  return aliasToEntity;
}

/**
 * Searches the query for any entity alias or acronym using word boundaries,
 * prioritizing longer exact matches first.
 */
export function findEntityInQuery(rawQuery, aliasMap) {
  if (!rawQuery || !aliasMap) return null;
  const noApos = String(rawQuery).toLowerCase().replace(/['’]/g, "");
  const normalized = noApos.replace(/[?!,.:;()]/g, " ").replace(/\s+/g, " ").trim();

  // 1. Direct exact match
  if (aliasMap.has(normalized)) {
    return aliasMap.get(normalized);
  }

  // 2. Sort all aliases by length descending so longer phrases match first
  // e.g. "friday the 13th" matches before "friday", "dont play silachomka" before "dps"
  const allAliases = [...aliasMap.keys()].sort((a, b) => b.length - a.length);

  for (const alias of allAliases) {
    if (alias.length < 2) continue;
    // Don't match super-short common English words
    if (["a", "in", "on", "me", "to", "it", "do", "we", "he", "is", "at", "by", "or", "as"].includes(alias)) continue;

    // Use word-boundary regex
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reg = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i");
    if (reg.test(normalized)) {
      return aliasMap.get(alias);
    }
  }

  return null;
}

/**
 * Parses user input to identify conversational intent, question structure,
 * and the target catalogue subject.
 */
export function parseChomkaQuestion(rawQuery, aliasMap, releases = canonicalReleases) {
  if (!rawQuery || typeof rawQuery !== "string") return null;

  const trimmed = rawQuery.trim();
  if (trimmed.length < 2) return null;

  const cleanQuery = trimmed.replace(/[?!.]+$/, "").trim();

  // Detect Intent
  let intent = null;

  if (/(?:when\s+(?:did|was|is|were)?.*(?:release|drop|publish|come out))|(?:release\s*date)|(?:when.*(?:release|drop|out))/i.test(trimmed)) {
    intent = "RELEASE_DATE";
  } else if (/(?:latest|newest|recent|most recent)\s*(?:release|song|track|music|project|ep|single|album)?/i.test(trimmed) || /what(?:'s|\s+is)\s+new/i.test(trimmed)) {
    intent = "LATEST_RELEASE";
  } else if (/(?:first|debut|oldest|earliest)\s*(?:release|song|track|music|project|ep|single|album)?/i.test(trimmed)) {
    intent = "FIRST_RELEASE";
  } else if (/who(?:\s+is|\s+was)?\s+(?:on|featured|feature|singing|collab)/i.test(trimmed) || /feat(?:uring)?\s+(?:on|in)?/i.test(trimmed)) {
    intent = "FEATURED_ARTIST";
  } else if (/who\s+produced|producer(?:\s+of)?|produced\s+by|beat\s+by/i.test(trimmed)) {
    intent = "PRODUCER";
  } else if (/(?:what\s+tracks|tracklist|track\s*list|how\s+many\s+tracks|songs\s+on)/i.test(trimmed)) {
    intent = "TRACKLIST";
  } else if (/(?:where\s+can\s+i\s+listen|where\s+to\s+stream|listen\s+to|stream|spotify\s+link|apple\s+music\s+link)/i.test(trimmed) || /is\s+.*\s+on\s+spotify/i.test(trimmed)) {
    intent = "STREAMING";
  } else if (/(?:what\s+bpm|tempo\s+of|bpm\s+of|what\s+key\s+is|key\s+of)/i.test(trimmed)) {
    intent = "BEAT_INFO";
  } else if (/(?:how\s+much\s+(?:is|for|does)|studio\s+rate|price\s+of|cost\s+of|book\s+a\s+session|studio\s+booking)/i.test(trimmed)) {
    intent = "STUDIO_SERVICES";
  } else if (/who\s+is\s+silachomka|about\s+silachomka|what\s+is\s+chomkamusic|who\s+is\s+sila\b/i.test(trimmed)) {
    intent = "ARTIST_BIO";
  } else if (/how\s+many\s+(?:releases|albums|eps|singles|tracks|songs)|discography\s+stats/i.test(trimmed)) {
    intent = "DISCOGRAPHY_STATS";
  }

  // Extract entity using direct entity scanning
  let entityMatch = findEntityInQuery(cleanQuery, aliasMap);

  // If intent is LATEST_RELEASE or FIRST_RELEASE without specific entity
  const safeReleases = Array.isArray(releases) && releases.length > 0 ? releases : canonicalReleases;

  if (intent === "LATEST_RELEASE" && !entityMatch) {
    const sorted = [...safeReleases].sort((a, b) => new Date(b.date || "2020-01-01") - new Date(a.date || "2020-01-01"));
    if (sorted[0]) entityMatch = { type: "release", data: sorted[0] };
  } else if (intent === "FIRST_RELEASE" && !entityMatch) {
    const sorted = [...safeReleases].sort((a, b) => new Date(a.date || "2020-01-01") - new Date(b.date || "2020-01-01"));
    if (sorted[0]) entityMatch = { type: "release", data: sorted[0] };
  } else if (intent === "ARTIST_BIO") {
    return {
      intent: "ARTIST_BIO",
      matchedEntity: { type: "artist", data: { name: "silachomka" } },
      rawQuery,
    };
  } else if (intent === "DISCOGRAPHY_STATS") {
    return {
      intent: "DISCOGRAPHY_STATS",
      matchedEntity: { type: "stats", data: { total: safeReleases.length } },
      rawQuery,
    };
  }

  if (!intent && !entityMatch) return null;

  return {
    intent: intent || "ENTITY_LOOKUP",
    matchedEntity: entityMatch,
    rawQuery,
  };
}

/**
 * Synthesizes an authoritative, polished AI direct answer card object.
 */
export function synthesizeChomkaAiAnswer(parsed, currency = "NGN", releases = canonicalReleases) {
  if (!parsed) return null;
  const { intent, matchedEntity } = parsed;

  const formatAmount = (ngn, usd) => (currency === "USD" ? `$${usd}` : `₦${Number(ngn).toLocaleString()}`);
  const safeReleases = Array.isArray(releases) && releases.length > 0 ? releases : canonicalReleases;

  if (intent === "ARTIST_BIO") {
    return {
      badge: "✦ CHOMKA AI · ARTIST & ECOSYSTEM PROFILE",
      title: "SILACHOMKA · CHOMKAMUSIC™",
      headline: "Music Producer, Sonic Architect & Creative Director",
      summary: "Silachomka (Samuel Silachomka John-Ibro) is a visionary Nigerian music producer, sound architect, and artist behind chomkaMUSIC™ and Chomka Nation. Blending Afrobeats, Alternative Rap, Trap, and Cinematic soundscapes, silachomka crafts immersive sonic experiences across albums, EPs, and premium studio collaborations.",
      facts: [
        { label: "FOUNDER", value: "chomkaMUSIC™ & Chomka Nation" },
        { label: "PRIMARY ROLES", value: "Producer · Sound Engineer · Artist" },
        { label: "GENRES", value: "Afrobeats · Alternative · Hip-Hop" },
        { label: "CATALOGUE", value: `${safeReleases.length} Official Releases` },
      ],
      actionUrl: "/music",
      actionText: "EXPLORE DISCOGRAPHY →",
    };
  }

  if (intent === "DISCOGRAPHY_STATS") {
    const singles = safeReleases.filter((r) => r.type === "single").length;
    const eps = safeReleases.filter((r) => r.type === "ep").length;
    const albums = safeReleases.filter((r) => r.type === "album").length;

    return {
      badge: "✦ CHOMKA AI · DISCOGRAPHY METRICS",
      title: "SILACHOMKA OFFICIAL DISCOGRAPHY",
      headline: `${safeReleases.length} Studio Releases Available`,
      summary: `The silachomka catalogue features ${safeReleases.length} official releases to date, spanning ${singles} Singles, ${eps} EPs, and ${albums > 0 ? `${albums} Albums` : "concept packages"} published under chomkaMUSIC™ and collaborating imprints.`,
      facts: [
        { label: "TOTAL RELEASES", value: `${safeReleases.length}` },
        { label: "SINGLES", value: `${singles}` },
        { label: "EPS / PROJECTS", value: `${eps}` },
      ],
      actionUrl: "/music",
      actionText: "VIEW FULL DISCOGRAPHY →",
    };
  }

  if (matchedEntity?.type === "service") {
    const svc = matchedEntity.data;
    return {
      badge: "✦ CHOMKA AI · STUDIO SERVICE CONCIERGE",
      title: svc.title.toUpperCase(),
      headline: `${formatAmount(svc.rateNgn, svc.rateUsd)} / ${svc.unit}`,
      summary: `${svc.title} at chomkaMUSIC™ Studio is offered at ${formatAmount(svc.rateNgn, svc.rateUsd)} per ${svc.unit}. ${svc.description}`,
      facts: [
        { label: "CATEGORY", value: svc.category },
        { label: "BASE RATE", value: `${formatAmount(svc.rateNgn, svc.rateUsd)} / ${svc.unit}` },
        { label: "STUDIO CHAIN", value: "Neumann & Avalon Hardware tracking" },
      ],
      actionUrl: `/services/${svc.slug}`,
      actionText: "BOOK STUDIO SESSION →",
    };
  }

  if (matchedEntity?.type === "beat") {
    const beat = matchedEntity.data;
    return {
      badge: "✦ CHOMKA AI · STUDIO INSTRUMENTAL INTELLIGENCE",
      title: beat.title,
      headline: `${beat.bpm || "120 BPM"} · Key of ${beat.key || "C Minor"}`,
      summary: `"${beat.title}" is an official chomkaMUSIC™ instrumental piece produced at ${beat.bpm || "120 BPM"} in ${beat.key || "C Minor"}. Categorized as ${beat.genre || "Afro-Alternative"}, available for licensing in Basic, Premium, and Ultimate multi-track stems.`,
      facts: [
        { label: "TEMPO / BPM", value: beat.bpm || "120 BPM" },
        { label: "MUSICAL KEY", value: beat.key || "Standard" },
        { label: "GENRE", value: beat.shortGenre || beat.genre || "Beat" },
      ],
      actionUrl: `/beats/${beat.id}`,
      actionText: "LISTEN & LICENSE STEMS →",
    };
  }

  if (matchedEntity?.type === "release" || matchedEntity?.type === "track") {
    const rel = matchedEntity.type === "release" ? matchedEntity.data : matchedEntity.release;
    const isDPS = rel.slug === "dont-play-silachomka" || rel.title.toUpperCase().includes("DON'T PLAY");
    const aliasTag = isDPS ? " (DPS)" : "";

    const allFeatures = (rel.tracks || []).flatMap((t) => t.featuring || []).filter(Boolean);
    const uniqueFeatures = [...new Set(allFeatures)];

    if (intent === "RELEASE_DATE" || intent === "LATEST_RELEASE" || intent === "FIRST_RELEASE") {
      const dateText = rel.displayDate || rel.date || "Official Studio Release";
      return {
        badge: `✦ CHOMKA AI · ${intent === "LATEST_RELEASE" ? "LATEST RELEASE" : intent === "FIRST_RELEASE" ? "DEBUT RELEASE" : "RELEASE CHRONOLOGY"}`,
        title: `${rel.title}${aliasTag}`,
        headline: `Released on ${dateText}`,
        summary: `"${rel.title}"${aliasTag} was officially released on ${dateText} by ${rel.artist || "silachomka"} (${(rel.type || "Single").toUpperCase()}${rel.edition ? ` · Edition ${rel.edition}` : ""}).${uniqueFeatures.length > 0 ? ` It features ${uniqueFeatures.join(", ")}.` : ""} Available across major streaming platforms.`,
        facts: [
          { label: "RELEASE DATE", value: dateText },
          { label: "FORMAT", value: `${(rel.type || "single").toUpperCase()}${rel.edition ? ` (Edition ${rel.edition})` : ""}` },
          { label: "PRIMARY ARTIST", value: rel.artist || "silachomka" },
          ...(uniqueFeatures.length > 0 ? [{ label: "FEATURED", value: uniqueFeatures.join(", ") }] : []),
        ],
        platforms: rel.platforms,
        actionUrl: `/release/${rel.slug}`,
        actionText: "EXPLORE RELEASE IN FULL →",
      };
    }

    if (intent === "FEATURED_ARTIST") {
      return {
        badge: "✦ CHOMKA AI · ARTIST COLLABORATIONS",
        title: `${rel.title}${aliasTag}`,
        headline: uniqueFeatures.length > 0 ? `Featuring ${uniqueFeatures.join(", ")}` : "Solo Release by silachomka",
        summary: uniqueFeatures.length > 0
          ? `"${rel.title}"${aliasTag} features guest contributions from ${uniqueFeatures.join(", ")}. Released on ${rel.displayDate || rel.date}.`
          : `"${rel.title}" is a solo release by silachomka with no external guest vocalists.`,
        facts: [
          { label: "COLLABORATORS", value: uniqueFeatures.join(", ") || "None (Solo)" },
          { label: "RELEASE DATE", value: rel.displayDate || rel.date },
          { label: "PRIMARY ARTIST", value: rel.artist || "silachomka" },
        ],
        platforms: rel.platforms,
        actionUrl: `/release/${rel.slug}`,
        actionText: "LISTEN TO TRACK →",
      };
    }

    if (intent === "PRODUCER") {
      return {
        badge: "✦ CHOMKA AI · PRODUCTION CREDITS",
        title: `${rel.title}${aliasTag}`,
        headline: "Produced by silachomka",
        summary: `"${rel.title}"${aliasTag} was produced by silachomka under the chomkaMUSIC™ sonic architecture umbrella. Published under ${rel.sources?.join(" & ") || "chomkaMUSIC™"}.`,
        facts: [
          { label: "PRODUCER", value: "silachomka" },
          { label: "LABEL / IMPRINT", value: rel.sources?.join(" & ") || "chomkaMUSIC™" },
          { label: "RELEASE DATE", value: rel.displayDate || rel.date },
        ],
        platforms: rel.platforms,
        actionUrl: `/release/${rel.slug}`,
        actionText: "VIEW FULL CREDITS →",
      };
    }

    if (intent === "STREAMING") {
      return {
        badge: "✦ CHOMKA AI · STREAMING CONCIERGE",
        title: `${rel.title}${aliasTag}`,
        headline: "Available on All Major Platforms",
        summary: `Stream "${rel.title}"${aliasTag} on Spotify, Apple Music, YouTube Music, Audiomack, Boomplay, and Deezer.`,
        facts: [
          { label: "TITLE", value: rel.title },
          { label: "RELEASE DATE", value: rel.displayDate || rel.date },
          { label: "ARTIST", value: rel.artist || "silachomka" },
        ],
        platforms: rel.platforms,
        actionUrl: `/release/${rel.slug}`,
        actionText: "EXPLORE RELEASE →",
      };
    }

    // Default overview
    return {
      badge: "✦ CHOMKA AI · CATALOGUE INTELLIGENCE",
      title: `${rel.title}${aliasTag}`,
      headline: `${(rel.type || "Single").toUpperCase()} · ${rel.displayDate || rel.date}`,
      summary: `"${rel.title}"${aliasTag} is an official studio release by ${rel.artist || "silachomka"}. Released on ${rel.displayDate || rel.date}.${uniqueFeatures.length > 0 ? ` Featuring ${uniqueFeatures.join(", ")}.` : ""}`,
      facts: [
        { label: "RELEASE DATE", value: rel.displayDate || rel.date },
        { label: "ARTIST", value: rel.artist || "silachomka" },
        ...(uniqueFeatures.length > 0 ? [{ label: "FEATURING", value: uniqueFeatures.join(", ") }] : []),
      ],
      platforms: rel.platforms,
      actionUrl: `/release/${rel.slug}`,
      actionText: "EXPLORE RELEASE →",
    };
  }

  return null;
}

// Quick user prompts shown in suggestions
export const SUGGESTED_CHOMKA_AI_QUERIES = [
  "When did silachomka release DPS?",
  "Who is featured on DPS?",
  "What is the latest release?",
  "Book Vocal Session",
  "Afrobeats Beats",
  "How much is vocal recording?",
];

/**
 * Natural language intent parser for Chomka Admin AI Executive Console.
 * Accurately parses commands like:
 * - "delete event" / "delete event Lagos Live" / "remove tour date"
 * - "delete beat" / "delete beat runaway"
 * - "delete release" / "delete track" / "delete video" / "delete photo"
 * - "create event" / "schedule concert" / "add tour date"
 * - "create beat" / "upload beat"
 * - "create release" / "publish album"
 * - "upload media" / "add photo"
 * - "edit event [name]" / "edit beat [name]"
 * - "list events" / "show events" / "show beats"
 * - "purge recycle bin" / "empty trash"
 * - "sync catalogue" / "refresh cache"
 * - "how many events" / "stats"
 */
export function parseAdminExecutiveIntent(query, currentPath = "", collections = {}) {
  if (!query || typeof query !== "string") return null;
  const rawQuery = query.trim();
  if (rawQuery.length < 2) return null;
  const q = rawQuery.toLowerCase();

  // 1. Direct automated system maintenance processes
  if (/(purge|empty\s*trash|clean\s*bin|clean\s*trash|recycle\s*bin\s*purge|wipe\s*trash|purge\s*expired)/i.test(q)) {
    return {
      type: "PURGE_RECYCLE_BIN",
      title: "Recycle Bin Automated Purge",
      desc: "Permanently delete soft-deleted records older than 60 days across all catalogue collections.",
    };
  }

  if (/(sync|refresh\s*cache|reload\s*store|update\s*public|synchronize)/i.test(q)) {
    return {
      type: "SYNC_CATALOGUE",
      title: "Public Catalogue Synchronization",
      desc: "Synchronize client store cache with the live production database to propagate updates immediately.",
    };
  }

  // 2. Identify the action verb
  let action = null; // "DELETE" | "CREATE" | "EDIT" | "VIEW" | "RESTORE" | "STATS"
  if (/\b(delete|remove|trash|del|discard|destroy|drop|kill|deactivate)\b/i.test(q)) {
    action = "DELETE";
  } else if (/\b(create|add|new|upload|schedule|publish|insert|post|register)\b/i.test(q)) {
    action = "CREATE";
  } else if (/\b(edit|update|modify|change|rename)\b/i.test(q)) {
    action = "EDIT";
  } else if (/\b(restore|undelete|recover|untrash)\b/i.test(q)) {
    action = "RESTORE";
  } else if (/\b(how\s*many|count|stats|overview|metrics|summary)\b/i.test(q)) {
    action = "STATS";
  } else if (/\b(show|list|view|display|browse|all|find)\b/i.test(q)) {
    action = "VIEW";
  }

  // 3. Identify the target entity
  let entityType = null;
  if (/\b(events?|concerts?|tours?|shows?|gigs?|live\s*performances?)\b/i.test(q)) {
    entityType = "events";
  } else if (/\b(beats?|instrumentals?|soundtracks?)\b/i.test(q)) {
    entityType = "beats";
  } else if (/\b(releases?|albums?|eps?|singles?|discograph)/i.test(q)) {
    entityType = "releases";
  } else if (/\b(tracks?|songs?|audio\s*tracks?)\b/i.test(q)) {
    entityType = "tracks";
  } else if (/\b(videos?|music\s*videos?|visualizers?|youtube)\b/i.test(q)) {
    entityType = "videos";
  } else if (/\b(gallery|photos?|images?|pictures?|moments?|visuals?)\b/i.test(q)) {
    entityType = "gallery";
  } else if (/\b(media|assets?|files?|r2|uploads?)\b/i.test(q)) {
    entityType = "media";
  } else if (/\b(subscribers?|fan\s*emails?|newsletter|mailing\s*list|fans)\b/i.test(q)) {
    entityType = "subscribers";
  } else if (/\b(orders?|bookings?|studio\s*orders?|proposals?|sessions?)\b/i.test(q)) {
    entityType = "orders";
  } else if (/\b(trash|recycle\s*bin|deleted)\b/i.test(q)) {
    entityType = "recycleBin";
  }

  // 4. Context awareness: If action is present but entity was omitted, infer from active admin route
  if (action && !entityType) {
    if (currentPath.startsWith("/admin/events")) entityType = "events";
    else if (currentPath.startsWith("/admin/beats")) entityType = "beats";
    else if (currentPath.startsWith("/admin/music")) entityType = "releases";
    else if (currentPath.startsWith("/admin/tracks")) entityType = "tracks";
    else if (currentPath.startsWith("/admin/gallery")) entityType = "gallery";
    else if (currentPath.startsWith("/admin/videos")) entityType = "videos";
    else if (currentPath.startsWith("/admin/media")) entityType = "media";
    else if (currentPath.startsWith("/admin/subscribers")) entityType = "subscribers";
    else if (currentPath.startsWith("/admin/services")) entityType = "orders";
    else if (currentPath.startsWith("/admin/recycle-bin")) entityType = "recycleBin";
  }

  // 5. Clean remainder to match specific candidate item if user specified one (e.g. "delete event Lagos Live")
  let remainder = q
    .replace(/\b(delete|remove|trash|del|discard|destroy|drop|kill|create|add|new|upload|schedule|publish|insert|edit|update|modify|change|rename|restore|undelete|recover|show|list|view|display|browse|all|how|many|count|stats|overview|metrics|summary)\b/gi, "")
    .replace(/\b(events?|concerts?|tours?|shows?|beats?|instrumentals?|releases?|albums?|eps?|singles?|tracks?|songs?|videos?|gallery|photos?|images?|media|assets?|subscribers?|orders?|trash|recycle\s*bin)\b/gi, "")
    .replace(/\b(in|cms|the|a|an|from|of|to|for|this)\b/gi, "")
    .trim();

  // If user typed "delete Lagos Live" without the word "event", try matching remainder across collections
  if (action === "DELETE" && !entityType && remainder.length > 1) {
    const collectionsToCheck = [
      { type: "events", list: collections.events },
      { type: "beats", list: collections.beats },
      { type: "releases", list: collections.releases },
      { type: "tracks", list: collections.tracks },
      { type: "gallery", list: collections.gallery },
      { type: "videos", list: collections.videos },
      { type: "subscribers", list: collections.subscribers },
    ];
    for (const c of collectionsToCheck) {
      if (Array.isArray(c.list)) {
        const found = c.list.find((item) => {
          const title = (item.title || item.name || item.email || item.caption || "").toLowerCase();
          return title.includes(remainder) || remainder.includes(title);
        });
        if (found) {
          entityType = c.type;
          break;
        }
      }
    }
  }

  if (!entityType && !action) {
    return null;
  }

  const meta = {
    events: { label: "Event", plural: "Events", path: "/admin/events", createText: "Schedule Live Event", createDesc: "Open Events Management to register venue, ticketing links, and lineup." },
    beats: { label: "Beat", plural: "Beats", path: "/admin/beats", createText: "Create New Beat", createDesc: "Jump into Beats CMS to configure BPM, audio previews, stems, and Selar URLs." },
    releases: { label: "Release", plural: "Releases", path: "/admin/music", createText: "Publish New Music Release", createDesc: "Open Music CMS to register album artwork, release date, and DSP links." },
    tracks: { label: "Track", plural: "Tracks", path: "/admin/tracks", createText: "Add Audio Track", createDesc: "Register individual audio tracks, stream links, and production credits." },
    videos: { label: "Video", plural: "Videos", path: "/admin/videos", createText: "Add Music Video", createDesc: "Manage YouTube platform video embeds, teasers, and visualizers." },
    gallery: { label: "Gallery Post", plural: "Gallery Posts", path: "/admin/gallery", createText: "Curate Gallery Moment", createDesc: "Upload and curate visual moments, photo categories, and highlights." },
    media: { label: "Media Asset", plural: "Media Assets", path: "/admin/media", createText: "Upload Media Asset", createDesc: "Direct high-performance R2 cloud storage asset uploads." },
    subscribers: { label: "Subscriber", plural: "Subscribers", path: "/admin/subscribers", createText: "Manage Subscribers", createDesc: "Search, verify consent status, and manage the official mailing list." },
    orders: { label: "Studio Order", plural: "Studio Orders", path: "/admin/services", createText: "Review Studio Orders", createDesc: "Review client session bookings, custom beat inquiries, and deposits." },
    recycleBin: { label: "Recycle Bin Item", plural: "Recycle Bin Items", path: "/admin/recycle-bin", createText: "Open Recycle Bin", createDesc: "Soft-deleted records with 60-day recovery protection." },
  };

  const currentMeta = meta[entityType] || { label: "Record", plural: "Records", path: "/admin" };
  const rawCandidates = Array.isArray(collections[entityType]) ? collections[entityType] : [];

  // Match specific item if remainder exists
  let matchedItem = null;
  if (remainder.length >= 2 && rawCandidates.length > 0) {
    matchedItem = rawCandidates.find((item) => {
      const title = (item.title || item.name || item.email || item.caption || "").toLowerCase();
      return title.includes(remainder) || remainder.includes(title);
    }) || null;
  }

  // Filter candidates if remainder exists
  let filteredCandidates = rawCandidates;
  if (remainder.length >= 2) {
    const subset = rawCandidates.filter((item) => {
      const title = (item.title || item.name || item.email || item.venue_name || item.venue || item.city || item.caption || "").toLowerCase();
      return title.includes(remainder);
    });
    if (subset.length > 0) {
      filteredCandidates = subset;
    }
  }

  if (action === "DELETE") {
    return {
      type: "DELETE_ENTITY",
      entityType,
      entityLabel: currentMeta.label,
      entityPlural: currentMeta.plural,
      targetPath: currentMeta.path,
      matchedItem,
      candidates: filteredCandidates,
      title: matchedItem
        ? `Move "${matchedItem.title || matchedItem.name || matchedItem.email}" to Recycle Bin`
        : `Delete ${currentMeta.label}`,
      desc: matchedItem
        ? `Confirm deletion of this ${currentMeta.label.toLowerCase()}. It will be moved to the Recycle Bin and can be restored within 60 days.`
        : `Select a ${currentMeta.label.toLowerCase()} to move to the Recycle Bin. Soft-deleted records are retained for 60 days with 1-click recovery.`,
    };
  }

  if (action === "CREATE") {
    return {
      type: "CREATE_ENTITY",
      entityType,
      entityLabel: currentMeta.label,
      entityPlural: currentMeta.plural,
      targetPath: currentMeta.path,
      title: currentMeta.createText || `Create ${currentMeta.label}`,
      desc: currentMeta.createDesc || `Open ${currentMeta.plural} CMS to create and register a new record.`,
      btnText: `Open ${currentMeta.label} Creator →`,
    };
  }

  if (action === "EDIT") {
    return {
      type: "EDIT_ENTITY",
      entityType,
      entityLabel: currentMeta.label,
      entityPlural: currentMeta.plural,
      targetPath: currentMeta.path,
      matchedItem,
      candidates: filteredCandidates,
      title: matchedItem
        ? `Edit "${matchedItem.title || matchedItem.name}" in CMS`
        : `Edit ${currentMeta.label}`,
      desc: `Select a ${currentMeta.label.toLowerCase()} to modify its details, media assets, or publication status.`,
    };
  }

  if (action === "VIEW" || (entityType && !action && rawCandidates.length > 0)) {
    return {
      type: "LIST_ENTITIES",
      entityType,
      entityLabel: currentMeta.label,
      entityPlural: currentMeta.plural,
      targetPath: currentMeta.path,
      candidates: filteredCandidates,
      title: `${currentMeta.plural} Management Directory`,
      desc: `Browse and manage ${currentMeta.plural.toLowerCase()} currently active in the CMS.`,
    };
  }

  if (action === "STATS") {
    return {
      type: "STATS_OVERVIEW",
      title: "CMS Live Operations & Metric Overview",
      desc: "Real-time statistics across events, music, beats, visual archive, and subscribers.",
    };
  }

  return null;
}

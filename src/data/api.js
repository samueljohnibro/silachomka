const API_URL = import.meta.env.VITE_API_URL || "";

// Normalize Releases
const normalizeRelease = (r) => {
  if (!r) return null;
  return {
    ...r,
    type: r.type ? r.type.toLowerCase() : "ep", // ensure frontend matches lowercase e.g. "ep", "single", "album"
    associatedGallery: Array.isArray(r.associatedGallery)
      ? r.associatedGallery.map(normalizeGalleryPost)
      : [],
  };
};

// Normalize Beat Genre to uppercase words, lowercase 'x' separator, and 'TYPE BEAT' suffix
export const formatBeatGenrePair = (rawInput) => {
  const raw = String(rawInput || "").trim();
  if (!raw) return { genre: "TYPE BEAT", shortGenre: "" };
  const withoutSuffix = raw.replace(/\s+type\s+beat$/i, "").trim();
  const parts = withoutSuffix
    .split(/\s+[xX×]\s+/)
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
  const shortGenre = parts.join(" x ");
  const fullGenre = shortGenre ? `${shortGenre} TYPE BEAT` : "TYPE BEAT";
  return { genre: fullGenre, shortGenre };
};

// Normalize Beats
export const normalizeBeat = (b) => {
  if (!b) return null;
  const rawGenre = b.shortGenre || b.short_genre || b.genre || "";
  const { genre, shortGenre } = formatBeatGenrePair(rawGenre);
  const rawCats = Array.isArray(b.categories) ? b.categories : [];
  const catSet = new Set(rawCats);
  const lower = shortGenre.toLowerCase();
  if (lower.includes("afro")) catSet.add("afro");
  if (lower.includes("trap") || lower.includes("rap") || lower.includes("hip")) catSet.add("trap");
  if (lower.includes("r&b") || lower.includes("rnb") || lower.includes("soul") || lower.includes("alt")) catSet.add("rnb");
  return {
    ...b,
    genre,
    shortGenre,
    short_genre: shortGenre,
    categories: Array.from(catSet),
    showVisualTitle: true, // Frontend expects this to trigger the visual title overlay
  };
};

// Normalize Gallery Posts (ensuring both src and asset, string slides + slideObjects, and social embeds work)
export const normalizeGalleryPost = (g) => {
  if (!g) return null;
  const rawSlides = Array.isArray(g.slides) && g.slides.length > 0
    ? g.slides
    : Array.isArray(g.carouselSlides) && g.carouselSlides.length > 0
    ? g.carouselSlides
    : Array.isArray(g.slideObjects) && g.slideObjects.length > 0
    ? g.slideObjects
    : [];

  const slideObjects = rawSlides
    .map((s, idx) => {
      if (typeof s === "string") {
        const isVid = /\.(mp4|mov|webm)(\?.*)?$/i.test(s);
        return {
          id: `slide-${idx}`,
          src: s,
          asset: s,
          slideType: isVid ? "video" : "image",
          isVideo: isVid,
          is_hero: false,
        };
      }
      const url = s?.src || s?.asset || "";
      const isVid =
        s?.isVideo === true ||
        s?.slideType === "video" ||
        s?.slide_type === "video" ||
        s?.assetType === "VIDEO" ||
        (s?.mimeType && String(s.mimeType).startsWith("video/")) ||
        (s?.mime_type && String(s.mime_type).startsWith("video/")) ||
        /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
      return {
        ...s,
        id: s?.id || `slide-${idx}`,
        src: url,
        asset: url,
        slideType: isVid ? "video" : "image",
        slide_type: isVid ? "video" : "image",
        isVideo: isVid,
        is_hero: Boolean(s?.is_hero || s?.isHero),
      };
    })
    .filter((s) => Boolean(s.src));

  const primaryUrl = g.src || g.asset || g.videoSrc || slideObjects[0]?.src || "";
  const isPrimaryVideo =
    g.isVideo === true ||
    g.type === "video" ||
    g.post_type === "video" ||
    g.assetType === "VIDEO" ||
    (g.mimeType && String(g.mimeType).startsWith("video/")) ||
    (g.mime_type && String(g.mime_type).startsWith("video/")) ||
    /\.(mp4|mov|webm)(\?.*)?$/i.test(primaryUrl);

  const finalSlides = slideObjects.length > 0
    ? slideObjects
    : primaryUrl
    ? [{ id: "slide-0", src: primaryUrl, asset: primaryUrl, slideType: isPrimaryVideo ? "video" : "image", slide_type: isPrimaryVideo ? "video" : "image", isVideo: isPrimaryVideo, is_hero: Boolean(g.is_hero || g.isHero) }]
    : [];

  return {
    ...g,
    src: primaryUrl,
    asset: primaryUrl,
    videoSrc: isPrimaryVideo ? primaryUrl : g.videoSrc || null,
    isVideo: isPrimaryVideo,
    slides: finalSlides,
    slideObjects: finalSlides,
    externalSocialUrl: g.externalSocialUrl || g.external_social_url || null,
    externalSocialPlatform: g.externalSocialPlatform || g.external_social_platform || null,
  };
};

// Normalize Social Links
const normalizeSocials = (socialsArray) => {
  if (!Array.isArray(socialsArray)) return [];
  return socialsArray.map((soc) => ({
    ...soc,
    id: soc.name ? soc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : Math.random().toString(36).substr(2, 6),
  }));
};

export async function fetchAllCatalogue() {
  const [releasesRes, beatsRes, galleryRes, videosRes, socialsRes] = await Promise.all([
    fetch(`${API_URL}/api/releases`),
    fetch(`${API_URL}/api/beats`),
    fetch(`${API_URL}/api/gallery`),
    fetch(`${API_URL}/api/music-videos`),
    fetch(`${API_URL}/api/social-links`),
  ]);

  if (!releasesRes.ok || !beatsRes.ok || !galleryRes.ok || !videosRes.ok || !socialsRes.ok) {
    throw new Error("Failed to fetch catalogue data from API");
  }

  const [releasesData, beatsData, galleryData, videosData, socialsData] = await Promise.all([
    releasesRes.json(),
    beatsRes.json(),
    galleryRes.json(),
    videosRes.json(),
    socialsRes.json(),
  ]);

  return {
    releases: (Array.isArray(releasesData) ? releasesData : []).map(normalizeRelease),
    beats: (Array.isArray(beatsData) ? beatsData : []).map(normalizeBeat),
    gallery: (Array.isArray(galleryData) ? galleryData : []).map(normalizeGalleryPost),
    videos: Array.isArray(videosData) ? videosData : [],
    socials: {
      artist: normalizeSocials(socialsData.artist),
      ecosystem: normalizeSocials(socialsData.ecosystem),
      galleryEligible: normalizeSocials(socialsData.galleryEligible || socialsData.artist),
    },
  };
}

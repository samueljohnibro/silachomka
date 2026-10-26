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

// Normalize Beats
const normalizeBeat = (b) => {
  if (!b) return null;
  return {
    ...b,
    showVisualTitle: true, // Frontend expects this to trigger the visual title overlay
  };
};

// Normalize Gallery Posts (ensuring both src and asset, string slides + slideObjects, and social embeds work)
export const normalizeGalleryPost = (g) => {
  if (!g) return null;
  const rawSlides = Array.isArray(g.slides) ? g.slides : [];
  const slideObjects = rawSlides
    .map((s) => {
      if (typeof s === "string") {
        const isVid = /\.(mp4|mov|webm)(\?.*)?$/i.test(s);
        return { src: s, asset: s, slideType: isVid ? "video" : "image", isVideo: isVid };
      }
      const url = s?.src || s?.asset || "";
      const isVid =
        s?.slideType === "video" ||
        s?.assetType === "VIDEO" ||
        (s?.mimeType && s.mimeType.startsWith("video/")) ||
        /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
      return {
        ...s,
        src: url,
        asset: url,
        slideType: isVid ? "video" : "image",
        isVideo: isVid,
      };
    })
    .filter((s) => Boolean(s.src));

  const primaryUrl = g.src || g.asset || g.videoSrc || slideObjects[0]?.src || "";
  const isPrimaryVideo =
    g.type === "video" ||
    g.post_type === "video" ||
    g.assetType === "VIDEO" ||
    (g.mimeType && g.mimeType.startsWith("video/")) ||
    /\.(mp4|mov|webm)(\?.*)?$/i.test(primaryUrl);

  const slideUrls =
    slideObjects.length > 0
      ? slideObjects.map((s) => s.src)
      : primaryUrl
      ? [primaryUrl]
      : [];

  return {
    ...g,
    src: primaryUrl,
    asset: primaryUrl,
    videoSrc: isPrimaryVideo ? primaryUrl : g.videoSrc || null,
    isVideo: isPrimaryVideo,
    slides: slideUrls,
    slideObjects:
      slideObjects.length > 0
        ? slideObjects
        : primaryUrl
        ? [{ src: primaryUrl, asset: primaryUrl, slideType: isPrimaryVideo ? "video" : "image", isVideo: isPrimaryVideo }]
        : [],
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

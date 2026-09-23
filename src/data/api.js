const API_URL = "https://silachomka-api.samueljohnibrotech.workers.dev";

// Normalize Releases
const normalizeRelease = (r) => {
  if (!r) return null;
  return {
    ...r,
    type: r.type ? r.type.toLowerCase() : "ep", // ensure frontend matches lowercase e.g. "ep", "single", "album"
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
    gallery: Array.isArray(galleryData) ? galleryData : [],
    videos: Array.isArray(videosData) ? videosData : [],
    socials: {
      artist: normalizeSocials(socialsData.artist),
      ecosystem: normalizeSocials(socialsData.ecosystem),
    },
  };
}

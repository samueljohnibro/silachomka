/**
 * Admin API wrapper
 * Uses relative `/api/admin/*` paths to leverage Vercel rewrites (or Vite proxy).
 */

async function fetchAdmin(endpoint, options = {}) {
  const url = `/api/admin${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Admin API Request Failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const adminApi = {
  login: async (email, password) => {
    return fetchAdmin('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  logout: async () => {
    return fetchAdmin('/logout', { method: 'POST' });
  },

  getMe: async () => {
    return fetchAdmin('/me');
  },

  // Dashboard Data Fetchers
  getReleases: async () => fetchAdmin('/releases'),
  getTracks: async () => fetchAdmin('/tracks'),
  getBeats: async () => fetchAdmin('/beats'),
  getVideos: async () => fetchAdmin('/music-videos'),
  getGallery: async () => fetchAdmin('/gallery-posts'),
  getMedia: async () => fetchAdmin('/media-assets'),

  // Beats CRUD
  createBeat: async (data) => fetchAdmin('/beats', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateBeat: async (id, data) => fetchAdmin(`/beats/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteBeat: async (id) => fetchAdmin(`/beats/${id}`, {
    method: 'DELETE'
  }),

  // Music (Releases) CRUD
  createRelease: async (data) => fetchAdmin('/releases', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateRelease: async (id, data) => fetchAdmin(`/releases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteRelease: async (id) => fetchAdmin(`/releases/${id}`, {
    method: 'DELETE'
  }),
  // Gallery CRUD
  createGalleryPost: async (data) => fetchAdmin('/gallery-posts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateGalleryPost: async (id, data) => fetchAdmin(`/gallery-posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteGalleryPost: async (id) => fetchAdmin(`/gallery-posts/${id}`, {
    method: 'DELETE'
  }),
  getGalleryCategories: async () => fetchAdmin('/gallery-categories'),
  createGalleryCategory: async (data) => fetchAdmin('/gallery-categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  // Tracks CRUD
  getTracks: async () => fetchAdmin('/tracks'),
  createTrack: async (data) => fetchAdmin('/tracks', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateTrack: async (id, data) => fetchAdmin(`/tracks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteTrack: async (id) => fetchAdmin(`/tracks/${id}`, {
    method: 'DELETE'
  }),
  // Media CRUD
  getMediaAssets: async () => fetchAdmin('/media-assets'),
  createMediaAsset: async (data) => fetchAdmin('/media-assets', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  uploadMediaAsset: async (file, assetType = 'IMAGE') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_type', assetType);
    const response = await fetch('/api/admin/media-assets/upload', {
      method: 'POST',
      body: formData,
    });
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'File upload failed');
    }
    return data;
  },
  updateMediaAsset: async (id, data) => fetchAdmin(`/media-assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteMediaAsset: async (id) => fetchAdmin(`/media-assets/${id}`, {
    method: 'DELETE'
  }),
  // Social Links CRUD
  getSocialLinks: async () => fetchAdmin('/social-links'),
  createSocialLink: async (data) => fetchAdmin('/social-links', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateSocialLink: async (id, data) => fetchAdmin(`/social-links/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteSocialLink: async (id) => fetchAdmin(`/social-links/${id}`, {
    method: 'DELETE'
  }),
  // Merchandise CRUD
  getMerchandise: async () => fetchAdmin('/merchandise'),
  createMerchandise: async (data) => fetchAdmin('/merchandise', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateMerchandise: async (id, data) => fetchAdmin(`/merchandise/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteMerchandise: async (id) => fetchAdmin(`/merchandise/${id}`, {
    method: 'DELETE'
  }),

  // Music Videos CRUD
  createVideo: async (data) => fetchAdmin('/music-videos', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateVideo: async (id, data) => fetchAdmin(`/music-videos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteVideo: async (id) => fetchAdmin(`/music-videos/${id}`, {
    method: 'DELETE'
  }),

  // Music Video Features CRUD
  getVideoFeatures: async () => fetchAdmin('/music-video-features'),
  createVideoFeature: async (data) => fetchAdmin('/music-video-features', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteVideoFeature: async (videoId, artistName) => fetchAdmin(`/music-video-features/${videoId}/${encodeURIComponent(artistName)}`, {
    method: 'DELETE'
  }),

  // Track Credits CRUD
  getTrackCredits: async () => fetchAdmin('/track-credits'),
  createTrackCredit: async (data) => fetchAdmin('/track-credits', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteTrackCredit: async (id) => fetchAdmin(`/track-credits/${id}`, {
    method: 'DELETE'
  }),

  // Gallery Slides CRUD
  getGallerySlides: async () => fetchAdmin('/gallery-slides'),
  createGallerySlide: async (data) => fetchAdmin('/gallery-slides', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteGallerySlide: async (id) => fetchAdmin(`/gallery-slides/${id}`, {
    method: 'DELETE'
  }),

  // Recycle Bin
  getRecycleBin: async () => fetchAdmin('/recycle-bin'),
  restoreItem: async (table, id) => fetchAdmin('/recycle-bin/restore', {
    method: 'POST',
    body: JSON.stringify({ table, id })
  }),
  permanentDeleteItem: async (table, id) => fetchAdmin('/recycle-bin/permanent', {
    method: 'DELETE',
    body: JSON.stringify({ table, id })
  }),
  purgeExpired: async () => fetchAdmin('/recycle-bin/purge-expired', {
    method: 'POST'
  }),

  // Subscribers
  getSubscribers: async () => fetchAdmin('/subscribers'),
  deleteSubscriber: async (id) => fetchAdmin(`/subscribers/${id}`, {
    method: 'DELETE'
  }),
  getSubscriberNotifications: async () => fetchAdmin('/subscriber-notifications'),
};

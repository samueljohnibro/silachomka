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
};

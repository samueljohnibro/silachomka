/**
 * Admin API wrapper
 * Uses relative `/api/admin/*` paths to leverage Vercel rewrites (or Vite proxy).
 * This ensures the HttpOnly SameSite=Strict session cookie is securely transmitted as First-Party.
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

  getBeats: async () => {
    return fetchAdmin('/beats');
  },

  // Note: Add further CRUD methods (e.g. POST/PUT/DELETE /beats) here during F3.4+
};

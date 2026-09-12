// worker/src/index.js

export default {
  /**
   * Cloudflare Worker entry point
   * @param {Request} request 
   * @param {Object} env 
   * @param {Object} ctx 
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Global CORS Configuration
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // JSON response helper
    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    };

    try {
      // Basic API Router
      if (url.pathname.startsWith("/api/health")) {
        return jsonResponse({ 
          status: "ok", 
          message: "silachomka-api worker foundation is live",
          timestamp: new Date().toISOString()
        });
      }

      // Placeholder for future routes (Releases, Beats, Gallery, Videos, Auth)
      if (url.pathname.startsWith("/api/releases")) {
        return jsonResponse({ message: "Releases endpoint not yet implemented" }, 501);
      }

      // Default 404 for unmatched routes
      return jsonResponse({ error: "Not found" }, 404);

    } catch (error) {
      // Global error handler
      return jsonResponse({ error: "Internal Server Error", details: error.message }, 500);
    }
  },
};

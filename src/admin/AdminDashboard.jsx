import { useState, useEffect } from "react";
import { useAdminAuth } from "./useAdminAuth";

function StatCard({ label, value, icon }) {
  return (
    <div className="admin-stat-card">
      <span className="admin-stat-icon" aria-hidden="true">{icon}</span>
      <div>
        <span className="admin-stat-value">{value}</span>
        <span className="admin-stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [relRes, beatRes, vidRes, galRes, mediaRes, linkRes] = await Promise.all([
          fetch("/api/admin/releases"),
          fetch("/api/admin/beats"),
          fetch("/api/admin/music-videos"),
          fetch("/api/admin/gallery-posts"),
          fetch("/api/admin/media-assets"),
          fetch("/api/admin/social-links"),
        ]);
        const [releases, beats, videos, gallery, media, links] = await Promise.all([
          relRes.ok ? relRes.json() : [],
          beatRes.ok ? beatRes.json() : [],
          vidRes.ok ? vidRes.json() : [],
          galRes.ok ? galRes.json() : [],
          mediaRes.ok ? mediaRes.json() : [],
          linkRes.ok ? linkRes.json() : [],
        ]);
        setStats({
          releases: Array.isArray(releases) ? releases.length : 0,
          beats: Array.isArray(beats) ? beats.length : 0,
          videos: Array.isArray(videos) ? videos.length : 0,
          gallery: Array.isArray(gallery) ? gallery.length : 0,
          media: Array.isArray(media) ? media.length : 0,
          links: Array.isArray(links) ? links.length : 0,
        });
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <p>Loading catalogue data...</p>
        </div>
      ) : stats ? (
        <div className="admin-stats-grid">
          <StatCard label="Releases" value={stats.releases} icon="♫" />
          <StatCard label="Beats" value={stats.beats} icon="◉" />
          <StatCard label="Music Videos" value={stats.videos} icon="▶" />
          <StatCard label="Gallery Posts" value={stats.gallery} icon="◻" />
          <StatCard label="Media Assets" value={stats.media} icon="▣" />
          <StatCard label="Social Links" value={stats.links} icon="⊡" />
        </div>
      ) : (
        <div className="admin-error">
          <p>Failed to load dashboard data.</p>
          <button className="admin-btn admin-btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
}

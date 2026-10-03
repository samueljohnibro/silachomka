import React, { useEffect, useState } from 'react';
import { adminApi } from '../../data/adminApi';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    releases: 0,
    tracks: 0,
    beats: 0,
    videos: 0,
    gallery: 0,
    media: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const [releases, tracks, beats, videos, gallery, media] = await Promise.all([
          adminApi.getReleases().catch(() => []),
          adminApi.getTracks().catch(() => []),
          adminApi.getBeats().catch(() => []),
          adminApi.getVideos().catch(() => []),
          adminApi.getGallery().catch(() => []),
          adminApi.getMedia().catch(() => [])
        ]);

        if (mounted) {
          setStats({
            releases: releases.length || 0,
            tracks: tracks.length || 0,
            beats: beats.length || 0,
            videos: videos.length || 0,
            gallery: gallery.length || 0,
            media: media.length || 0
          });
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load dashboard statistics.');
          console.error(err);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchStats();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <h2 className="studio-section-heading" style={{ marginBottom: 24 }}>System Overview</h2>
      
      {error && <div className="admin-login-error" style={{ marginBottom: 24 }}>{error}</div>}
      
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-title">Releases</div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.releases}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Tracks</div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.tracks}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Beats</div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.beats}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Music Videos</div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.videos}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Gallery Posts</div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.gallery}
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-title">Media Assets</div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.media}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 style={{ fontSize: 16, color: 'var(--text-h)', marginBottom: 8 }}>Welcome to the Private Workspace</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          This is the authenticated Silachomka CMS. Select a management area from the sidebar to create, edit, or remove catalogue entities. Changes made here are saved directly to the database and reflect immediately on the public website.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;

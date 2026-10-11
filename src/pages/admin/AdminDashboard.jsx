import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../data/adminApi';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    releases: 0,
    tracks: 0,
    beats: 0,
    videos: 0,
    gallery: 0,
    links: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const [releases, tracks, beats, videos, gallery, links] = await Promise.all([
          adminApi.getReleases().catch(() => []),
          adminApi.getTracks().catch(() => []),
          adminApi.getBeats().catch(() => []),
          adminApi.getVideos().catch(() => []),
          adminApi.getGallery().catch(() => []),
          adminApi.getSocialLinks().catch(() => [])
        ]);

        if (mounted) {
          setStats({
            releases: releases.length || 0,
            tracks: tracks.length || 0,
            beats: beats.length || 0,
            videos: videos.length || 0,
            gallery: gallery.length || 0,
            links: links.length || 0
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
        <Link to="/admin/music" className="admin-stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
          <div className="admin-stat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Releases</span>
            <span style={{ fontSize: 12, color: 'var(--gold)' }}>→</span>
          </div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.releases}
          </div>
        </Link>

        <Link to="/admin/tracks" className="admin-stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
          <div className="admin-stat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Tracks</span>
            <span style={{ fontSize: 12, color: 'var(--gold)' }}>→</span>
          </div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.tracks}
          </div>
        </Link>

        <Link to="/admin/beats" className="admin-stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
          <div className="admin-stat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Beats</span>
            <span style={{ fontSize: 12, color: 'var(--gold)' }}>→</span>
          </div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.beats}
          </div>
        </Link>

        <Link to="/admin/videos" className="admin-stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
          <div className="admin-stat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Music Videos</span>
            <span style={{ fontSize: 12, color: 'var(--gold)' }}>→</span>
          </div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.videos}
          </div>
        </Link>

        <Link to="/admin/gallery" className="admin-stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
          <div className="admin-stat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Gallery Posts</span>
            <span style={{ fontSize: 12, color: 'var(--gold)' }}>→</span>
          </div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.gallery}
          </div>
        </Link>

        <Link to="/admin/links" className="admin-stat-card" style={{ textDecoration: 'none', cursor: 'pointer', display: 'block' }}>
          <div className="admin-stat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Social Links</span>
            <span style={{ fontSize: 12, color: 'var(--gold)' }}>→</span>
          </div>
          <div className="admin-stat-value">
            {isLoading ? <span className="beat-loading-spinner" style={{ display: 'inline-block' }}/> : stats.links}
          </div>
        </Link>
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

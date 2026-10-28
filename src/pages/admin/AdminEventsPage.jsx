import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../data/adminApi';
import { refreshCatalogue } from '../../data/store';
import { useDraftAutosave, DraftAutosaveBanner, DraftListResumeBanner } from '../../utils/useDraftAutosave';
import MediaAssetPicker from '../../components/admin/MediaAssetPicker';
import AdminSortControl from '../../components/admin/AdminSortControl';
import AdminViewToggle from '../../components/admin/AdminViewToggle';
import './admin.css';

const slugify = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const initialEventState = {
  title: '',
  slug: '',
  subtitle: '',
  event_date: '',
  start_time: '20:00',
  end_time: '23:30',
  venue_name: '',
  venue_address: '',
  city: 'Lagos',
  country: 'Nigeria',
  ticket_url: '',
  ticket_price: '₦10,000 Early Bird / ₦25,000 VIP',
  ticket_status: 'AVAILABLE',
  primary_artwork_id: null,
  primary_artwork_url: '',
  additional_artworks: [],
  lineup: [
    { name: 'silachomka', role: 'Headliner / Live Vocalist & Producer' }
  ],
  description: '',
  tagged_gallery_post_ids: [],
  tagged_release_ids: [],
  tagged_beat_ids: [],
  is_published: true,
  is_featured: false,
};

export const generateEventDescription = (ev) => {
  const parts = [];
  parts.push(`Join silachomka for ${ev.title || "Live Performance"}${ev.subtitle ? ` — ${ev.subtitle}` : ""}, an immersive live music and sonic sanctuary experience.`);

  if (ev.event_date) {
    try {
      const [y, m, d] = String(ev.event_date).split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      parts.push(`\n📅 Date & Time:\n${dateStr}${ev.start_time ? ` starting at ${ev.start_time}` : ""}${ev.end_time ? ` until ${ev.end_time}` : ""}`);
    } catch {
      parts.push(`\n📅 Date: ${ev.event_date}`);
    }
  }

  if (ev.venue_name) {
    parts.push(`\n📍 Venue & Location:\n${ev.venue_name}${ev.venue_address ? `, ${ev.venue_address}` : ""}${ev.city ? `, ${ev.city}` : ""}${ev.country ? `, ${ev.country}` : ""}`);
  }

  if (Array.isArray(ev.lineup) && ev.lineup.length > 0) {
    const lineupText = ev.lineup.filter(p => p.name?.trim()).map(p => `• ${p.name.trim()}${p.role ? ` (${p.role.trim()})` : ""}`).join("\n");
    if (lineupText) {
      parts.push(`\n✨ Lineup & Performers:\n${lineupText}`);
    }
  }

  if (ev.ticket_price || ev.ticket_status) {
    parts.push(`\n🎟️ Admission & Passes:\n${ev.ticket_status ? `Status: ${ev.ticket_status}. ` : ""}${ev.ticket_price ? `Passes: ${ev.ticket_price}. ` : ""}${ev.ticket_url ? `Secure passes at the official link.` : "Contact for table and ticket reservations."}`);
  }

  parts.push(`\nExperience unhurried sonic mastery, live instruments, and celestial energy.`);
  return parts.join("\n");
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [galleryList, setGalleryList] = useState([]);
  const [releasesList, setReleasesList] = useState([]);
  const [beatsList, setBeatsList] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'RECENT' | 'PAST' | 'DRAFT'
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('admin_events_view_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const [currentEvent, setCurrentEvent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Asset Pickers
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showAdditionalPicker, setShowAdditionalPicker] = useState(false);

  const {
    hasRestorableDraft,
    lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useDraftAutosave({
    entityKey: currentEvent?.id ? `event_${currentEvent.id}` : 'event_new',
    formData: currentEvent,
    setFormData: setCurrentEvent,
    enabled: view === 'CREATE' || view === 'EDIT',
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsData, galleryData, releasesData, beatsData, mediaData] = await Promise.all([
        adminApi.getEvents(),
        adminApi.getGallery().catch(() => []),
        adminApi.getReleases().catch(() => []),
        adminApi.getBeats().catch(() => []),
        adminApi.getMedia().catch(() => []),
      ]);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setGalleryList(Array.isArray(galleryData) ? galleryData : []);
      setReleasesList(Array.isArray(releasesData) ? releasesData : []);
      setBeatsList(Array.isArray(beatsData) ? beatsData : []);
      setMediaAssets(Array.isArray(mediaData) ? mediaData : []);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartCreate = () => {
    setCurrentEvent({
      ...initialEventState,
      event_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setView('CREATE');
    setSaveSuccess(false);
  };

  const handleStartEdit = (event) => {
    setCurrentEvent({
      ...initialEventState,
      ...event,
      additional_artworks: Array.isArray(event.additional_artworks) ? event.additional_artworks : [],
      lineup: Array.isArray(event.lineup) && event.lineup.length > 0 ? event.lineup : [{ name: 'silachomka', role: 'Headliner' }],
      tagged_gallery_post_ids: Array.isArray(event.tagged_gallery_post_ids) ? event.tagged_gallery_post_ids : [],
      tagged_release_ids: Array.isArray(event.tagged_release_ids) ? event.tagged_release_ids : [],
      tagged_beat_ids: Array.isArray(event.tagged_beat_ids) ? event.tagged_beat_ids : [],
    });
    setView('EDIT');
    setSaveSuccess(false);
  };

  const handleCancel = () => {
    clearDraft();
    setCurrentEvent(null);
    setView('LIST');
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!currentEvent.title?.trim() || !currentEvent.event_date || !currentEvent.venue_name?.trim()) {
      alert('Title, Event Date, and Venue Name are required.');
      return;
    }

    setIsSaving(true);
    try {
      if (view === 'CREATE') {
        const created = await adminApi.createEvent(currentEvent);
        clearDraft(created);
      } else {
        const updated = await adminApi.updateEvent(currentEvent.id, currentEvent);
        clearDraft(updated);
      }

      setSaveSuccess(true);
      await refreshCatalogue();
      await fetchData();

      setTimeout(() => {
        setView('LIST');
        setCurrentEvent(null);
        setSaveSuccess(false);
      }, 700);
    } catch (err) {
      alert(err.message || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteEvent(id);
      setDeleteConfirmId(null);
      await refreshCatalogue();
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add / remove performer in lineup
  const addLineupPerformer = () => {
    setCurrentEvent(prev => ({
      ...prev,
      lineup: [...(prev.lineup || []), { name: '', role: 'Special Guest' }]
    }));
  };

  const updateLineupPerformer = (idx, field, value) => {
    setCurrentEvent(prev => {
      const copy = [...(prev.lineup || [])];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, lineup: copy };
    });
  };

  const removeLineupPerformer = (idx) => {
    setCurrentEvent(prev => ({
      ...prev,
      lineup: (prev.lineup || []).filter((_, i) => i !== idx)
    }));
  };

  // Auto-generate description
  const handleAutoGenerateDesc = () => {
    if (!currentEvent) return;
    const generated = generateEventDescription(currentEvent);
    setCurrentEvent(prev => ({ ...prev, description: generated }));
  };

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'UPCOMING') return e.status === 'UPCOMING' && e.is_published;
      if (statusFilter === 'RECENT') return e.status === 'RECENT' && e.is_published;
      if (statusFilter === 'PAST') return (e.status === 'PAST' || !e.isFuture) && e.is_published;
      if (statusFilter === 'DRAFT') return !e.is_published;
      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.event_date || 0).getTime();
      const dateB = new Date(b.event_date || 0).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [events, statusFilter, sortOrder]);

  const stats = useMemo(() => {
    const upcoming = events.filter(e => e.status === 'UPCOMING' && e.is_published).length;
    const past = events.filter(e => e.status === 'PAST' && e.is_published).length;
    const drafts = events.filter(e => !e.is_published).length;
    return { total: events.length, upcoming, past, drafts };
  }, [events]);

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Events & Tour Management</h1>
          <p className="admin-page-subtitle">
            Manage live performances, tour dates, festival appearances, and public calendar listings.
          </p>
        </div>

        {view === 'LIST' && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="primary-button"
            style={{ height: '42px', padding: '0 20px', fontSize: '13px', fontWeight: 700 }}
          >
            + Create New Event
          </button>
        )}
      </div>

      {view === 'LIST' && (
        <>
          {/* Stats Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div className="admin-stat-card" style={{ flex: 1, minWidth: '140px', padding: '14px 18px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Events</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', display: 'block', marginTop: '4px' }}>{stats.total}</span>
            </div>
            <div className="admin-stat-card" style={{ flex: 1, minWidth: '140px', padding: '14px 18px', borderLeft: '3px solid #4ade80' }}>
              <span style={{ fontSize: '11px', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Upcoming Shows</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80', display: 'block', marginTop: '4px' }}>{stats.upcoming}</span>
            </div>
            <div className="admin-stat-card" style={{ flex: 1, minWidth: '140px', padding: '14px 18px', borderLeft: '3px solid var(--gold)' }}>
              <span style={{ fontSize: '11px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Past History</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)', display: 'block', marginTop: '4px' }}>{stats.past}</span>
            </div>
            <div className="admin-stat-card" style={{ flex: 1, minWidth: '140px', padding: '14px 18px', borderLeft: '3px solid rgba(255, 255, 255, 0.3)' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Drafts</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', display: 'block', marginTop: '4px' }}>{stats.drafts}</span>
            </div>
          </div>

          {/* Filter Pills & View Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `All (${events.length})` },
                { id: 'UPCOMING', label: `Upcoming (${stats.upcoming})` },
                { id: 'PAST', label: `Past Archive (${stats.past})` },
                { id: 'DRAFT', label: `Drafts (${stats.drafts})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className="studio-pill-btn"
                  style={{
                    background: statusFilter === tab.id ? 'var(--gold)' : 'rgba(255, 255, 255, 0.05)',
                    color: statusFilter === tab.id ? '#050507' : 'var(--text)',
                    border: statusFilter === tab.id ? '1px solid var(--gold)' : '1px solid rgba(255, 255, 255, 0.12)',
                    fontWeight: statusFilter === tab.id ? 800 : 600,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AdminSortControl
                value={sortOrder}
                onChange={setSortOrder}
                label="Date"
              />
              <AdminViewToggle
                mode={viewMode}
                onChange={(m) => {
                  setViewMode(m);
                  try { localStorage.setItem('admin_events_view_mode', m); } catch {}
                }}
              />
            </div>
          </div>

          {/* Listing View */}
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
              Loading events...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(10, 10, 16, 0.6)', borderRadius: '12px', border: '1px dashed rgba(223, 194, 125, 0.2)' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🎟️</span>
              <h3 style={{ fontSize: '18px', color: 'var(--text)', margin: '0 0 8px' }}>No events found</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto 20px' }}>
                {statusFilter === 'ALL'
                  ? 'No events exist yet. Create an event to show upcoming concerts, tour dates, and past archives.'
                  : `No events match the selected status: "${statusFilter}".`}
              </p>
              <button
                type="button"
                onClick={handleStartCreate}
                className="primary-button"
                style={{ height: '38px', padding: '0 18px', fontSize: '12px' }}
              >
                + Create Event
              </button>
            </div>
          ) : viewMode === 'table' ? (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Artwork</th>
                    <th>Event Details</th>
                    <th>Date & Time</th>
                    <th>Venue & City</th>
                    <th>Tickets</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => {
                    const artworkUrl = event.primary_artwork_url || event.cover || event.image || '/og-image.png';
                    const isUpcoming = event.status === 'UPCOMING';
                    return (
                      <tr key={event.id}>
                        <td>
                          <div style={{ width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', background: '#08080c', border: '1px solid rgba(223, 194, 125, 0.2)' }}>
                            <img
                              src={artworkUrl}
                              alt={event.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.src = '/og-image.png'; }}
                            />
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                            {event.title}
                          </div>
                          {event.subtitle && (
                            <div style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '2px' }}>
                              {event.subtitle}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                            Slug: /{event.slug}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: isUpcoming ? '#4ade80' : 'var(--text)' }}>
                            {event.event_date}
                          </div>
                          {event.start_time && (
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {event.venue_name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {event.city ? `${event.city}, ` : ''}{event.country || ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>
                            {event.ticket_price || 'Free / TBA'}
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                            {event.ticket_status || 'AVAILABLE'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="studio-pill-btn"
                            style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              fontWeight: 700,
                              background: !event.is_published
                                ? 'rgba(255, 255, 255, 0.1)'
                                : isUpcoming
                                ? 'rgba(74, 222, 128, 0.15)'
                                : 'rgba(223, 194, 125, 0.15)',
                              color: !event.is_published
                                ? 'var(--muted)'
                                : isUpcoming
                                ? '#4ade80'
                                : 'var(--gold)',
                              border: !event.is_published
                                ? '1px solid rgba(255, 255, 255, 0.2)'
                                : isUpcoming
                                ? '1px solid rgba(74, 222, 128, 0.4)'
                                : '1px solid rgba(223, 194, 125, 0.3)',
                            }}
                          >
                            {!event.is_published ? 'DRAFT' : event.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <a
                              href={`/events/${event.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="studio-pill-btn"
                              style={{ fontSize: '11px', padding: '4px 10px', textDecoration: 'none' }}
                              title="View Public Page"
                            >
                              ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(event)}
                              className="studio-pill-btn"
                              style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--gold)' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(event.id)}
                              className="studio-pill-btn"
                              style={{ fontSize: '11px', padding: '4px 10px', color: '#f87171' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredEvents.map(event => {
                const artworkUrl = event.primary_artwork_url || event.cover || event.image || '/og-image.png';
                const isUpcoming = event.status === 'UPCOMING';
                return (
                  <div
                    key={event.id}
                    style={{
                      background: 'rgba(16, 16, 24, 0.85)',
                      border: '1px solid rgba(223, 194, 125, 0.22)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#08080c' }}>
                      <img
                        src={artworkUrl}
                        alt={event.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = '/og-image.png'; }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: isUpcoming ? '#4ade80' : 'var(--gold)',
                          color: '#050507',
                        }}
                      >
                        {event.status}
                      </span>
                    </div>

                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                          {event.title}
                        </h3>
                        {event.subtitle && (
                          <p style={{ fontSize: '12px', color: 'var(--gold)', margin: '0 0 8px' }}>
                            {event.subtitle}
                          </p>
                        )}
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 4px' }}>
                          📅 {event.event_date} {event.start_time ? `• ${event.start_time}` : ''}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 12px' }}>
                          📍 {event.venue_name}, {event.city}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)' }}>
                          {event.ticket_price || 'Free / TBA'}
                        </span>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(event)}
                            className="studio-pill-btn"
                            style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--gold)' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(event.id)}
                            className="studio-pill-btn"
                            style={{ fontSize: '11px', padding: '4px 10px', color: '#f87171' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      {(view === 'CREATE' || view === 'EDIT') && currentEvent && (
        <form onSubmit={handleSave} className="admin-form-container" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <DraftAutosaveBanner
            lastSavedAt={lastSavedAt}
            hasRestorableDraft={hasRestorableDraft}
            onRestore={restoreDraft}
            onDiscard={discardDraft}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {view === 'CREATE' ? 'Create Live Event' : `Edit: ${currentEvent.title}`}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {view === 'CREATE' ? 'Add a new performance, concert, or festival appearance.' : 'Update event details, artwork, lineup, and cross-tags.'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCancel}
                className="studio-pill-btn"
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="primary-button"
                style={{ height: '38px', padding: '0 22px', fontSize: '13px', fontWeight: 700 }}
              >
                {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Event'}
              </button>
            </div>
          </div>

          {/* Section 1: Core Details */}
          <div className="admin-form-section">
            <h3 className="admin-form-section-title">1. Essential Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label className="admin-label">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chomka Live at Eko Hotel"
                  value={currentEvent.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentEvent(prev => ({
                      ...prev,
                      title: val,
                      slug: view === 'CREATE' ? slugify(val) : prev.slug,
                    }));
                  }}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Custom URL Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. chomka-live-eko-hotel"
                  value={currentEvent.slug}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Subtitle / Tour Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. The Sacred Sanctuary Tour"
                  value={currentEvent.subtitle || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Event Date *</label>
                <input
                  type="date"
                  required
                  value={currentEvent.event_date || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, event_date: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Start Time</label>
                <input
                  type="time"
                  value={currentEvent.start_time || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, start_time: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">End Time</label>
                <input
                  type="time"
                  value={currentEvent.end_time || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, end_time: e.target.value }))}
                  className="admin-input"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Venue & Location */}
          <div className="admin-form-section">
            <h3 className="admin-form-section-title">2. Venue & Location</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label className="admin-label">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Ballroom, Eko Hotel & Suites"
                  value={currentEvent.venue_name || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, venue_name: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Venue Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 1415 Adetokunbo Ademola St, VI"
                  value={currentEvent.venue_address || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, venue_address: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">City</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos"
                  value={currentEvent.city || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, city: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Country</label>
                <input
                  type="text"
                  placeholder="e.g. Nigeria"
                  value={currentEvent.country || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, country: e.target.value }))}
                  className="admin-input"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Tickets & Access */}
          <div className="admin-form-section">
            <h3 className="admin-form-section-title">3. Tickets & Passes</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label className="admin-label">Ticket Purchase / RSVP URL</label>
                <input
                  type="url"
                  placeholder="https://tix.africa/... or https://eventbrite.com/..."
                  value={currentEvent.ticket_url || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, ticket_url: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Ticket Price Details</label>
                <input
                  type="text"
                  placeholder="e.g. ₦10,000 Early Bird / ₦25,000 VIP"
                  value={currentEvent.ticket_price || ''}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, ticket_price: e.target.value }))}
                  className="admin-input"
                />
              </div>

              <div>
                <label className="admin-label">Ticket Availability Status</label>
                <select
                  value={currentEvent.ticket_status || 'AVAILABLE'}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, ticket_status: e.target.value }))}
                  className="admin-input"
                >
                  <option value="AVAILABLE">AVAILABLE (Passes on Sale)</option>
                  <option value="FREE">FREE ENTRY (RSVP)</option>
                  <option value="INVITE_ONLY">INVITE ONLY (Guest List)</option>
                  <option value="SOLDOUT">SOLD OUT</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Primary Artwork & Additional Flyers */}
          <div className="admin-form-section">
            <h3 className="admin-form-section-title">4. Event Posters & Flyers</h3>
            
            <div style={{ marginBottom: '18px' }}>
              <label className="admin-label">Primary Event Poster / Artwork</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', background: '#08080c', border: '1px solid rgba(223, 194, 125, 0.3)' }}>
                  <img
                    src={currentEvent.primary_artwork_url || '/og-image.png'}
                    alt="Event poster"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.src = '/og-image.png'; }}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPrimaryPicker(true)}
                    className="studio-pill-btn"
                    style={{ marginBottom: '8px' }}
                  >
                    Select from Media Library
                  </button>
                  <input
                    type="text"
                    placeholder="Or enter direct image URL"
                    value={currentEvent.primary_artwork_url || ''}
                    onChange={(e) => setCurrentEvent(prev => ({ ...prev, primary_artwork_url: e.target.value }))}
                    className="admin-input"
                    style={{ width: '280px', display: 'block' }}
                  />
                </div>
              </div>
            </div>

            {/* Additional Artworks / Flyers */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label className="admin-label" style={{ margin: 0 }}>Additional Flyers & Stage Photos</label>
                <button
                  type="button"
                  onClick={() => setShowAdditionalPicker(true)}
                  className="studio-pill-btn"
                  style={{ fontSize: '11px', padding: '3px 10px' }}
                >
                  + Add Flyer from Library
                </button>
              </div>

              {Array.isArray(currentEvent.additional_artworks) && currentEvent.additional_artworks.length > 0 ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {currentEvent.additional_artworks.map((art, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(223, 194, 125, 0.3)' }}>
                      <img
                        src={typeof art === 'string' ? art : art?.url || art?.src}
                        alt="Flyer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => setCurrentEvent(prev => ({
                          ...prev,
                          additional_artworks: prev.additional_artworks.filter((_, i) => i !== idx)
                        }))}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: '#f87171', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '10px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>No additional flyers added yet.</p>
              )}
            </div>
          </div>

          {/* Section 5: Lineup & Performers */}
          <div className="admin-form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 className="admin-form-section-title" style={{ margin: 0 }}>5. Star Lineup, DJs & Performers</h3>
              <button
                type="button"
                onClick={addLineupPerformer}
                className="studio-pill-btn"
                style={{ fontSize: '11px', padding: '4px 12px' }}
              >
                + Add Performer / DJ
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentEvent.lineup || []).map((perf, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(5, 5, 8, 0.6)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input
                    type="text"
                    placeholder="Artist / DJ Name (e.g. DJ Spinall, Burna Boy)"
                    value={perf.name || ''}
                    onChange={(e) => updateLineupPerformer(idx, 'name', e.target.value)}
                    className="admin-input"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Headliner, Guest DJ, Live Band)"
                    value={perf.role || ''}
                    onChange={(e) => updateLineupPerformer(idx, 'role', e.target.value)}
                    className="admin-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeLineupPerformer(idx)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px', padding: '0 8px' }}
                    title="Remove performer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Event Description & Smart Auto-Generator */}
          <div className="admin-form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 className="admin-form-section-title" style={{ margin: 0 }}>6. Description & Story</h3>
              <button
                type="button"
                onClick={handleAutoGenerateDesc}
                className="studio-pill-btn"
                style={{
                  background: 'rgba(223, 194, 125, 0.15)',
                  color: 'var(--gold)',
                  border: '1px solid var(--gold)',
                  fontWeight: 700,
                  fontSize: '11px',
                  padding: '5px 12px',
                }}
              >
                ✨ Auto-Generate Description
              </button>
            </div>
            <textarea
              rows={6}
              placeholder="Detailed description of the event, expectations, dress code, guest info..."
              value={currentEvent.description || ''}
              onChange={(e) => setCurrentEvent(prev => ({ ...prev, description: e.target.value }))}
              className="admin-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Section 7: Cross-Tagging (Gallery & Releases) */}
          <div className="admin-form-section">
            <h3 className="admin-form-section-title">7. Cross-Tagging (Connect to Gallery & Music)</h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 14px' }}>
              Tagged gallery posts and music releases will show on this event page, and those items will link back to this event!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
              {/* Tag Gallery Posts */}
              <div>
                <label className="admin-label">Tag Gallery Posts / Moments</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(5, 5, 8, 0.7)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {galleryList.map(g => {
                    const isChecked = (currentEvent.tagged_gallery_post_ids || []).includes(g.id);
                    return (
                      <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)', marginBottom: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = currentEvent.tagged_gallery_post_ids || [];
                            setCurrentEvent(prev => ({
                              ...prev,
                              tagged_gallery_post_ids: e.target.checked
                                ? [...cur, g.id]
                                : cur.filter(id => id !== g.id)
                            }));
                          }}
                        />
                        <span>{g.title || g.caption || g.slug}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tag Releases */}
              <div>
                <label className="admin-label">Tag Music Releases / Songs</label>
                <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(5, 5, 8, 0.7)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {releasesList.map(r => {
                    const isChecked = (currentEvent.tagged_release_ids || []).includes(r.id);
                    return (
                      <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text)', marginBottom: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = currentEvent.tagged_release_ids || [];
                            setCurrentEvent(prev => ({
                              ...prev,
                              tagged_release_ids: e.target.checked
                                ? [...cur, r.id]
                                : cur.filter(id => id !== r.id)
                            }));
                          }}
                        />
                        <span>{r.title} ({r.type || 'Release'})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 8: Publishing Controls */}
          <div className="admin-form-section">
            <h3 className="admin-form-section-title">8. Visibility & Publishing</h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(currentEvent.is_published)}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, is_published: e.target.checked }))}
                />
                <strong style={{ color: currentEvent.is_published ? '#4ade80' : 'var(--muted)' }}>
                  {currentEvent.is_published ? '✓ Published (Visible on Public Website & Calendar)' : 'Draft / Hidden'}
                </strong>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(currentEvent.is_featured)}
                  onChange={(e) => setCurrentEvent(prev => ({ ...prev, is_featured: e.target.checked }))}
                />
                <span>★ Feature in Top Events / Hero Carousel</span>
              </label>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={handleCancel}
              className="studio-pill-btn"
              style={{ padding: '10px 20px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="primary-button"
              style={{ height: '42px', padding: '0 28px', fontSize: '14px', fontWeight: 800 }}
            >
              {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save & Publish Event'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--text)', margin: '0 0 10px' }}>Move to Recycle Bin?</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
              This event will be moved to the Recycle Bin and removed from the public website and calendar. It can be restored within 60 days.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="studio-pill-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="primary-button"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {isDeleting ? 'Deleting...' : 'Move to Recycle Bin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Media Asset Picker */}
      {showPrimaryPicker && (
        <MediaAssetPicker
          mediaAssets={mediaAssets}
          onSelect={(asset) => {
            setCurrentEvent(prev => ({
              ...prev,
              primary_artwork_id: asset.id,
              primary_artwork_url: `/api/media/asset/${asset.id}`,
            }));
            setShowPrimaryPicker(false);
          }}
          onClose={() => setShowPrimaryPicker(false)}
        />
      )}

      {/* Additional Media Asset Picker */}
      {showAdditionalPicker && (
        <MediaAssetPicker
          mediaAssets={mediaAssets}
          onSelect={(asset) => {
            const url = `/api/media/asset/${asset.id}`;
            setCurrentEvent(prev => ({
              ...prev,
              additional_artworks: [...(prev.additional_artworks || []), { id: asset.id, url, caption: asset.alt_text || '' }]
            }));
            setShowAdditionalPicker(false);
          }}
          onClose={() => setShowAdditionalPicker(false)}
        />
      )}
    </div>
  );
}

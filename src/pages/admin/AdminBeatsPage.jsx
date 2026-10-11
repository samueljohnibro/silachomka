import React, { useState, useEffect } from 'react';
import { adminApi } from '../../data/adminApi';
import MediaAssetPicker from '../../components/admin/MediaAssetPicker';
import AdminSortControl from '../../components/admin/AdminSortControl';
import AdminViewToggle from '../../components/admin/AdminViewToggle';
import './admin.css';

const slugify = (text) => (text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const AdminBeatsPage = () => {
  const [beats, setBeats] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('LIST'); // LIST, CREATE, EDIT
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = newest first, 'asc' = oldest first
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('admin_listing_view_mode') || 'table';
    } catch {
      return 'table';
    }
  });
  
  const [currentBeat, setCurrentBeat] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch list
  const fetchBeats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [beatsData, mediaData] = await Promise.all([
        adminApi.getBeats(),
        adminApi.getMediaAssets().catch(() => [])
      ]);
      setBeats(beatsData);
      setMediaAssets(mediaData);
    } catch (err) {
      setError(err.message || 'Failed to load beats.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeats();
  }, []);

  const handleEditClick = (beat) => {
    setCurrentBeat({ ...beat });
    setView('EDIT');
    setError(null);
  };

  const handleCreateClick = () => {
    setCurrentBeat({
      title: '',
      slug: '',
      genre: '',
      short_genre: '',
      bpm: '',
      beat_key: '',
      description: '',
      producer: 'silachomka',
      audio_asset_id: null,
      image_asset_id: null,
      video_asset_id: null,
      selar_basic_url: '',
      selar_premium_url: '',
      selar_ultimate_url: '',
      status: 'PUBLISHED',
      created_at: new Date().toISOString().split('T')[0],
      categories: []
    });
    setView('CREATE');
    setError(null);
  };

  const handleCancelForm = () => {
    setCurrentBeat(null);
    setView('LIST');
    setError(null);
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    setError(null);
    try {
      await adminApi.deleteBeat(id);
      setDeleteConfirmId(null);
      await fetchBeats();
    } catch (err) {
      setError(err.message || 'Failed to delete beat.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentBeat.title || !currentBeat.title.trim()) {
      setError('Title is required.');
      return;
    }
    
    // Auto-generate slug on create, or preserve on edit
    let slug = currentBeat.slug ? currentBeat.slug.trim() : slugify(currentBeat.title);
    if (!slug) {
      slug = 'beat-' + Date.now();
    }

    try {
      setIsSaving(true);
      const payload = {
        ...currentBeat,
        slug
      };

      // Sanitize nullable fields
      const nullableFields = [
        'genre', 'short_genre', 'bpm', 'beat_key', 'description', 
        'mood', 'selar_basic_url', 'selar_premium_url', 'selar_ultimate_url',
        'audio_asset_id', 'image_asset_id', 'video_asset_id'
      ];
      nullableFields.forEach(f => {
        if (payload[f] === '') payload[f] = null;
      });

      if (view === 'CREATE') {
        await adminApi.createBeat(payload);
      } else {
        await adminApi.updateBeat(payload.id, payload);
      }

      await fetchBeats();
      setView('LIST');
      setCurrentBeat(null);
    } catch (err) {
      setError(err.message || 'Failed to save beat.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentBeat(prev => ({ ...prev, [name]: value }));
  };

  // Sort beats by editable created_at
  const sortedBeats = [...beats].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortOrder === 'desc' ? db - da : da - db;
  });

  // Helper to find image/video preview URL
  const getMediaUrl = (assetId) => {
    if (!assetId) return null;
    const asset = mediaAssets.find(m => m.id === assetId);
    return asset ? '/' + asset.r2_key : null;
  };

  if (isLoading && view === 'LIST') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <div className="beat-loading-spinner" />
      </div>
    );
  }

  if (view === 'CREATE' || view === 'EDIT') {
    return (
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === 'CREATE' ? 'Create Beat' : 'Edit Beat'}
          </h2>
          <button onClick={handleCancelForm} className="studio-pill-btn" style={{ background: 'transparent', color: 'var(--text)' }} disabled={isSaving}>
            Cancel
          </button>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Title *</label>
              <input type="text" name="title" className="studio-input" value={currentBeat.title || ''} onChange={handleChange} required disabled={isSaving} placeholder="e.g. SHINE" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Genre</label>
              <input type="text" name="genre" className="studio-input" value={currentBeat.genre || ''} onChange={handleChange} disabled={isSaving} placeholder="e.g. Afro × Alternative" />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Short Genre</label>
              <input type="text" name="short_genre" className="studio-input" value={currentBeat.short_genre || ''} onChange={handleChange} disabled={isSaving} placeholder="e.g. Afro" />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>BPM</label>
              <input type="number" name="bpm" className="studio-input" value={currentBeat.bpm || ''} onChange={handleChange} disabled={isSaving} placeholder="e.g. 100" />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Key</label>
              <input type="text" name="beat_key" className="studio-input" value={currentBeat.beat_key || ''} onChange={handleChange} disabled={isSaving} placeholder="e.g. C# minor" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Release Date * (Editable)</label>
              <input 
                type="date" 
                name="created_at" 
                className="studio-input" 
                value={currentBeat.created_at ? currentBeat.created_at.split('T')[0] : ''} 
                onChange={handleChange} 
                disabled={isSaving} 
              />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Producer</label>
              <input type="text" name="producer" className="studio-input" value={currentBeat.producer || 'silachomka'} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Status</label>
              <select name="status" className="studio-input" value={currentBeat.status || 'DRAFT'} onChange={handleChange} disabled={isSaving} style={{ height: '48px' }}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>

          <div className="studio-field" style={{ textAlign: 'left' }}>
            <label>Description (Optional)</label>
            <textarea name="description" className="studio-input" value={currentBeat.description || ''} onChange={handleChange} disabled={isSaving} style={{ minHeight: '80px', resize: 'vertical' }} />
          </div>

          <h3 style={{ fontSize: 14, color: 'var(--gold)', marginTop: '16px', marginBottom: '8px' }}>Beat Media Files</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <MediaAssetPicker
              label="Cover Art (Image)"
              assetType="IMAGE"
              value={currentBeat.image_asset_id}
              onChange={(id) => setCurrentBeat(prev => ({ ...prev, image_asset_id: id }))}
              disabled={isSaving}
              hint="Select or upload beat artwork"
            />
            <MediaAssetPicker
              label="Preview Audio (MP3)"
              assetType="AUDIO"
              value={currentBeat.audio_asset_id}
              onChange={(id) => setCurrentBeat(prev => ({ ...prev, audio_asset_id: id }))}
              disabled={isSaving}
              hint="Select or upload preview audio"
            />
            <MediaAssetPicker
              label="Visualizer (GIF/Video)"
              assetType="VIDEO"
              value={currentBeat.video_asset_id}
              onChange={(id) => setCurrentBeat(prev => ({ ...prev, video_asset_id: id }))}
              disabled={isSaving}
              hint="Select or upload visualizer GIF/video"
            />
          </div>

          <h3 style={{ fontSize: 14, color: 'var(--gold)', marginTop: '16px', marginBottom: '8px' }}>Selar Purchase Links</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Basic License URL</label>
              <input type="url" name="selar_basic_url" className="studio-input" value={currentBeat.selar_basic_url || ''} onChange={handleChange} disabled={isSaving} placeholder="https://selar.com/..." />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Premium License URL</label>
              <input type="url" name="selar_premium_url" className="studio-input" value={currentBeat.selar_premium_url || ''} onChange={handleChange} disabled={isSaving} placeholder="https://selar.com/..." />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Ultimate License URL</label>
              <input type="url" name="selar_ultimate_url" className="studio-input" value={currentBeat.selar_ultimate_url || ''} onChange={handleChange} disabled={isSaving} placeholder="https://selar.com/..." />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Beat'}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>Beats Management</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <AdminSortControl sortOrder={sortOrder} onChange={setSortOrder} label="Sort Beats" />
            <AdminViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>
        <button className="primary-button" onClick={handleCreateClick}>+ Create Beat</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {sortedBeats.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Beats Found</h2>
          <p>You haven't added any beats to the catalogue yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Beat</button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID / CARDS VIEW */
        <div className="admin-listing-grid">
          {sortedBeats.map(beat => {
            const imageUrl = getMediaUrl(beat.image_asset_id) || getMediaUrl(beat.video_asset_id);
            const audioUrl = getMediaUrl(beat.audio_asset_id);
            const displayDate = beat.created_at ? beat.created_at.split('T')[0] : '—';
            return (
              <div key={beat.id} className="admin-item-card">
                <div>
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', background: '#000', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border)' }}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={beat.title}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--muted)', fontSize: '12px' }}>
                        No Visual
                      </div>
                    )}
                    <span style={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: 10, 
                      fontWeight: 700, 
                      textTransform: 'uppercase',
                      background: beat.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)',
                      color: '#000'
                    }}>
                      {beat.status || 'DRAFT'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, margin: '0 0 4px 0', color: 'var(--text-h)' }}>{beat.title}</h3>
                  <div style={{ fontSize: 12, color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {beat.genre || 'Beat'} • {beat.bpm ? `${beat.bpm} BPM` : ''} {beat.beat_key ? `(${beat.beat_key})` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    Date: {displayDate} • prod. {beat.producer || 'silachomka'}
                  </div>

                  {audioUrl && (
                    <div style={{ marginTop: 10 }}>
                      <audio controls src={audioUrl} style={{ width: '100%', height: 32 }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <button 
                    onClick={() => handleEditClick(beat)}
                    className="studio-pill-btn"
                    style={{ fontSize: 12 }}
                  >
                    Edit
                  </button>
                  {deleteConfirmId === beat.id ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#fca5a5' }}>Delete?</span>
                      <button 
                        onClick={() => handleDelete(beat.id)} 
                        className="studio-pill-btn" 
                        style={{ background: 'rgba(220,38,38,0.2)', color: '#fca5a5', borderColor: '#fca5a5', fontSize: 11, padding: '2px 8px' }}
                        disabled={isDeleting}
                      >
                        Yes
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(null)} 
                        className="studio-pill-btn"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeleteConfirmId(beat.id)}
                      className="studio-pill-btn"
                      style={{ background: 'transparent', color: 'var(--muted)', fontSize: 12 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="admin-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(223, 194, 125, 0.05)' }}>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Genre</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>BPM / Key</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedBeats.map(beat => (
                <tr key={beat.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500 }}>
                    {beat.title}
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400, marginTop: 4 }}>/{beat.slug}</div>
                  </td>
                  <td style={{ padding: '16px' }}>{beat.genre || '—'}</td>
                  <td style={{ padding: '16px' }}>
                    {beat.bpm ? `${beat.bpm} BPM` : '—'} 
                    {beat.beat_key ? <span style={{ marginLeft: 8, color: 'var(--gold)' }}>{beat.beat_key}</span> : ''}
                  </td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--muted)' }}>
                    {beat.created_at ? beat.created_at.split('T')[0] : '—'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: 10, 
                      fontWeight: 700, 
                      textTransform: 'uppercase',
                      background: beat.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: beat.status === 'PUBLISHED' ? '#34d399' : '#fbbf24'
                    }}>
                      {beat.status || 'DRAFT'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {deleteConfirmId === beat.id ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#fca5a5' }}>Confirm?</span>
                        <button 
                          onClick={() => handleDelete(beat.id)} 
                          className="studio-pill-btn" 
                          style={{ background: 'rgba(220,38,38,0.2)', color: '#fca5a5', borderColor: '#fca5a5' }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? '...' : 'Yes'}
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(null)} 
                          className="studio-pill-btn"
                          disabled={isDeleting}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditClick(beat)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(beat.id)}
                          className="studio-pill-btn"
                          style={{ background: 'transparent', color: 'var(--muted)' }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminBeatsPage;

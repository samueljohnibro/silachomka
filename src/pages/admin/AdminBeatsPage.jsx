import React, { useState, useEffect } from 'react';
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

// Req #2: Normalize genre words to uppercase, preserve lowercase 'x' separator, and append 'TYPE BEAT'
const normalizeBeatGenre = (raw) => {
  if (!raw || !String(raw).trim()) return { genre: null, short_genre: null };
  const stripped = String(raw).trim().replace(/\s+type\s+beat$/i, '').trim();
  if (!stripped) return { genre: null, short_genre: null };
  const parts = stripped
    .split(/\s+[xX×]\s+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  const shortGenre = parts.join(' x ');
  return {
    genre: `${shortGenre} TYPE BEAT`,
    short_genre: shortGenre,
  };
};

const AdminBeatsPage = () => {
  const [beats, setBeats] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [selarPricing, setSelarPricing] = useState(null);
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
  const [saveState, setSaveState] = useState('IDLE'); // 'IDLE' | 'SAVING' | 'SAVED'
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    hasRestorableDraft,
    lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useDraftAutosave({
    entityKey: currentBeat?.id ? `beat_${currentBeat.id}` : 'beat_new',
    formData: currentBeat,
    setFormData: setCurrentBeat,
    enabled: view === 'CREATE' || view === 'EDIT',
  });

  // Fetch list and Selar authoritative pricing
  const fetchBeats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [beatsData, mediaData, pricingData] = await Promise.all([
        adminApi.getBeats(),
        adminApi.getMediaAssets().catch(() => []),
        fetch('/api/beats/pricing?currency=NGN').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      setBeats(beatsData);
      setMediaAssets(mediaData);
      if (pricingData?.success) setSelarPricing(pricingData);
    } catch (err) {
      setError(err.message || 'Failed to load beats.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeats();
  }, []);

  const getSelarBeatPrice = (beat, tier) => {
    if (!beat || !selarPricing?.products) return null;
    const urlField = tier === 'basic' ? beat.selar_basic_url : (tier === 'premium' ? beat.selar_premium_url : beat.selar_ultimate_url);
    if (urlField) {
      const slug = urlField.split('/').pop()?.split('?')[0];
      if (slug && selarPricing.products[slug]) {
        return selarPricing.products[slug].formatted;
      }
    }
    const normalized = (beat.slug || '').replace(/[^a-z0-9]/g, '');
    if (selarPricing.byBeat?.[normalized]?.[tier]) {
      return selarPricing.byBeat[normalized][tier].formatted;
    }
    return null;
  };

  const handleEditClick = (beat) => {
    const rawGenre = (beat.short_genre || beat.genre || '').replace(/\s+type\s+beat$/i, '').trim();
    setCurrentBeat({ 
      ...beat,
      genre: rawGenre,
    });
    setView('EDIT');
    setError(null);
    setSaveSuccess(false);
    setSaveState('IDLE');
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
      status: 'DRAFT',
      created_at: new Date().toISOString().split('T')[0],
      categories: []
    });
    setView('CREATE');
    setError(null);
    setSaveSuccess(false);
    setSaveState('IDLE');
  };

  const handleCancelForm = () => {
    setCurrentBeat(null);
    setView('LIST');
    setError(null);
    setSaveState('IDLE');
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    setError(null);
    try {
      await adminApi.deleteBeat(id);
      setDeleteConfirmId(null);
      await fetchBeats();
      refreshCatalogue();
    } catch (err) {
      setError(err.message || 'Failed to delete beat.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e, asDraft = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentBeat.title || !currentBeat.title.trim()) {
      setError('Title is required.');
      return;
    }

    // Auto-generate slug on create, or preserve on edit
    let slug = currentBeat.slug ? currentBeat.slug.trim() : slugify(currentBeat.title);
    if (!slug) {
      slug = 'beat-' + Date.now();
    }

    // Req #2: Normalize genre format ("Trap x Rap" -> "TRAP x RAP TYPE BEAT", short_genre = "TRAP x RAP")
    const { genre: finalGenre, short_genre: finalShortGenre } = normalizeBeatGenre(currentBeat.genre);

    // Req #10: Automatic status determination from release date / schedule
    const schedDate = currentBeat.scheduled_at ? new Date(currentBeat.scheduled_at) : null;
    const createdDate = currentBeat.created_at ? new Date(currentBeat.created_at) : null;
    const isFuture =
      (schedDate && !isNaN(schedDate.getTime()) && schedDate > new Date()) ||
      (createdDate && !isNaN(createdDate.getTime()) && createdDate > new Date());
    const targetStatus = asDraft ? 'DRAFT' : (isFuture ? 'SCHEDULED' : 'PUBLISHED');

    try {
      setIsSaving(true);
      setSaveState('SAVING');
      const payload = {
        ...currentBeat,
        slug,
        status: targetStatus,
        is_draft: asDraft,
        genre: finalGenre,
        short_genre: finalShortGenre,
      };

      // Sanitize nullable fields
      const nullableFields = [
        'bpm', 'beat_key', 'description', 
        'mood', 'selar_basic_url', 'selar_premium_url', 'selar_ultimate_url',
        'audio_asset_id', 'image_asset_id', 'video_asset_id'
      ];
      nullableFields.forEach(f => {
        if (payload[f] === '') payload[f] = null;
      });

      if (view === 'CREATE') {
        const created = await adminApi.createBeat(payload);
        clearDraft();
        await fetchBeats();
        refreshCatalogue();
        setCurrentBeat(created);
        setView('EDIT');
      } else {
        const updated = await adminApi.updateBeat(payload.id, payload);
        clearDraft();
        await fetchBeats();
        refreshCatalogue();
        setCurrentBeat(updated);
      }

      setSaveSuccess(true);
      setSaveState('SAVED');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save beat.');
      setSaveState('IDLE');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSaveState('IDLE');
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
    if (asset?.has_file_data) return `/api/media/asset/${asset.id}`;
    if (asset?.r2_key) {
      return asset.r2_key.startsWith('http') ? asset.r2_key : '/' + asset.r2_key.replace(/^\//, '');
    }
    return `/api/media/asset/${assetId}`;
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

        <DraftAutosaveBanner
          hasRestorableDraft={hasRestorableDraft}
          lastSavedAt={lastSavedAt}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />

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
              <input 
                type="text" 
                name="genre" 
                className="studio-input" 
                value={currentBeat.genre || ''} 
                onChange={handleChange} 
                disabled={isSaving} 
                placeholder="e.g. Trap x Rap or Afro x Alternative" 
              />
              <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                Formatted: <strong style={{ color: 'var(--gold)' }}>{normalizeBeatGenre(currentBeat.genre).genre || '—'}</strong>
              </span>
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

          {/* Authoritative Selar License Pricing Card */}
          <div style={{
            padding: '16px 20px',
            background: 'rgba(223, 194, 125, 0.04)',
            border: '1px solid rgba(223, 194, 125, 0.25)',
            borderRadius: '8px',
            marginTop: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: 14, color: 'var(--gold)', margin: 0, fontWeight: 600 }}>
                Authoritative Selar License Pricing
              </h3>
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: '3px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                ● Selar Store Connected
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
              Selar is the commercial source of truth. License pricing, multi-currency conversion, and global checkout delivery are managed authoritatively on Selar. Manual pricing entry is not required.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Basic License</div>
                <div style={{ fontSize: 18, color: 'var(--text-h)', fontWeight: 700, marginTop: 4 }}>
                  {getSelarBeatPrice(currentBeat, 'basic') || 'From Selar'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>Standard Lease · MP3</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Premium License</div>
                <div style={{ fontSize: 18, color: 'var(--text-h)', fontWeight: 700, marginTop: 4 }}>
                  {getSelarBeatPrice(currentBeat, 'premium') || 'From Selar'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>Master Lease · WAV + MP3</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Exclusive / Ultimate</div>
                <div style={{ fontSize: 18, color: 'var(--text-h)', fontWeight: 700, marginTop: 4 }}>
                  {getSelarBeatPrice(currentBeat, 'ultimate') || 'From Selar'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>Trackout Stems · Full Buyout</div>
              </div>
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
              <label>Lifecycle Status (Automatic)</label>
              {(() => {
                const schedDate = currentBeat.scheduled_at ? new Date(currentBeat.scheduled_at) : null;
                const createdDate = currentBeat.created_at ? new Date(currentBeat.created_at) : null;
                const isFuture =
                  (schedDate && !isNaN(schedDate.getTime()) && schedDate > new Date()) ||
                  (createdDate && !isNaN(createdDate.getTime()) && createdDate > new Date());
                const computedStatus =
                  view === 'CREATE' && saveState !== 'SAVED'
                    ? 'DRAFT (WILL ' + (isFuture ? 'SCHEDULE' : 'PUBLISH') + ' ON SAVE)'
                    : isFuture
                    ? 'SCHEDULED'
                    : 'PUBLISHED';
                return (
                  <div
                    className="studio-input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '44px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      cursor: 'default',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color:
                        view === 'CREATE' && saveState !== 'SAVED'
                          ? '#fbbf24'
                          : isFuture
                          ? '#38bdf8'
                          : '#34d399',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          view === 'CREATE' && saveState !== 'SAVED'
                            ? '#fbbf24'
                            : isFuture
                            ? '#38bdf8'
                            : '#34d399',
                      }}
                    />
                    <span>{computedStatus}</span>
                  </div>
                );
              })()}
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Schedule Publication (Optional)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="datetime-local" 
                  name="scheduled_at" 
                  className="studio-input" 
                  value={currentBeat.scheduled_at ? currentBeat.scheduled_at.slice(0, 16) : ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentBeat(prev => ({
                      ...prev,
                      scheduled_at: val ? new Date(val).toISOString() : null,
                      status: val ? 'SCHEDULED' : (prev.status === 'SCHEDULED' ? 'PUBLISHED' : prev.status)
                    }));
                  }} 
                  disabled={isSaving} 
                />
                {currentBeat.scheduled_at && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentBeat(prev => ({
                        ...prev,
                        scheduled_at: null,
                        status: prev.status === 'SCHEDULED' ? 'PUBLISHED' : prev.status
                      }));
                    }}
                    className="studio-pill-btn"
                    style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                    title="Publish immediately / clear schedule"
                  >
                    Clear (Publish Now)
                  </button>
                )}
              </div>
              {currentBeat.scheduled_at && (
                <span style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, display: 'block' }}>
                  ⏰ Scheduled for {new Date(currentBeat.scheduled_at).toLocaleString()}
                </span>
              )}
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
              onChange={(id, assetRecord) => {
                setSaveState('IDLE');
                setCurrentBeat(prev => ({ ...prev, image_asset_id: id }));
                if (assetRecord) {
                  setMediaAssets(prev => [assetRecord, ...prev.filter(m => m.id !== assetRecord.id)]);
                }
              }}
              disabled={isSaving}
              hint="Select or upload beat artwork"
            />
            <MediaAssetPicker
              label="Preview Audio (MP3)"
              assetType="AUDIO"
              value={currentBeat.audio_asset_id}
              onChange={(id, assetRecord) => {
                setSaveState('IDLE');
                setCurrentBeat(prev => ({ ...prev, audio_asset_id: id }));
                if (assetRecord) {
                  setMediaAssets(prev => [assetRecord, ...prev.filter(m => m.id !== assetRecord.id)]);
                }
              }}
              disabled={isSaving}
              hint="Select or upload preview audio"
            />
            <MediaAssetPicker
              label="Visualizer (GIF/Video)"
              assetType="VIDEO"
              value={currentBeat.video_asset_id}
              onChange={(id, assetRecord) => {
                setSaveState('IDLE');
                setCurrentBeat(prev => ({ ...prev, video_asset_id: id }));
                if (assetRecord) {
                  setMediaAssets(prev => [assetRecord, ...prev.filter(m => m.id !== assetRecord.id)]);
                }
              }}
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

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="studio-pill-btn"
              onClick={(e) => handleSave(e, true)}
              disabled={isSaving}
              style={{ background: "rgba(223, 194, 125, 0.08)", borderColor: "rgba(223, 194, 125, 0.4)", color: "var(--gold)" }}
            >
              Save as Draft
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {saveState === 'SAVING' ? 'Saving…' : saveState === 'SAVED' ? 'Saved' : 'Save Beat'}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveSuccess && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#86efac',
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved successfully
            </div>
          )}
          <button className="primary-button" onClick={handleCreateClick}>+ Create Beat</button>
        </div>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      <DraftListResumeBanner
        entityKey="beat_new"
        entityLabel="Beat"
        onResume={(draftData) => {
          setCurrentBeat(draftData);
          setView('CREATE');
        }}
      />

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
                        onError={(e) => {
                          if (!e.target.dataset.fallbackTried) {
                            e.target.dataset.fallbackTried = 'true';
                            e.target.src = '/og-image.png';
                          }
                        }}
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
                      background: beat.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.9)' : beat.status === 'SCHEDULED' ? 'rgba(56, 189, 248, 0.9)' : 'rgba(245, 158, 11, 0.9)',
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
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Cover / Title</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Genre</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>BPM / Key</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedBeats.map(beat => {
                const imageUrl = getMediaUrl(beat.image_asset_id) || getMediaUrl(beat.video_asset_id);
                return (
                  <tr key={beat.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px', color: 'var(--text-h)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border)' }}
                            onError={(e) => {
                              if (!e.target.dataset.fallbackTried) {
                                e.target.dataset.fallbackTried = 'true';
                                e.target.src = '/og-image.png';
                              }
                            }}
                          />
                        )}
                        <div>
                          <div>{beat.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400, marginTop: 4 }}>/{beat.slug}</div>
                        </div>
                      </div>
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
                        background: beat.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.1)' : beat.status === 'SCHEDULED' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: beat.status === 'PUBLISHED' ? '#34d399' : beat.status === 'SCHEDULED' ? '#38bdf8' : '#fbbf24'
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
              );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminBeatsPage;

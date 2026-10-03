import React, { useState, useEffect } from 'react';
import { adminApi } from '../../data/adminApi';
import './admin.css';

const AdminBeatsPage = () => {
  const [beats, setBeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('LIST'); // LIST, CREATE, EDIT
  
  const [currentBeat, setCurrentBeat] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch list
  const fetchBeats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getBeats();
      setBeats(data);
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
  };

  const handleCreateClick = () => {
    setCurrentBeat({
      slug: '',
      title: '',
      genre: '',
      short_genre: '',
      bpm: '',
      beat_key: '',
      description: '',
      mood: '',
      producer: 'silachomka',
      audio_asset_id: '',
      image_asset_id: '',
      video_asset_id: '',
      selar_basic_url: '',
      selar_premium_url: '',
      selar_ultimate_url: '',
      status: 'DRAFT',
      categories: []
    });
    setView('CREATE');
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
    if (!currentBeat.slug || !currentBeat.title) {
      setError('Slug and Title are required.');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    try {
      // Clean nullable fields
      const payload = { ...currentBeat };
      const nullableFields = ['genre', 'short_genre', 'bpm', 'beat_key', 'description', 'mood', 'audio_asset_id', 'image_asset_id', 'video_asset_id', 'selar_basic_url', 'selar_premium_url', 'selar_ultimate_url'];
      nullableFields.forEach(field => {
        if (payload[field] === '') {
          payload[field] = null;
        }
      });
      // Convert bpm to integer if provided
      if (payload.bpm) {
        payload.bpm = parseInt(payload.bpm, 10) || null;
      }
      
      if (view === 'CREATE') {
        await adminApi.createBeat(payload);
      } else {
        await adminApi.updateBeat(payload.id, payload);
      }
      setView('LIST');
      setCurrentBeat(null);
      await fetchBeats();
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Title *</label>
              <input type="text" name="title" className="studio-input" value={currentBeat.title || ''} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Slug *</label>
              <input type="text" name="slug" className="studio-input" value={currentBeat.slug || ''} onChange={handleChange} required disabled={isSaving} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Genre</label>
              <input type="text" name="genre" className="studio-input" value={currentBeat.genre || ''} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Short Genre</label>
              <input type="text" name="short_genre" className="studio-input" value={currentBeat.short_genre || ''} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>BPM</label>
              <input type="number" name="bpm" className="studio-input" value={currentBeat.bpm || ''} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Key</label>
              <input type="text" name="beat_key" className="studio-input" value={currentBeat.beat_key || ''} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <div className="studio-field" style={{ textAlign: 'left' }}>
            <label>Description</label>
            <textarea name="description" className="studio-input" value={currentBeat.description || ''} onChange={handleChange} disabled={isSaving} style={{ minHeight: '80px', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Mood</label>
              <input type="text" name="mood" className="studio-input" value={currentBeat.mood || ''} onChange={handleChange} disabled={isSaving} />
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

          <h3 style={{ fontSize: 14, color: 'var(--gold)', marginTop: '16px', marginBottom: '8px' }}>Media Assets (IDs)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Image Asset ID</label>
              <input type="text" name="image_asset_id" className="studio-input" value={currentBeat.image_asset_id || ''} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Audio Asset ID</label>
              <input type="text" name="audio_asset_id" className="studio-input" value={currentBeat.audio_asset_id || ''} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Video Asset ID</label>
              <input type="text" name="video_asset_id" className="studio-input" value={currentBeat.video_asset_id || ''} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: 'var(--gold)', marginTop: '16px', marginBottom: '8px' }}>Selar URLs</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Basic URL</label>
              <input type="url" name="selar_basic_url" className="studio-input" value={currentBeat.selar_basic_url || ''} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Premium URL</label>
              <input type="url" name="selar_premium_url" className="studio-input" value={currentBeat.selar_premium_url || ''} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: 'left' }}>
              <label>Ultimate URL</label>
              <input type="url" name="selar_ultimate_url" className="studio-input" value={currentBeat.selar_ultimate_url || ''} onChange={handleChange} disabled={isSaving} />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <h2 className="studio-section-heading" style={{ margin: 0 }}>Beats Management</h2>
        <button className="primary-button" onClick={handleCreateClick}>+ Create Beat</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {beats.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Beats Found</h2>
          <p>You haven't added any beats to the catalogue yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Beat</button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(223, 194, 125, 0.05)' }}>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Genre</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>BPM / Key</th>
                <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right', color: 'var(--muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {beats.map(beat => (
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

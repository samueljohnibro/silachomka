import React, { useState, useEffect } from 'react';

const COMMON_PLATFORMS = [
  'spotify',
  'appleMusic',
  'youtubeMusic',
  'audiomack',
  'boomplay',
  'deezer',
  'soundCloud',
  'tidal',
  'bandcamp',
  'youtube',
  'instagram',
  'tiktok',
  'x'
];

/**
 * PlatformLinksEditor
 * Repeatable platform-link rows: platform name + URL
 * Controls: "+ Add platform" and "+ Add link"
 * Allows any new custom platform name without code change.
 */
export const PlatformLinksEditor = ({ value, onChange, disabled = false, label = 'Platform Streaming Links' }) => {
  // Parse initial value (can be an object { spotify: 'url' } or array)
  const parseRows = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.map((item, idx) => ({
        id: idx + '-' + Date.now(),
        platform: item.platform || item.name || '',
        url: item.url || ''
      }));
    }
    if (typeof val === 'object') {
      return Object.entries(val).map(([platform, url], idx) => ({
        id: idx + '-' + Date.now(),
        platform,
        url: typeof url === 'string' ? url : ''
      }));
    }
    return [];
  };

  const [rows, setRows] = useState(() => parseRows(value));

  // Sync if external value changes identity
  useEffect(() => {
    const currentSerialized = JSON.stringify(
      rows.reduce((acc, r) => {
        if (r.platform.trim() && r.url.trim()) acc[r.platform.trim()] = r.url.trim();
        return acc;
      }, {})
    );
    const incomingSerialized = JSON.stringify(typeof value === 'object' && value !== null ? value : {});
    if (currentSerialized !== incomingSerialized) {
      setRows(parseRows(value));
    }
  }, [value]);

  const emitChange = (newRows) => {
    const obj = {};
    newRows.forEach(r => {
      const p = r.platform.trim();
      const u = r.url.trim();
      if (p && u) {
        obj[p] = u;
      }
    });
    onChange(obj);
  };

  const handleRowChange = (id, field, val) => {
    const updated = rows.map(r => r.id === id ? { ...r, [field]: val } : r);
    setRows(updated);
    emitChange(updated);
  };

  const handleAddRow = () => {
    const newRow = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      platform: '',
      url: ''
    };
    const updated = [...rows, newRow];
    setRows(updated);
    emitChange(updated);
  };

  const handleRemoveRow = (id) => {
    const updated = rows.filter(r => r.id !== id);
    setRows(updated);
    emitChange(updated);
  };

  return (
    <div className="platform-links-editor" style={{ textAlign: 'left' }}>
      <datalist id="common-platforms-list">
        {COMMON_PLATFORMS.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)' }}>
          {label}
        </label>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {rows.length} {rows.length === 1 ? 'link' : 'links'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div style={{
          padding: '16px',
          border: '1px dashed var(--border)',
          borderRadius: '6px',
          background: 'rgba(255, 255, 255, 0.02)',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '13px',
          marginBottom: '12px'
        }}>
          No platform links configured yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {rows.map((row, idx) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 36px',
                gap: '8px',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 8px'
              }}
            >
              <input
                type="text"
                list="common-platforms-list"
                className="studio-input"
                style={{ height: '36px', fontSize: '13px' }}
                placeholder="Platform name"
                value={row.platform}
                onChange={(e) => handleRowChange(row.id, 'platform', e.target.value)}
                disabled={disabled}
              />
              <input
                type="url"
                className="studio-input"
                style={{ height: '36px', fontSize: '13px' }}
                placeholder="https://..."
                value={row.url}
                onChange={(e) => handleRowChange(row.id, 'url', e.target.value)}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => handleRemoveRow(row.id)}
                disabled={disabled}
                style={{
                  height: '36px',
                  width: '36px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}
                title="Remove link"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleAddRow}
          disabled={disabled}
          className="studio-pill-btn btn-add-platform"
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            background: 'rgba(223, 194, 125, 0.1)',
            borderColor: 'var(--gold)',
            color: 'var(--gold)',
            cursor: 'pointer'
          }}
        >
          + Add platform
        </button>
        <button
          type="button"
          onClick={handleAddRow}
          disabled={disabled}
          className="studio-pill-btn btn-add-link"
          style={{
            fontSize: '12px',
            padding: '6px 14px',
            background: 'transparent',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            cursor: 'pointer'
          }}
        >
          + Add link
        </button>
      </div>
    </div>
  );
};

export default PlatformLinksEditor;

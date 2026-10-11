import React from 'react';

/**
 * AdminViewToggle
 * Persistent grid / list view mode toggle component.
 * Saves preference in localStorage under 'admin_listing_view_mode'.
 */
export const AdminViewToggle = ({ viewMode, onChange, storageKey = 'admin_listing_view_mode' }) => {
  const handleToggle = (mode) => {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      // localStorage may fail in restricted contexts
    }
    onChange(mode);
  };

  return (
    <div 
      className="admin-view-toggle"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '3px',
        gap: '2px'
      }}
      role="group"
      aria-label="View layout toggle"
    >
      <button
        type="button"
        onClick={() => handleToggle('table')}
        className={`studio-pill-btn ${viewMode === 'table' ? 'is-active' : ''}`}
        style={{
          border: 'none',
          padding: '4px 12px',
          fontSize: '12px',
          borderRadius: '16px',
          background: viewMode === 'table' ? 'var(--gold)' : 'transparent',
          color: viewMode === 'table' ? '#000' : 'var(--muted)',
          fontWeight: viewMode === 'table' ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        aria-pressed={viewMode === 'table'}
        title="List / Table view"
      >
        <span>☰</span> List
      </button>

      <button
        type="button"
        onClick={() => handleToggle('grid')}
        className={`studio-pill-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
        style={{
          border: 'none',
          padding: '4px 12px',
          fontSize: '12px',
          borderRadius: '16px',
          background: viewMode === 'grid' ? 'var(--gold)' : 'transparent',
          color: viewMode === 'grid' ? '#000' : 'var(--muted)',
          fontWeight: viewMode === 'grid' ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        aria-pressed={viewMode === 'grid'}
        title="Grid / Cards view"
      >
        <span>☷</span> Grid
      </button>
    </div>
  );
};

export default AdminViewToggle;

import React from 'react';

/**
 * AdminSortControl
 * Simple, accessible sorting toggle for content lists: Newest to Oldest / Oldest to Newest.
 */
export const AdminSortControl = ({
  sortOrder = 'desc', // 'desc' (newest first) or 'asc' (oldest first)
  onChange,
  label = 'Date'
}) => {
  const isNewestFirst = sortOrder === 'desc';

  const handleToggle = () => {
    onChange(isNewestFirst ? 'asc' : 'desc');
  };

  return (
    <div className="admin-sort-control" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}:
      </span>
      <button
        type="button"
        onClick={handleToggle}
        className="studio-pill-btn admin-sort-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          padding: '4px 12px',
          cursor: 'pointer',
          background: 'rgba(255, 255, 255, 0.04)',
          borderColor: 'var(--border)',
          color: 'var(--text-h)'
        }}
        title={`Currently showing ${isNewestFirst ? 'Newest to Oldest' : 'Oldest to Newest'}. Click to reverse.`}
      >
        <span>{isNewestFirst ? 'Newest to Oldest' : 'Oldest to Newest'}</span>
        <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>
          {isNewestFirst ? '↓' : '↑'}
        </span>
      </button>
    </div>
  );
};

export default AdminSortControl;

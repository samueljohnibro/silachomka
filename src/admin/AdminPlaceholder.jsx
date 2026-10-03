export default function AdminPlaceholder({ title, phase }) {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{title}</h1>
      </div>
      <div className="admin-empty-state">
        <span className="admin-empty-icon" aria-hidden="true">🚧</span>
        <h2>{title} management</h2>
        <p>Coming in Phase {phase}.</p>
        <p className="admin-empty-hint">This section will allow you to create, edit, and manage {title.toLowerCase()} content.</p>
      </div>
    </div>
  );
}

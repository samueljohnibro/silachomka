import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import "./admin.css";

const AdminLinksPage = () => {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");
  
  const [currentLink, setCurrentLink] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLinks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getSocialLinks();
      setLinks(data);
    } catch (err) {
      setError(err.message || "Failed to load social links.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreateClick = () => {
    setCurrentLink({
      name: "",
      handle: "",
      url: "",
      platform: "",
      category: "",
      role: "",
      link_type: "ARTIST",
      sort_order: 0,
      is_active: true
    });
    setView("CREATE");
    setError(null);
  };

  const handleEditClick = (link) => {
    setCurrentLink({
      ...link
    });
    setView("EDIT");
    setError(null);
  };

  const handleCancelForm = (e) => {
    e.preventDefault();
    setView("LIST");
    setCurrentLink(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentLink(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!currentLink.name || !currentLink.url) {
      setError("Name and URL are required.");
      return;
    }

    try {
      const payload = { ...currentLink };
      const nullableFields = ["handle", "platform", "category", "role"];
      
      nullableFields.forEach(field => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });
      
      if (payload.sort_order === "") {
        payload.sort_order = 0;
      } else {
        payload.sort_order = Number(payload.sort_order);
      }

      setIsSaving(true);
      if (view === "CREATE") {
        await adminApi.createSocialLink(payload);
      } else {
        await adminApi.updateSocialLink(payload.id, payload);
      }
      
      await fetchLinks();
      setView("LIST");
    } catch (err) {
      setError(err.message || "Failed to save link.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteSocialLink(id);
      await fetchLinks();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete link.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading links...</div>;
  }

  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Social Link" : "Edit Social Link"}
          </h2>
          <button onClick={handleCancelForm} className="studio-pill-btn" style={{ background: "transparent", color: "var(--text)" }} disabled={isSaving}>
            Cancel
          </button>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>Link Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Name *</label>
              <input type="text" name="name" className="studio-input" value={currentLink.name || ""} onChange={handleChange} required disabled={isSaving} placeholder="e.g. Spotify, Instagram" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>URL *</label>
              <input type="text" name="url" className="studio-input" value={currentLink.url || ""} onChange={handleChange} required disabled={isSaving} placeholder="https://..." />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Handle</label>
              <input type="text" name="handle" className="studio-input" value={currentLink.handle || ""} onChange={handleChange} disabled={isSaving} placeholder="e.g. @silachomka" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Platform (Icon Key)</label>
              <input type="text" name="platform" className="studio-input" value={currentLink.platform || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Metadata & Display</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Category</label>
              <input type="text" name="category" className="studio-input" value={currentLink.category || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Role</label>
              <input type="text" name="role" className="studio-input" value={currentLink.role || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Link Type</label>
              <input type="text" name="link_type" className="studio-input" value={currentLink.link_type || "ARTIST"} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Sort Order</label>
              <input type="number" name="sort_order" className="studio-input" value={currentLink.sort_order ?? 0} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>
          
          <div className="studio-field" style={{ textAlign: "left", marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: 14, color: "var(--text-h)" }}>
              <input type="checkbox" name="is_active" checked={currentLink.is_active || false} onChange={handleChange} disabled={isSaving} />
              Is Active (Visible)
            </label>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Link"}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <h2 className="studio-section-heading" style={{ margin: 0 }}>Social Links Management</h2>
        <button className="primary-button" onClick={handleCreateClick}>+ Create Link</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {links.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Links Found</h2>
          <p>You haven't added any social links yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Link</button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Name / URL</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map(link => (
                <tr key={link.id} style={{ borderBottom: "1px solid var(--border)", opacity: link.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                    {link.name}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>{link.url}</a>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {link.is_active ? "Active" : "Hidden"}
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {deleteConfirmId === link.id ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                        <button 
                          onClick={() => handleDelete(link.id)} 
                          className="studio-pill-btn" 
                          style={{ background: "rgba(220,38,38,0.2)", color: "#fca5a5", borderColor: "#fca5a5" }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "..." : "Yes"}
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
                          onClick={() => handleEditClick(link)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(link.id)}
                          className="studio-pill-btn"
                          style={{ background: "transparent", color: "var(--muted)" }}
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

export default AdminLinksPage;

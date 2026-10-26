import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import { refreshCatalogue } from "../../data/store";
import { useDraftAutosave, DraftAutosaveBanner } from "../../utils/useDraftAutosave";
import AdminSortControl from "../../components/admin/AdminSortControl";
import AdminViewToggle from "../../components/admin/AdminViewToggle";
import "./admin.css";

const AdminLinksPage = () => {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");
  const [sortOrder, setSortOrder] = useState("asc"); // Default asc for links or toggleable
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("admin_listing_view_mode") || "table";
    } catch {
      return "table";
    }
  });
  
  const [currentLink, setCurrentLink] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState("IDLE"); // 'IDLE' | 'SAVING' | 'SAVED'
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
    entityKey: currentLink?.id ? `link_${currentLink.id}` : "link_new",
    formData: currentLink,
    setFormData: setCurrentLink,
    enabled: view === "CREATE" || view === "EDIT",
  });

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
      is_active: true,
      show_on_gallery_posts: false
    });
    setView("CREATE");
    setError(null);
    setSaveState("IDLE");
  };

  const handleEditClick = (link) => {
    setCurrentLink({
      ...link,
      show_on_gallery_posts: link.show_on_gallery_posts === true
    });
    setView("EDIT");
    setError(null);
    setSaveState("IDLE");
  };

  const handleCancelForm = (e) => {
    e.preventDefault();
    setView("LIST");
    setCurrentLink(null);
    setError(null);
    setSaveState("IDLE");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSaveState("IDLE");
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
      const payload = { 
        ...currentLink,
        show_on_gallery_posts: currentLink.show_on_gallery_posts === true
      };
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
      setSaveState("SAVING");
      if (view === "CREATE") {
        await adminApi.createSocialLink(payload);
      } else {
        await adminApi.updateSocialLink(payload.id, payload);
      }
      
      clearDraft();
      await fetchLinks();
      refreshCatalogue();
      setView("LIST");
      setSaveSuccess(true);
      setSaveState("SAVED");
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.message || "Failed to save link.");
      setSaveState("IDLE");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteSocialLink(id);
      await fetchLinks();
      refreshCatalogue();
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

        <DraftAutosaveBanner
          hasRestorableDraft={hasRestorableDraft}
          lastSavedAt={lastSavedAt}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />

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
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: 14, color: "var(--text-h)" }}>
                <input type="checkbox" name="is_active" checked={currentLink.is_active || false} onChange={handleChange} disabled={isSaving} />
                Is Active (Visible)
              </label>
            </div>

            <div className="studio-field" style={{ textAlign: "left" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: 14, color: "var(--text-h)" }}>
                <input type="checkbox" name="show_on_gallery_posts" checked={currentLink.show_on_gallery_posts || false} onChange={handleChange} disabled={isSaving} />
                Show on Gallery Posts (Eligible for Random CTA)
              </label>
              <p style={{ margin: "4px 0 0 24px", fontSize: 11, color: "var(--muted)" }}>
                When enabled, this link is included in the rotation of "Follow on [Platform]" CTAs displayed on public gallery posts.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {saveState === "SAVING" ? "Saving…" : saveState === "SAVED" ? "Saved" : "Save Link"}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // Sort links by created_at or sort_order
  const sortedLinks = [...links].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : (a.sort_order ?? 0);
    const db = b.created_at ? new Date(b.created_at).getTime() : (b.sort_order ?? 0);
    return sortOrder === "desc" ? db - da : da - db;
  });

  // LIST VIEW
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>Social Links Management</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <AdminSortControl sortOrder={sortOrder} onChange={setSortOrder} label="Sort Links" />
            <AdminViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {saveSuccess && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.4)",
              color: "#86efac",
              padding: "6px 14px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 500
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved successfully
            </div>
          )}
          <button className="primary-button" onClick={handleCreateClick}>+ Create Link</button>
        </div>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {sortedLinks.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Links Found</h2>
          <p>You haven't added any social links yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Link</button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="admin-listing-grid">
          {sortedLinks.map(link => (
            <div key={link.id} className="admin-item-card" style={{ opacity: link.is_active ? 1 : 0.6 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, textTransform: "uppercase", color: "var(--gold)", fontWeight: 600 }}>
                    {link.link_type || "ARTIST"} {link.platform ? `• ${link.platform}` : ""}
                  </span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {link.show_on_gallery_posts && (
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: "rgba(223, 194, 125, 0.15)",
                        color: "var(--gold)"
                      }}>
                        Gallery CTA
                      </span>
                    )}
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      background: link.is_active ? "rgba(16, 185, 129, 0.15)" : "rgba(156, 163, 175, 0.15)",
                      color: link.is_active ? "#34d399" : "var(--muted)"
                    }}>
                      {link.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: 16, margin: "0 0 4px 0", color: "var(--text-h)" }}>{link.name}</h3>
                {link.handle && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{link.handle}</div>}
                <div style={{ fontSize: 12, wordBreak: "break-all" }}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>
                    {link.url} ↗
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <button 
                  onClick={() => handleEditClick(link)}
                  className="studio-pill-btn"
                  style={{ fontSize: 12 }}
                >
                  Edit
                </button>
                {deleteConfirmId === link.id ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#fca5a5" }}>Delete?</span>
                    <button 
                      onClick={() => handleDelete(link.id)} 
                      className="studio-pill-btn" 
                      style={{ background: "rgba(220,38,38,0.2)", color: "#fca5a5", borderColor: "#fca5a5", fontSize: 11, padding: "2px 8px" }}
                      disabled={isDeleting}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(null)} 
                      className="studio-pill-btn"
                      style={{ fontSize: 11, padding: "2px 8px" }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDeleteConfirmId(link.id)}
                    className="studio-pill-btn"
                    style={{ background: "transparent", color: "var(--muted)", fontSize: 12 }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
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
              {sortedLinks.map(link => (
                <tr key={link.id} style={{ borderBottom: "1px solid var(--border)", opacity: link.is_active ? 1 : 0.5 }}>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                    {link.name}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>{link.url}</a>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{link.is_active ? "Active" : "Hidden"}</span>
                      {link.show_on_gallery_posts && (
                        <span style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          fontSize: 10,
                          fontWeight: 700,
                          background: "rgba(223, 194, 125, 0.15)",
                          color: "var(--gold)"
                        }}>
                          Gallery CTA
                        </span>
                      )}
                    </div>
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

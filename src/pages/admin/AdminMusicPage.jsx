import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import "./admin.css";

const AdminMusicPage = () => {
  const [releases, setReleases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST"); // LIST, CREATE, EDIT
  
  const [currentRelease, setCurrentRelease] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReleases = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getReleases();
      setReleases(data);
    } catch (err) {
      setError(err.message || "Failed to load releases.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleCreateClick = () => {
    setCurrentRelease({
      slug: "",
      number: "",
      title: "",
      edition: 1,
      release_date: "",
      display_date: "",
      type: "single",
      primary_artist: "silachomka",
      feats_silachomka: false,
      produced_by_silachomka: true,
      description: "",
      cover_asset_id: "",
      sources: "",
      platforms: "",
      status: "DRAFT"
    });
    setView("CREATE");
    setError(null);
  };

  const handleEditClick = (release) => {
    setCurrentRelease({
      ...release,
      sources: release.sources ? JSON.stringify(release.sources, null, 2) : "",
      platforms: release.platforms ? JSON.stringify(release.platforms, null, 2) : ""
    });
    setView("EDIT");
    setError(null);
  };

  const handleCancelForm = (e) => {
    e.preventDefault();
    setView("LIST");
    setCurrentRelease(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentRelease(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!currentRelease.slug || !currentRelease.title || !currentRelease.release_date || !currentRelease.type) {
      setError("Slug, Title, Release Date, and Type are required.");
      return;
    }

    try {
      // Clean nullable fields and parse JSON
      const payload = { ...currentRelease };
      const nullableFields = ["number", "display_date", "description", "cover_asset_id"];
      nullableFields.forEach(field => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });
      
      if (payload.sources === "") {
        payload.sources = null;
      } else if (payload.sources) {
        payload.sources = JSON.parse(payload.sources);
      }
      
      if (payload.platforms === "") {
        payload.platforms = null;
      } else if (payload.platforms) {
        payload.platforms = JSON.parse(payload.platforms);
      }

      setIsSaving(true);
      if (view === "CREATE") {
        await adminApi.createRelease(payload);
      } else {
        await adminApi.updateRelease(payload.id, payload);
      }
      
      await fetchReleases();
      setView("LIST");
    } catch (err) {
      setError(err.message || "Failed to save release.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteRelease(id);
      await fetchReleases();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete release.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading releases...</div>;
  }

  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Release" : "Edit Release"}
          </h2>
          <button onClick={handleCancelForm} className="studio-pill-btn" style={{ background: "transparent", color: "var(--text)" }} disabled={isSaving}>
            Cancel
          </button>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>Basic Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Title *</label>
              <input type="text" name="title" className="studio-input" value={currentRelease.title || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Slug *</label>
              <input type="text" name="slug" className="studio-input" value={currentRelease.slug || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Type *</label>
              <input type="text" name="type" className="studio-input" value={currentRelease.type || ""} onChange={handleChange} required disabled={isSaving} placeholder="e.g. single, ep, album" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Number (Optional)</label>
              <input type="text" name="number" className="studio-input" value={currentRelease.number || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Dates & Edition</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Release Date * (YYYY-MM-DD)</label>
              <input type="text" name="release_date" className="studio-input" value={currentRelease.release_date || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Display Date</label>
              <input type="text" name="display_date" className="studio-input" value={currentRelease.display_date || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Edition *</label>
              <input type="number" name="edition" className="studio-input" value={currentRelease.edition || 1} onChange={handleChange} required disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Artist & Production</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Primary Artist *</label>
              <input type="text" name="primary_artist" className="studio-input" value={currentRelease.primary_artist || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div style={{ display: "flex", gap: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: 14, color: "var(--text-h)" }}>
                <input type="checkbox" name="feats_silachomka" checked={currentRelease.feats_silachomka || false} onChange={handleChange} disabled={isSaving} />
                Features silachomka?
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: 14, color: "var(--text-h)" }}>
                <input type="checkbox" name="produced_by_silachomka" checked={currentRelease.produced_by_silachomka || false} onChange={handleChange} disabled={isSaving} />
                Produced by silachomka?
              </label>
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Details & Assets</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Description</label>
              <textarea name="description" className="studio-input" style={{ minHeight: "80px", resize: "vertical" }} value={currentRelease.description || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Cover Asset ID</label>
              <input type="text" name="cover_asset_id" className="studio-input" value={currentRelease.cover_asset_id || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Status</label>
              <select name="status" className="studio-input" value={currentRelease.status || "DRAFT"} onChange={handleChange} disabled={isSaving}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Metadata (JSON)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Sources (JSON Array)</label>
              <textarea name="sources" className="studio-input" style={{ minHeight: "100px", fontFamily: "monospace", fontSize: 12 }} value={currentRelease.sources || ""} onChange={handleChange} disabled={isSaving} placeholder="[{}]" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Platforms (JSON Object)</label>
              <textarea name="platforms" className="studio-input" style={{ minHeight: "100px", fontFamily: "monospace", fontSize: 12 }} value={currentRelease.platforms || ""} onChange={handleChange} disabled={isSaving} placeholder="{}" />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Release"}
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
        <h2 className="studio-section-heading" style={{ margin: 0 }}>Music Management (Releases)</h2>
        <button className="primary-button" onClick={handleCreateClick}>+ Create Release</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {releases.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Releases Found</h2>
          <p>You haven't added any music releases to the catalogue yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Release</button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type / Date</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {releases.map(release => (
                <tr key={release.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                    {release.title}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>/{release.slug}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {release.type}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>{release.release_date}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: 10, 
                      fontWeight: 700, 
                      textTransform: "uppercase",
                      background: release.status === "PUBLISHED" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                      color: release.status === "PUBLISHED" ? "#34d399" : "#fbbf24"
                    }}>
                      {release.status || "DRAFT"}
                    </span>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {deleteConfirmId === release.id ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                        <button 
                          onClick={() => handleDelete(release.id)} 
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
                          onClick={() => handleEditClick(release)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(release.id)}
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

export default AdminMusicPage;

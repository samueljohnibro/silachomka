import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import "./admin.css";

const AdminMediaPage = () => {
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");
  
  const [currentMedia, setCurrentMedia] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMedia = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getMediaAssets();
      setMedia(data);
    } catch (err) {
      setError(err.message || "Failed to load media assets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleCreateClick = () => {
    setCurrentMedia({
      r2_key: "",
      original_filename: "",
      asset_type: "IMAGE",
      mime_type: "",
      size_bytes: "",
      width: "",
      height: "",
      duration_seconds: "",
      alt_text: "",
      blurhash: ""
    });
    setView("CREATE");
    setError(null);
  };

  const handleEditClick = (asset) => {
    setCurrentMedia({
      ...asset
    });
    setView("EDIT");
    setError(null);
  };

  const handleCancelForm = (e) => {
    e.preventDefault();
    setView("LIST");
    setCurrentMedia(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentMedia(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!currentMedia.r2_key || !currentMedia.asset_type) {
      setError("R2 Key and Asset Type are required.");
      return;
    }

    try {
      const payload = { ...currentMedia };
      const nullableFields = ["original_filename", "mime_type", "alt_text", "blurhash"];
      const numberFields = ["size_bytes", "width", "height", "duration_seconds"];
      
      nullableFields.forEach(field => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });

      numberFields.forEach(field => {
        if (payload[field] === "") {
          payload[field] = null;
        } else if (payload[field] !== null) {
          payload[field] = Number(payload[field]);
        }
      });

      setIsSaving(true);
      if (view === "CREATE") {
        await adminApi.createMediaAsset(payload);
      } else {
        await adminApi.updateMediaAsset(payload.id, payload);
      }
      
      await fetchMedia();
      setView("LIST");
    } catch (err) {
      setError(err.message || "Failed to save media asset.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteMediaAsset(id);
      await fetchMedia();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete media asset.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading media assets...</div>;
  }

  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Media Asset (Record)" : "Edit Media Asset (Record)"}
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
              <label>R2 Key (File Path) *</label>
              <input type="text" name="r2_key" className="studio-input" value={currentMedia.r2_key || ""} onChange={handleChange} required disabled={isSaving} placeholder="e.g. images/photo.jpg" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Asset Type *</label>
              <select name="asset_type" className="studio-input" value={currentMedia.asset_type || "IMAGE"} onChange={handleChange} required disabled={isSaving}>
                <option value="IMAGE">IMAGE</option>
                <option value="VIDEO">VIDEO</option>
                <option value="AUDIO">AUDIO</option>
                <option value="DOCUMENT">DOCUMENT</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Original Filename</label>
              <input type="text" name="original_filename" className="studio-input" value={currentMedia.original_filename || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>MIME Type</label>
              <input type="text" name="mime_type" className="studio-input" value={currentMedia.mime_type || ""} onChange={handleChange} disabled={isSaving} placeholder="e.g. image/jpeg" />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Size (Bytes)</label>
              <input type="number" name="size_bytes" className="studio-input" value={currentMedia.size_bytes || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Duration (Seconds)</label>
              <input type="number" step="0.01" name="duration_seconds" className="studio-input" value={currentMedia.duration_seconds || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Width (px)</label>
              <input type="number" name="width" className="studio-input" value={currentMedia.width || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Height (px)</label>
              <input type="number" name="height" className="studio-input" value={currentMedia.height || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Metadata</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Alt Text</label>
              <input type="text" name="alt_text" className="studio-input" value={currentMedia.alt_text || ""} onChange={handleChange} disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Blurhash</label>
              <input type="text" name="blurhash" className="studio-input" value={currentMedia.blurhash || ""} onChange={handleChange} disabled={isSaving} />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Asset"}
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
        <h2 className="studio-section-heading" style={{ margin: 0 }}>Media Assets Management</h2>
        <button className="primary-button" onClick={handleCreateClick}>+ Add Media Record</button>
      </div>
      
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 16 }}>Note: This manages the database records for media. Actual file uploads to Cloudflare R2 will be supported when R2 is enabled.</p>

      {error && <div className="admin-login-error">{error}</div>}

      {media.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Media Assets Found</h2>
          <p>You haven't added any media records yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Add First Media</button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>R2 Key</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {media.map(asset => (
                <tr key={asset.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                    {asset.r2_key}
                    <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>ID: {asset.id}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: 10, 
                      fontWeight: 700, 
                      textTransform: "uppercase",
                      background: "rgba(223, 194, 125, 0.1)",
                      color: "var(--gold)"
                    }}>
                      {asset.asset_type}
                    </span>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {deleteConfirmId === asset.id ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                        <button 
                          onClick={() => handleDelete(asset.id)} 
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
                          onClick={() => handleEditClick(asset)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(asset.id)}
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

export default AdminMediaPage;

import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import "./admin.css";

const AdminTracksPage = () => {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");
  
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTracks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getTracks();
      setTracks(data);
    } catch (err) {
      setError(err.message || "Failed to load tracks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const handleCreateClick = () => {
    setCurrentTrack({
      release_id: "",
      track_number: 1,
      title: "",
      platforms: ""
    });
    setView("CREATE");
    setError(null);
  };

  const handleEditClick = (track) => {
    setCurrentTrack({
      ...track,
      platforms: track.platforms ? JSON.stringify(track.platforms, null, 2) : ""
    });
    setView("EDIT");
    setError(null);
  };

  const handleCancelForm = (e) => {
    e.preventDefault();
    setView("LIST");
    setCurrentTrack(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentTrack(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!currentTrack.release_id || !currentTrack.track_number || !currentTrack.title) {
      setError("Release ID, Track Number, and Title are required.");
      return;
    }

    try {
      const payload = { 
        ...currentTrack, 
        track_number: parseInt(currentTrack.track_number, 10) 
      };
      
      if (payload.platforms === "") {
        payload.platforms = null;
      } else if (payload.platforms) {
        payload.platforms = JSON.parse(payload.platforms);
      }

      setIsSaving(true);
      if (view === "CREATE") {
        await adminApi.createTrack(payload);
      } else {
        await adminApi.updateTrack(payload.id, payload);
      }
      
      await fetchTracks();
      setView("LIST");
    } catch (err) {
      setError(err.message || "Failed to save track.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteTrack(id);
      await fetchTracks();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete track.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading tracks...</div>;
  }

  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Track" : "Edit Track"}
          </h2>
          <button onClick={handleCancelForm} className="studio-pill-btn" style={{ background: "transparent", color: "var(--text)" }} disabled={isSaving}>
            Cancel
          </button>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>Basic Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left", gridColumn: "span 2" }}>
              <label>Title *</label>
              <input type="text" name="title" className="studio-input" value={currentTrack.title || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Track Number *</label>
              <input type="number" name="track_number" className="studio-input" value={currentTrack.track_number || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Release ID * (UUID)</label>
              <input type="text" name="release_id" className="studio-input" value={currentTrack.release_id || ""} onChange={handleChange} required disabled={isSaving} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Platforms (JSON)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Platforms</label>
              <textarea name="platforms" className="studio-input" style={{ minHeight: "120px", resize: "vertical", fontFamily: "monospace" }} value={currentTrack.platforms || ""} onChange={handleChange} disabled={isSaving} placeholder={'{\n  "spotify": "url"\n}'} />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Track"}
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
        <h2 className="studio-section-heading" style={{ margin: 0 }}>Tracks Management</h2>
        <button className="primary-button" onClick={handleCreateClick}>+ Create Track</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {tracks.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Tracks Found</h2>
          <p>You haven't added any tracks yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Track</button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Track Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Number / Release ID</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map(track => (
                <tr key={track.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                    {track.title}
                  </td>
                  <td style={{ padding: "16px", fontFamily: "monospace", fontSize: 12 }}>
                    # {track.track_number}
                    <div style={{ color: "var(--muted)", marginTop: 4 }}>Rel: {track.release_id}</div>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {deleteConfirmId === track.id ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                        <button 
                          onClick={() => handleDelete(track.id)} 
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
                          onClick={() => handleEditClick(track)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(track.id)}
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

export default AdminTracksPage;

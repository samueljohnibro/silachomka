import { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import "./admin.css";

const isValidSlug = (slug) => /^[a-z0-9-]+$/.test(slug);

const AdminVideosPage = () => {
  const [videos, setVideos] = useState([]);
  const [releases, setReleases] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST"); // LIST, CREATE, EDIT

  const [currentVideo, setCurrentVideo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feature artist input in edit mode
  const [newFeatureArtist, setNewFeatureArtist] = useState("");
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [featureError, setFeatureError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [videosData, releasesData, tracksData, featuresData] = await Promise.all([
        adminApi.getVideos().catch(() => []),
        adminApi.getReleases().catch(() => []),
        adminApi.getTracks().catch(() => []),
        adminApi.getVideoFeatures().catch(() => []),
      ]);
      setVideos(videosData);
      setReleases(releasesData);
      setTracks(tracksData);
      setFeatures(featuresData);
    } catch (err) {
      setError(err.message || "Failed to load music videos data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClick = () => {
    setCurrentVideo({
      slug: "",
      title: "",
      subtitle: "",
      category: "Visualizer",
      youtube_id: "",
      youtube_url: "",
      aspect_ratio: "16:9",
      platforms: "",
      related_release_id: "",
      related_track_id: "",
      status: "DRAFT",
    });
    setView("CREATE");
    setError(null);
    setNewFeatureArtist("");
    setFeatureError(null);
  };

  const handleEditClick = (video) => {
    setCurrentVideo({
      ...video,
      platforms: video.platforms ? JSON.stringify(video.platforms, null, 2) : "",
    });
    setView("EDIT");
    setError(null);
    setNewFeatureArtist("");
    setFeatureError(null);
  };

  const handleCancelForm = (e) => {
    if (e) e.preventDefault();
    setView("LIST");
    setCurrentVideo(null);
    setError(null);
    setNewFeatureArtist("");
    setFeatureError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCurrentVideo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Helper: auto-extract YouTube ID if user pastes a standard YouTube URL
  const handleYoutubeUrlChange = (e) => {
    const url = e.target.value;
    let extractedId = "";

    try {
      if (url.includes("youtu.be/")) {
        extractedId = url.split("youtu.be/")[1]?.split(/[?#]/)[0] || "";
      } else if (url.includes("watch?v=")) {
        extractedId = url.split("watch?v=")[1]?.split(/[&#]/)[0] || "";
      }
    } catch {
      // ignore parse errors
    }

    setCurrentVideo((prev) => ({
      ...prev,
      youtube_url: url,
      youtube_id: prev.youtube_id || extractedId,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    if (!currentVideo.slug || !currentVideo.title || !currentVideo.youtube_id || !currentVideo.youtube_url) {
      setError("Slug, Title, YouTube ID, and YouTube URL are required.");
      return;
    }

    if (!isValidSlug(currentVideo.slug)) {
      setError("Invalid slug format. Use lowercase letters, numbers, and hyphens only.");
      return;
    }

    try {
      const payload = { ...currentVideo };
      const nullableFields = ["subtitle", "category", "aspect_ratio", "related_release_id", "related_track_id"];
      nullableFields.forEach((field) => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });

      if (payload.platforms === "") {
        payload.platforms = null;
      } else if (typeof payload.platforms === "string" && payload.platforms.trim()) {
        try {
          payload.platforms = JSON.parse(payload.platforms);
        } catch {
          setError("Invalid JSON format in Platforms field.");
          return;
        }
      }

      setIsSaving(true);
      if (view === "CREATE") {
        await adminApi.createVideo(payload);
      } else {
        await adminApi.updateVideo(payload.id, payload);
      }

      await fetchData();
      setView("LIST");
      setCurrentVideo(null);
    } catch (err) {
      setError(err.message || "Failed to save music video.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    setError(null);
    try {
      await adminApi.deleteVideo(id);
      await fetchData();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete music video.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Feature Artists Management
  const currentVideoFeatures = currentVideo?.id
    ? features.filter((f) => f.video_id === currentVideo.id)
    : [];

  const handleAddFeature = async (e) => {
    e.preventDefault();
    if (!newFeatureArtist.trim() || !currentVideo?.id) return;

    setIsAddingFeature(true);
    setFeatureError(null);
    try {
      await adminApi.createVideoFeature({
        video_id: currentVideo.id,
        artist_name: newFeatureArtist.trim(),
      });
      const updated = await adminApi.getVideoFeatures();
      setFeatures(updated);
      setNewFeatureArtist("");
    } catch (err) {
      setFeatureError(err.message || "Failed to add featured artist.");
    } finally {
      setIsAddingFeature(false);
    }
  };

  const handleDeleteFeature = async (artistName) => {
    if (!currentVideo?.id) return;
    setFeatureError(null);
    try {
      await adminApi.deleteVideoFeature(currentVideo.id, artistName);
      const updated = await adminApi.getVideoFeatures();
      setFeatures(updated);
    } catch (err) {
      setFeatureError(err.message || "Failed to remove featured artist.");
    }
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading music videos...</div>;
  }

  // CREATE / EDIT VIEW
  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Music Video" : "Edit Music Video"}
          </h2>
          <button
            onClick={handleCancelForm}
            className="studio-pill-btn"
            style={{ background: "transparent", color: "var(--text)" }}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>General Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Slug *</label>
              <input
                type="text"
                name="slug"
                className="studio-input"
                value={currentVideo.slug || ""}
                onChange={handleChange}
                placeholder="e.g. facto-visualizer"
                required
                disabled={isSaving}
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Title *</label>
              <input
                type="text"
                name="title"
                className="studio-input"
                value={currentVideo.title || ""}
                onChange={handleChange}
                placeholder="e.g. facto (Official Visualizer)"
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Subtitle</label>
              <input
                type="text"
                name="subtitle"
                className="studio-input"
                value={currentVideo.subtitle || ""}
                onChange={handleChange}
                placeholder="e.g. Track 4 off NOISEMAKER EP"
                disabled={isSaving}
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Category</label>
              <select
                name="category"
                className="studio-input"
                value={currentVideo.category || "Visualizer"}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="Visualizer">Visualizer</option>
                <option value="Music Video">Music Video</option>
                <option value="Official Music Video">Official Music Video</option>
                <option value="Live Performance">Live Performance</option>
                <option value="Freestyle">Freestyle</option>
                <option value="BTS">BTS</option>
                <option value="Teaser">Teaser</option>
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Video Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>YouTube URL *</label>
              <input
                type="url"
                name="youtube_url"
                className="studio-input"
                value={currentVideo.youtube_url || ""}
                onChange={handleYoutubeUrlChange}
                placeholder="https://youtu.be/sVA_MkT8D3c..."
                required
                disabled={isSaving}
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>YouTube ID *</label>
              <input
                type="text"
                name="youtube_id"
                className="studio-input"
                value={currentVideo.youtube_id || ""}
                onChange={handleChange}
                placeholder="sVA_MkT8D3c"
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Aspect Ratio</label>
              <select
                name="aspect_ratio"
                className="studio-input"
                value={currentVideo.aspect_ratio || "16:9"}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Vertical / Reel)</option>
                <option value="4:3">4:3 (Classic)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Status</label>
              <select
                name="status"
                className="studio-input"
                value={currentVideo.status || "DRAFT"}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
                <option value="UNAVAILABLE">UNAVAILABLE</option>
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Associations</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Related Release</label>
              <select
                name="related_release_id"
                className="studio-input"
                value={currentVideo.related_release_id || ""}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="">-- None --</option>
                {releases.map((rel) => (
                  <option key={rel.id} value={rel.id}>
                    {rel.title} ({rel.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Related Track</label>
              <select
                name="related_track_id"
                className="studio-input"
                value={currentVideo.related_track_id || ""}
                onChange={handleChange}
                disabled={isSaving}
              >
                <option value="">-- None --</option>
                {tracks.map((trk) => (
                  <option key={trk.id} value={trk.id}>
                    {trk.title} (#{trk.track_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Platform Links (JSON)</h3>
          <div className="studio-field" style={{ textAlign: "left" }}>
            <label>Platforms</label>
            <textarea
              name="platforms"
              className="studio-input"
              style={{ minHeight: "100px", resize: "vertical", fontFamily: "monospace" }}
              value={currentVideo.platforms || ""}
              onChange={handleChange}
              disabled={isSaving}
              placeholder={'{\n  "youtube": "https://youtu.be/...",\n  "soundcloud": "https://..."\n}'}
            />
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Music Video"}
            </button>
          </div>
        </form>

        {/* FEATURED ARTISTS MANAGEMENT (EDIT MODE ONLY) */}
        {view === "EDIT" && currentVideo?.id && (
          <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, color: "var(--text-h)", marginBottom: 8 }}>
              Featured Artists / Performers
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
              Manage artists featured in this music video. Changes are saved immediately to the database.
            </p>

            {featureError && <div className="admin-login-error" style={{ marginBottom: 16 }}>{featureError}</div>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {currentVideoFeatures.length === 0 ? (
                <span style={{ color: "var(--muted)", fontSize: 13 }}>No featured artists added.</span>
              ) : (
                currentVideoFeatures.map((f) => (
                  <span
                    key={f.artist_name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(223, 194, 125, 0.1)",
                      border: "1px solid rgba(223, 194, 125, 0.3)",
                      borderRadius: 4,
                      padding: "4px 10px",
                      fontSize: 13,
                      color: "var(--text-h)",
                    }}
                  >
                    {f.artist_name}
                    <button
                      type="button"
                      onClick={() => handleDeleteFeature(f.artist_name)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#fca5a5",
                        cursor: "pointer",
                        fontWeight: "bold",
                        padding: "0 2px",
                      }}
                      title="Remove artist"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <form onSubmit={handleAddFeature} style={{ display: "flex", gap: 8, maxWidth: 400 }}>
              <input
                type="text"
                className="studio-input"
                placeholder="Artist name (e.g. K4MY)"
                value={newFeatureArtist}
                onChange={(e) => setNewFeatureArtist(e.target.value)}
                disabled={isAddingFeature}
              />
              <button
                type="submit"
                className="studio-pill-btn"
                style={{ background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)", whiteSpace: "nowrap" }}
                disabled={isAddingFeature || !newFeatureArtist.trim()}
              >
                {isAddingFeature ? "Adding..." : "+ Add"}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <h2 className="studio-section-heading" style={{ margin: 0 }}>Music Videos Management</h2>
        <button className="primary-button" onClick={handleCreateClick}>+ Create Video</button>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {videos.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Music Videos Found</h2>
          <p>You haven't added any videos yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>
            Create First Video
          </button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Video</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Category / YouTube</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((vid) => (
                <tr key={vid.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px" }}>
                    <div style={{ color: "var(--text-h)", fontWeight: 500 }}>{vid.title}</div>
                    {vid.subtitle && <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{vid.subtitle}</div>}
                    <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>slug: {vid.slug}</div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ color: "var(--gold)", fontSize: 13 }}>{vid.category || "Visualizer"}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                      <a href={vid.youtube_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "underline" }}>
                        {vid.youtube_id} ↗
                      </a>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: 11,
                        fontWeight: 600,
                        background: vid.status === "PUBLISHED" ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                        color: vid.status === "PUBLISHED" ? "#4ade80" : "#facc15",
                      }}
                    >
                      {vid.status || "DRAFT"}
                    </span>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    {deleteConfirmId === vid.id ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                        <button
                          onClick={() => handleDelete(vid.id)}
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
                          onClick={() => handleEditClick(vid)}
                          className="studio-pill-btn"
                          style={{ marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(vid.id)}
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

export default AdminVideosPage;

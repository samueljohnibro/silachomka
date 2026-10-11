import { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import "./admin.css";

const CREDIT_ROLES = ["FEATURING", "PRODUCER", "WRITER", "ENGINEER", "DIRECTOR"];

const AdminTracksPage = () => {
  const [tracks, setTracks] = useState([]);
  const [releases, setReleases] = useState([]);
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Credit form states in EDIT mode
  const [newCreditName, setNewCreditName] = useState("");
  const [newCreditRole, setNewCreditRole] = useState("FEATURING");
  const [isAddingCredit, setIsAddingCredit] = useState(false);
  const [creditError, setCreditError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tracksData, releasesData, creditsData] = await Promise.all([
        adminApi.getTracks().catch(() => []),
        adminApi.getReleases().catch(() => []),
        adminApi.getTrackCredits().catch(() => []),
      ]);
      setTracks(tracksData);
      setReleases(releasesData);
      setCredits(creditsData);
    } catch (err) {
      setError(err.message || "Failed to load tracks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClick = () => {
    setCurrentTrack({
      release_id: releases[0]?.id || "",
      track_number: 1,
      title: "",
      platforms: "",
    });
    setView("CREATE");
    setError(null);
    setNewCreditName("");
    setCreditError(null);
  };

  const handleEditClick = (track) => {
    setCurrentTrack({
      ...track,
      platforms: track.platforms ? JSON.stringify(track.platforms, null, 2) : "",
    });
    setView("EDIT");
    setError(null);
    setNewCreditName("");
    setCreditError(null);
  };

  const handleCancelForm = (e) => {
    if (e) e.preventDefault();
    setView("LIST");
    setCurrentTrack(null);
    setError(null);
    setNewCreditName("");
    setCreditError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentTrack((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
        track_number: parseInt(currentTrack.track_number, 10),
      };

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
        await adminApi.createTrack(payload);
      } else {
        await adminApi.updateTrack(payload.id, payload);
      }

      await fetchData();
      setView("LIST");
      setCurrentTrack(null);
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
      await fetchData();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete track.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Track Credits Operations
  const currentTrackCredits = currentTrack?.id
    ? credits.filter((c) => c.track_id === currentTrack.id)
    : [];

  const handleAddCredit = async (e) => {
    e.preventDefault();
    if (!newCreditName.trim() || !currentTrack?.id) return;

    setIsAddingCredit(true);
    setCreditError(null);
    try {
      await adminApi.createTrackCredit({
        track_id: currentTrack.id,
        credit_name: newCreditName.trim(),
        role: newCreditRole,
      });
      const updatedCredits = await adminApi.getTrackCredits();
      setCredits(updatedCredits);
      setNewCreditName("");
    } catch (err) {
      setCreditError(err.message || "Failed to add track credit.");
    } finally {
      setIsAddingCredit(false);
    }
  };

  const handleDeleteCredit = async (creditId) => {
    setCreditError(null);
    try {
      await adminApi.deleteTrackCredit(creditId);
      const updatedCredits = await adminApi.getTrackCredits();
      setCredits(updatedCredits);
    } catch (err) {
      setCreditError(err.message || "Failed to delete track credit.");
    }
  };

  // Helper to find release title
  const getReleaseTitle = (relId) => {
    const rel = releases.find((r) => r.id === relId);
    return rel ? rel.title : relId;
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading tracks...</div>;
  }

  // CREATE / EDIT VIEW
  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Track" : "Edit Track"}
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
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>Basic Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left", gridColumn: "span 2" }}>
              <label>Title *</label>
              <input
                type="text"
                name="title"
                className="studio-input"
                value={currentTrack.title || ""}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Track Number *</label>
              <input
                type="number"
                name="track_number"
                className="studio-input"
                value={currentTrack.track_number || ""}
                onChange={handleChange}
                required
                disabled={isSaving}
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Release *</label>
              <select
                name="release_id"
                className="studio-input"
                value={currentTrack.release_id || ""}
                onChange={handleChange}
                required
                disabled={isSaving}
              >
                <option value="">-- Select Release --</option>
                {releases.map((rel) => (
                  <option key={rel.id} value={rel.id}>
                    {rel.title} ({rel.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>
            Platforms (JSON)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Platforms</label>
              <textarea
                name="platforms"
                className="studio-input"
                style={{ minHeight: "120px", resize: "vertical", fontFamily: "monospace" }}
                value={currentTrack.platforms || ""}
                onChange={handleChange}
                disabled={isSaving}
                placeholder={'{\n  "spotify": "url"\n}'}
              />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Track"}
            </button>
          </div>
        </form>

        {/* TRACK CREDITS MANAGEMENT (EDIT MODE ONLY) */}
        {view === "EDIT" && currentTrack?.id && (
          <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, color: "var(--text-h)", marginBottom: 8 }}>
              Track Credits
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
              Manage artists, producers, writers, and engineers credited on this track. Changes are saved immediately to the database.
            </p>

            {creditError && <div className="admin-login-error" style={{ marginBottom: 16 }}>{creditError}</div>}

            <div style={{ marginBottom: 20 }}>
              {currentTrackCredits.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>
                  No credits registered for this track yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {currentTrackCredits.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              c.role === "FEATURING"
                                ? "rgba(34, 197, 94, 0.15)"
                                : c.role === "PRODUCER"
                                ? "rgba(223, 194, 125, 0.2)"
                                : "rgba(147, 51, 234, 0.15)",
                            color:
                              c.role === "FEATURING"
                                ? "#4ade80"
                                : c.role === "PRODUCER"
                                ? "var(--gold)"
                                : "#c084fc",
                          }}
                        >
                          {c.role}
                        </span>
                        <span style={{ color: "var(--text-h)", fontWeight: 500, fontSize: 14 }}>
                          {c.credit_name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCredit(c.id)}
                        className="studio-pill-btn"
                        style={{ background: "transparent", color: "#fca5a5", borderColor: "rgba(252, 165, 165, 0.3)", padding: "4px 8px", fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddCredit} style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 8, maxWidth: 500 }}>
              <input
                type="text"
                className="studio-input"
                placeholder="Credit name (e.g. K4MY)"
                value={newCreditName}
                onChange={(e) => setNewCreditName(e.target.value)}
                disabled={isAddingCredit}
                required
              />
              <select
                className="studio-input"
                value={newCreditRole}
                onChange={(e) => setNewCreditRole(e.target.value)}
                disabled={isAddingCredit}
              >
                {CREDIT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="studio-pill-btn"
                style={{ background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)", whiteSpace: "nowrap" }}
                disabled={isAddingCredit || !newCreditName.trim()}
              >
                {isAddingCredit ? "Adding..." : "+ Add Credit"}
              </button>
            </form>
          </div>
        )}

        {view === "CREATE" && (
          <div style={{ marginTop: 24, padding: 16, background: "rgba(255, 255, 255, 0.02)", border: "1px dashed var(--border)", borderRadius: 4, color: "var(--muted)", fontSize: 13 }}>
            💡 Tip: Save this track first, and you will be able to add Featuring and Producer credits immediately.
          </div>
        )}
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
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>
            Create First Track
          </button>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Track Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Number / Release</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Credits</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => {
                const trackCredits = credits.filter((c) => c.track_id === track.id);
                const feats = trackCredits.filter((c) => c.role === "FEATURING").map((c) => c.credit_name);
                const prods = trackCredits.filter((c) => c.role === "PRODUCER").map((c) => c.credit_name);

                return (
                  <tr key={track.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                      <div>{track.title}</div>
                      {feats.length > 0 && (
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                          feat. {feats.join(", ")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "16px", fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: "var(--gold)" }}>#{track.track_number}</span>
                      <div style={{ color: "var(--muted)", marginTop: 4 }}>{getReleaseTitle(track.release_id)}</div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      {trackCredits.length === 0 ? (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {feats.length > 0 && (
                            <span style={{ padding: "2px 6px", background: "rgba(34, 197, 94, 0.1)", color: "#4ade80", borderRadius: 3, fontSize: 11 }}>
                              {feats.length} feat
                            </span>
                          )}
                          {prods.length > 0 && (
                            <span style={{ padding: "2px 6px", background: "rgba(223, 194, 125, 0.1)", color: "var(--gold)", borderRadius: 3, fontSize: 11 }}>
                              {prods.length} prod
                            </span>
                          )}
                        </div>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTracksPage;

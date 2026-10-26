import { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import { refreshCatalogue } from "../../data/store";
import { useDraftAutosave, DraftAutosaveBanner } from "../../utils/useDraftAutosave";
import PlatformLinksEditor from "../../components/admin/PlatformLinksEditor";
import MediaAssetPicker from "../../components/admin/MediaAssetPicker";
import AdminSortControl from "../../components/admin/AdminSortControl";
import AdminViewToggle from "../../components/admin/AdminViewToggle";
import "./admin.css";

const CREDIT_ROLES = ["FEATURING", "PRODUCER", "WRITER", "ENGINEER", "DIRECTOR"];

const slugify = (text) => (text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const AdminTracksPage = () => {
  const [tracks, setTracks] = useState([]);
  const [releases, setReleases] = useState([]);
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("admin_listing_view_mode") || "table";
    } catch {
      return "table";
    }
  });

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Direct New Release Creation State
  const [isCreatingNewRelease, setIsCreatingNewRelease] = useState(false);
  const [newReleaseForm, setNewReleaseForm] = useState({
    title: "",
    type: "single",
    release_date: new Date().toISOString().split("T")[0],
    cover_asset_id: null,
    platforms: {}
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Credit form states in EDIT mode
  const [newCreditName, setNewCreditName] = useState("");
  const [newCreditRole, setNewCreditRole] = useState("FEATURING");
  const [isAddingCredit, setIsAddingCredit] = useState(false);
  const [creditError, setCreditError] = useState(null);

  const {
    hasRestorableDraft,
    lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useDraftAutosave({
    entityKey: currentTrack?.id ? `track_${currentTrack.id}` : "track_new",
    formData: currentTrack,
    setFormData: setCurrentTrack,
    enabled: view === "CREATE" || view === "EDIT",
  });

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
      preview_asset_id: null,
      platforms: {},
    });
    setIsCreatingNewRelease(false);
    setNewReleaseForm({
      title: "",
      type: "single",
      release_date: new Date().toISOString().split("T")[0],
      cover_asset_id: null,
      platforms: {}
    });
    setView("CREATE");
    setError(null);
    setNewCreditName("");
    setCreditError(null);
  };

  const handleEditClick = (track) => {
    setCurrentTrack({
      ...track,
      preview_asset_id: track.preview_asset_id || null,
      platforms: track.platforms && typeof track.platforms === "object" ? track.platforms : {},
    });
    setIsCreatingNewRelease(false);
    setView("EDIT");
    setError(null);
    setNewCreditName("");
    setCreditError(null);
  };

  const handleCancelForm = (e) => {
    if (e) e.preventDefault();
    setView("LIST");
    setCurrentTrack(null);
    setIsCreatingNewRelease(false);
    setError(null);
    setNewCreditName("");
    setCreditError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "release_id" && value === "__NEW__") {
      setIsCreatingNewRelease(true);
      return;
    }
    setCurrentTrack((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    if (!currentTrack.title || !currentTrack.title.trim()) {
      setError("Track title is required.");
      return;
    }

    if (!currentTrack.track_number) {
      setError("Track number is required.");
      return;
    }

    setIsSaving(true);

    try {
      let targetReleaseId = currentTrack.release_id;

      // If user chose to create a new release on the fly
      if (isCreatingNewRelease) {
        if (!newReleaseForm.title || !newReleaseForm.title.trim()) {
          setError("New Release title is required.");
          setIsSaving(false);
          return;
        }

        const generatedSlug = slugify(newReleaseForm.title) || ("release-" + Date.now());
        const createdRelease = await adminApi.createRelease({
          title: newReleaseForm.title.trim(),
          slug: generatedSlug,
          type: newReleaseForm.type || "single",
          release_date: newReleaseForm.release_date || new Date().toISOString().split("T")[0],
          cover_asset_id: newReleaseForm.cover_asset_id || null,
          platforms: newReleaseForm.platforms && Object.keys(newReleaseForm.platforms).length > 0 ? newReleaseForm.platforms : null,
          primary_artist: "silachomka",
          sources: ["chomkaMUSIC™"],
          edition: 1,
          status: "PUBLISHED"
        });

        targetReleaseId = createdRelease.id;
        setReleases(prev => [createdRelease, ...prev]);
      }

      if (!targetReleaseId) {
        setError("A release must be selected or created for this track.");
        setIsSaving(false);
        return;
      }

      const payload = {
        ...currentTrack,
        release_id: targetReleaseId,
        track_number: parseInt(currentTrack.track_number, 10),
        preview_asset_id: currentTrack.preview_asset_id || null,
        platforms: currentTrack.platforms && typeof currentTrack.platforms === "object" && Object.keys(currentTrack.platforms).length > 0 ? currentTrack.platforms : null
      };

      if (view === "CREATE") {
        await adminApi.createTrack(payload);
      } else {
        await adminApi.updateTrack(payload.id, payload);
      }

      clearDraft();
      await fetchData();
      refreshCatalogue();
      setView("LIST");
      setCurrentTrack(null);
      setIsCreatingNewRelease(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
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
      refreshCatalogue();
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

  // Helper to find release
  const getRelease = (relId) => {
    return releases.find((r) => r.id === relId);
  };

  const getReleaseTitle = (relId) => {
    const rel = getRelease(relId);
    return rel ? rel.title : relId;
  };

  // Sort tracks by inherited release_date || created_at, then track_number
  const getTrackDate = (t) => {
    const rel = getRelease(t.release_id);
    return rel?.release_date ? new Date(rel.release_date).getTime() : (t.created_at ? new Date(t.created_at).getTime() : 0);
  };

  const sortedTracks = [...tracks].sort((a, b) => {
    const da = getTrackDate(a);
    const db = getTrackDate(b);
    if (da !== db) return sortOrder === "desc" ? db - da : da - db;
    return (a.track_number || 0) - (b.track_number || 0);
  });

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)", padding: "48px", textAlign: "center" }}>Loading tracks...</div>;
  }

  // CREATE / EDIT VIEW
  if (view === "CREATE" || view === "EDIT") {
    return (
      <div className="admin-card">
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

        <DraftAutosaveBanner
          hasRestorableDraft={hasRestorableDraft}
          lastSavedAt={lastSavedAt}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>Track Details</h3>
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
                placeholder="e.g. No Be Jazz"
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
                min="1"
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Release Project *</label>
              {isCreatingNewRelease ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid var(--gold)", borderRadius: "4px", background: "rgba(223, 194, 125, 0.05)" }}>
                  <span style={{ fontSize: "13px", color: "var(--gold)", fontWeight: 500 }}>
                    + Creating New Release
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewRelease(false)}
                    style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
                  >
                    Select existing
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    name="release_id"
                    className="studio-input"
                    value={currentTrack.release_id || ""}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                    style={{ flex: 1, height: "48px" }}
                  >
                    <option value="">-- Select Release --</option>
                    {releases.map((rel) => (
                      <option key={rel.id} value={rel.id}>
                        {rel.title} ({rel.type})
                      </option>
                    ))}
                    <option value="__NEW__">+ Create New Release...</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewRelease(true)}
                    className="studio-pill-btn"
                    style={{ whiteSpace: "nowrap", height: "48px", borderColor: "var(--gold)", color: "var(--gold)" }}
                    title="Create a new release for this track"
                  >
                    + New
                  </button>
                </div>
              )}
              {currentTrack.release_id && !isCreatingNewRelease && (
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
                  Inherited Release Date: <strong style={{ color: "var(--gold)" }}>{getRelease(currentTrack.release_id)?.display_date || getRelease(currentTrack.release_id)?.release_date || "N/A"}</strong>
                </div>
              )}
            </div>
          </div>

          {/* INLINE NEW RELEASE CREATION CARD */}
          {isCreatingNewRelease && (
            <div className="inline-release-card" style={{
              padding: "16px",
              border: "1px solid var(--gold)",
              borderRadius: "6px",
              background: "rgba(223, 194, 125, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, color: "var(--gold)", fontSize: "14px" }}>
                  Define New Release Project
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewRelease(false)}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}
                >
                  Cancel new release
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 180px", gap: "12px" }}>
                <div className="studio-field" style={{ textAlign: "left" }}>
                  <label>Release Title *</label>
                  <input
                    type="text"
                    className="studio-input"
                    value={newReleaseForm.title}
                    onChange={(e) => setNewReleaseForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. MY NEW EP"
                    required={isCreatingNewRelease}
                  />
                </div>
                <div className="studio-field" style={{ textAlign: "left" }}>
                  <label>Type *</label>
                  <select
                    className="studio-input"
                    value={newReleaseForm.type}
                    onChange={(e) => setNewReleaseForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{ height: "48px" }}
                  >
                    <option value="single">Single</option>
                    <option value="ep">EP</option>
                    <option value="album">Album</option>
                  </select>
                </div>
                <div className="studio-field" style={{ textAlign: "left" }}>
                  <label>Release Date</label>
                  <input
                    type="date"
                    className="studio-input"
                    value={newReleaseForm.release_date}
                    onChange={(e) => setNewReleaseForm(prev => ({ ...prev, release_date: e.target.value }))}
                  />
                </div>
              </div>

              <MediaAssetPicker
                label="Release Cover Art"
                assetType="IMAGE"
                value={newReleaseForm.cover_asset_id}
                onChange={(id) => setNewReleaseForm(prev => ({ ...prev, cover_asset_id: id }))}
                hint="Select existing cover or enter path (e.g. covers/my-release.jpg)"
              />

              <PlatformLinksEditor
                label="Release-Level Streaming Links (Optional)"
                value={newReleaseForm.platforms}
                onChange={(platforms) => setNewReleaseForm(prev => ({ ...prev, platforms }))}
              />
            </div>
          )}

          {/* TRACK PREVIEW AUDIO */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "8px" }}>
            <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>
              Track Preview Audio (Optional Pre-Release Snippet)
            </h3>
            <MediaAssetPicker
              label="Track Preview Audio (MP3)"
              assetType="AUDIO"
              value={currentTrack.preview_asset_id}
              onChange={(id) => setCurrentTrack(prev => ({ ...prev, preview_asset_id: id }))}
              disabled={isSaving}
              hint="Plays a random 30s snippet on upcoming release pages without revealing the track title publicly."
            />
          </div>

          {/* TRACK STREAMING LINKS */}
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>
            Track Streaming Links
          </h3>
          <PlatformLinksEditor
            label="Streaming Links for this specific Track"
            value={currentTrack.platforms}
            onChange={(platforms) => setCurrentTrack(prev => ({ ...prev, platforms }))}
            disabled={isSaving}
          />

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

            <form onSubmit={handleAddCredit} style={{ display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 8, maxWidth: 540 }}>
              <input
                type="text"
                className="studio-input"
                placeholder="Credit name (e.g. Kendrick Lamar)"
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
                style={{ background: "var(--gold)", color: "#000", fontWeight: 600, border: "none" }}
                disabled={isAddingCredit || !newCreditName.trim()}
              >
                {isAddingCredit ? "..." : "+ Add"}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>Tracks Management</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <AdminSortControl sortOrder={sortOrder} onChange={setSortOrder} label="Sort Tracks" />
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
          <button className="primary-button" onClick={handleCreateClick}>+ Create Track</button>
        </div>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {sortedTracks.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Tracks Found</h2>
          <p>You haven't added any tracks to the catalogue yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Track</button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="admin-listing-grid">
          {sortedTracks.map((track) => {
            const rel = getRelease(track.release_id);
            const trackCredits = credits.filter((c) => c.track_id === track.id);
            const platformCount = track.platforms && typeof track.platforms === "object" ? Object.keys(track.platforms).length : 0;
            return (
              <div key={track.id} className="admin-item-card">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
                      Track #{track.track_number}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {platformCount > 0 ? `${platformCount} platform(s)` : "No links"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, margin: "0 0 6px 0", color: "var(--text-h)" }}>{track.title}</h3>
                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                    Project: <span style={{ color: "var(--gold)" }}>{rel ? rel.title : "Unassigned"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    Release Date: {rel?.display_date || rel?.release_date || "N/A"}
                  </div>

                  {trackCredits.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                      {trackCredits.map((c) => (
                        <span
                          key={c.id}
                          style={{
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontSize: 10,
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border)",
                            color: "var(--muted)",
                          }}
                        >
                          {c.credit_name} ({c.role.toLowerCase()})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <button
                    onClick={() => handleEditClick(track)}
                    className="studio-pill-btn"
                    style={{ fontSize: 12 }}
                  >
                    Edit
                  </button>
                  {deleteConfirmId === track.id ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#fca5a5" }}>Delete?</span>
                      <button
                        onClick={() => handleDelete(track.id)}
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
                      onClick={() => setDeleteConfirmId(track.id)}
                      className="studio-pill-btn"
                      style={{ background: "transparent", color: "var(--muted)", fontSize: 12 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(223, 194, 125, 0.05)" }}>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>#</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Project / Date</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Credits</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTracks.map((track) => {
                const rel = getRelease(track.release_id);
                const trackCredits = credits.filter((c) => c.track_id === track.id);
                return (
                  <tr key={track.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", color: "var(--gold)", fontWeight: 600 }}>
                      {track.track_number}
                    </td>
                    <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                      {track.title}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ color: "var(--text)" }}>{rel ? rel.title : track.release_id}</span>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {rel?.display_date || rel?.release_date || "—"}
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      {trackCredits.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {trackCredits.map((c) => (
                            <span
                              key={c.id}
                              style={{
                                padding: "2px 6px",
                                borderRadius: 3,
                                fontSize: 10,
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid var(--border)",
                                color: "var(--muted)",
                              }}
                            >
                              {c.credit_name} ({c.role.toLowerCase()})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
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

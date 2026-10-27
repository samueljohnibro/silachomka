import React, { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import { refreshCatalogue } from "../../data/store";
import { useDraftAutosave, DraftAutosaveBanner, DraftListResumeBanner } from "../../utils/useDraftAutosave";
import MediaAssetPicker from "../../components/admin/MediaAssetPicker";
import PlatformLinksEditor from "../../components/admin/PlatformLinksEditor";
import AdminSortControl from "../../components/admin/AdminSortControl";
import AdminViewToggle from "../../components/admin/AdminViewToggle";
import "./admin.css";

const slugify = (text) =>
  String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatReleaseDisplayDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayName = days[d.getUTCDay()];
  const dayNum = d.getUTCDate();
  const monthName = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  
  const suffix = (n) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${dayName}, ${dayNum}${suffix(dayNum)} ${monthName}, ${year}`;
};

const generateReleaseDescription = ({ title, primary_artist, sources }) => {
  const cleanTitle = (title || '').trim();
  const artist = (primary_artist || 'silachomka').trim();
  const srcList = Array.isArray(sources) && sources.length > 0 ? sources : ['chomkaMUSIC™'];
  const cleanSources = srcList.join(' & ');
  if (!cleanTitle) return '';
  return `${cleanTitle} is an official studio release by ${artist} published under ${cleanSources}.`;
};

const AdminMusicPage = () => {
  const [releases, setReleases] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [credits, setCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("LIST"); // LIST, CREATE, EDIT
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' = newest first, 'asc' = oldest first
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("admin_listing_view_mode") || "table";
    } catch {
      return "table";
    }
  });

  const [currentRelease, setCurrentRelease] = useState(null);
  const [releaseDatePart, setReleaseDatePart] = useState("");
  const [releaseTimePart, setReleaseTimePart] = useState("00:00");
  const [isCustomDescription, setIsCustomDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState("IDLE"); // 'IDLE' | 'SAVING' | 'SAVED'
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sources editing state
  const [newSourceInput, setNewSourceInput] = useState("");

  // Project Track management state inside Project Form
  const [editingTrack, setEditingTrack] = useState(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [isSavingTrack, setIsSavingTrack] = useState(false);
  const [trackError, setTrackError] = useState(null);
  const [deleteTrackConfirmId, setDeleteTrackConfirmId] = useState(null);
  const [newTrackCreditName, setNewTrackCreditName] = useState("");
  const [newTrackCreditRole, setNewTrackCreditRole] = useState("FEATURING");

  const {
    hasRestorableDraft,
    lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useDraftAutosave({
    entityKey: currentRelease?.id ? `release_${currentRelease.id}` : "release_new",
    formData: currentRelease,
    setFormData: (restored) => {
      if (!restored) return;
      setCurrentRelease(restored);
      if (restored.release_date) {
        const d = new Date(restored.release_date);
        if (!isNaN(d.getTime())) {
          setReleaseDatePart(d.toISOString().split("T")[0]);
          setReleaseTimePart(d.toISOString().split("T")[1]?.slice(0, 5) || "00:00");
        }
      }
    },
    enabled: view === "CREATE" || view === "EDIT",
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [releasesData, mediaData, tracksData, creditsData] = await Promise.all([
        adminApi.getReleases().catch(() => []),
        adminApi.getMediaAssets().catch(() => []),
        adminApi.getTracks().catch(() => []),
        adminApi.getTrackCredits().catch(() => [])
      ]);
      setReleases(releasesData);
      setMediaAssets(mediaData);
      setTracks(tracksData);
      setCredits(creditsData);
    } catch (err) {
      setError(err.message || "Failed to load music releases.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClick = () => {
    const today = new Date().toISOString().split("T")[0];
    const initialReleaseDate = `${today}T12:00:00.000Z`;
    const defaultSources = ["chomkaMUSIC™"];
    const defaultDesc = generateReleaseDescription({
      title: "",
      primary_artist: "silachomka",
      sources: defaultSources
    });
    setCurrentRelease({
      title: "",
      slug: "",
      type: "single",
      release_date: initialReleaseDate,
      display_date: formatReleaseDisplayDate(initialReleaseDate),
      primary_artist: "silachomka",
      description: defaultDesc,
      cover_asset_id: null,
      preview_asset_id: null,
      platforms: {},
      sources: defaultSources,
      edition: 1,
      feats_silachomka: false,
      produced_by_silachomka: true,
      status: "DRAFT"
    });
    setReleaseDatePart(today);
    setReleaseTimePart("12:00");
    setIsCustomDescription(false);
    setNewSourceInput("");
    setView("CREATE");
    setError(null);
    setSaveSuccess(false);
    setSaveState("IDLE");
  };

  const handleEditClick = (release) => {
    let datePart = "";
    let timePart = "00:00";
    if (release.release_date) {
      const d = new Date(release.release_date);
      if (!isNaN(d.getTime())) {
        datePart = d.toISOString().split("T")[0];
        timePart = d.toISOString().split("T")[1]?.slice(0, 5) || "00:00";
      }
    }
    const currentSources = Array.isArray(release.sources) ? release.sources : (release.sources ? [release.sources] : ["chomkaMUSIC™"]);
    const canonicalDesc = generateReleaseDescription({
      title: release.title,
      primary_artist: release.primary_artist,
      sources: currentSources
    });
    const isCustom = release.description ? release.description.trim() !== canonicalDesc.trim() : false;

    setCurrentRelease({
      ...release,
      preview_asset_id: release.preview_asset_id || null,
      sources: currentSources,
      platforms: release.platforms && typeof release.platforms === "object" ? release.platforms : {},
      display_date: release.display_date || formatReleaseDisplayDate(release.release_date)
    });
    setReleaseDatePart(datePart);
    setReleaseTimePart(timePart);
    setIsCustomDescription(isCustom);
    setNewSourceInput("");
    setView("EDIT");
    setError(null);
    setSaveSuccess(false);
    setSaveState("IDLE");
  };

  const handleCancelForm = (e) => {
    if (e) e.preventDefault();
    setView("LIST");
    setCurrentRelease(null);
    setError(null);
    setSaveState("IDLE");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSaveState("IDLE");
    setCurrentRelease(prev => ({ 
      ...prev, 
      [name]: type === "checkbox" ? checked : value 
    }));
  };

  const handleDateTimeChange = (newDatePart, newTimePart) => {
    setSaveState("IDLE");
    setReleaseDatePart(newDatePart);
    setReleaseTimePart(newTimePart);
    if (newDatePart) {
      const timeStr = newTimePart ? `${newTimePart}:00` : "00:00:00";
      const combinedIso = new Date(`${newDatePart}T${timeStr}Z`).toISOString();
      const derivedDisplay = formatReleaseDisplayDate(combinedIso);
      setCurrentRelease(prev => ({
        ...prev,
        release_date: combinedIso,
        display_date: derivedDisplay
      }));
    }
  };

  const handleTitleOrArtistOrSourcesChange = (updatedFields) => {
    setSaveState("IDLE");
    setCurrentRelease(prev => {
      const next = { ...prev, ...updatedFields };
      if (!isCustomDescription) {
        next.description = generateReleaseDescription({
          title: next.title,
          primary_artist: next.primary_artist,
          sources: next.sources
        });
      }
      return next;
    });
  };

  const handleRegenerateDescription = () => {
    if (!currentRelease) return;
    setSaveState("IDLE");
    const desc = generateReleaseDescription({
      title: currentRelease.title,
      primary_artist: currentRelease.primary_artist,
      sources: currentRelease.sources
    });
    setCurrentRelease(prev => ({ ...prev, description: desc }));
    setIsCustomDescription(false);
  };

  // Sources Management
  const handleAddSource = (e) => {
    e.preventDefault();
    if (!newSourceInput.trim()) return;
    setSaveState("IDLE");
    const trimmed = newSourceInput.trim();
    setCurrentRelease(prev => {
      const currentSources = Array.isArray(prev.sources) ? prev.sources : [];
      if (currentSources.includes(trimmed)) return prev;
      const newSources = [...currentSources, trimmed];
      const updated = { ...prev, sources: newSources };
      if (!isCustomDescription) {
        updated.description = generateReleaseDescription({
          title: updated.title,
          primary_artist: updated.primary_artist,
          sources: newSources
        });
      }
      return updated;
    });
    setNewSourceInput("");
  };

  const handleRemoveSource = (sourceToRemove) => {
    setSaveState("IDLE");
    setCurrentRelease(prev => {
      const currentSources = Array.isArray(prev.sources) ? prev.sources : [];
      const newSources = currentSources.filter(s => s !== sourceToRemove);
      const updated = { ...prev, sources: newSources };
      if (!isCustomDescription) {
        updated.description = generateReleaseDescription({
          title: updated.title,
          primary_artist: updated.primary_artist,
          sources: newSources
        });
      }
      return updated;
    });
  };

  const handleSave = async (e, asDraft = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    
    if (!currentRelease.title || !currentRelease.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!currentRelease.release_date || !currentRelease.type) {
      setError("Release Date and Type are required.");
      return;
    }

    // Req #1: Automatically derive slug from project title when created or renamed
    const slug =
      slugify(currentRelease.title) ||
      (currentRelease.slug ? currentRelease.slug.trim() : "") ||
      "release-" + Date.now();

    // Canonical display date derived from release timestamp
    const canonicalDisplayDate = formatReleaseDisplayDate(currentRelease.release_date);

    // Req #10: Automatic Status Determination from Release Date / Schedule
    const relDate = new Date(currentRelease.release_date);
    const schedDate = currentRelease.scheduled_at ? new Date(currentRelease.scheduled_at) : null;
    const isFuture =
      (!isNaN(relDate.getTime()) && relDate > new Date()) ||
      (schedDate && !isNaN(schedDate.getTime()) && schedDate > new Date());
    const targetStatus = asDraft ? "DRAFT" : (isFuture ? "SCHEDULED" : "PUBLISHED");

    try {
      const payload = {
        ...currentRelease,
        status: targetStatus,
        is_draft: asDraft,
        slug,
        display_date: canonicalDisplayDate,
        preview_asset_id: currentRelease.preview_asset_id || null
      };

      const nullableFields = ["number", "display_date", "description", "cover_asset_id", "preview_asset_id"];
      nullableFields.forEach(field => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });
      
      // Ensure platforms is object or null
      if (payload.platforms && typeof payload.platforms === "object" && Object.keys(payload.platforms).length === 0) {
        payload.platforms = null;
      }

      // Ensure sources is array or null
      if (Array.isArray(payload.sources) && payload.sources.length === 0) {
        payload.sources = null;
      }

      setIsSaving(true);
      setSaveState("SAVING");
      if (view === "CREATE") {
        const saved = await adminApi.createRelease(payload);
        clearDraft();
        await fetchData();
        refreshCatalogue();
        setCurrentRelease(saved);
        setView("EDIT"); // Transition to EDIT view so user can immediately manage project tracks!
      } else {
        const updated = await adminApi.updateRelease(payload.id, payload);
        clearDraft();
        await fetchData();
        refreshCatalogue();
        setCurrentRelease(updated);
      }
      setSaveSuccess(true);
      setSaveState("SAVED");
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to save release.");
      setSaveState("IDLE");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteRelease(id);
      await fetchData();
      refreshCatalogue();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete release.");
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // PROJECT TRACKS INLINE ACTIONS
  // -------------------------------------------------------------
  const projectTracks = currentRelease?.id 
    ? tracks.filter(t => t.release_id === currentRelease.id).sort((a, b) => a.track_number - b.track_number)
    : [];

  const handleOpenAddTrack = () => {
    setEditingTrack({
      release_id: currentRelease.id,
      track_number: projectTracks.length + 1,
      title: "",
      preview_asset_id: null,
      platforms: {},
      credits: []
    });
    setTrackError(null);
    setIsTrackModalOpen(true);
  };

  const handleOpenEditTrack = (track) => {
    const trackCredits = credits.filter(c => c.track_id === track.id);
    setEditingTrack({
      ...track,
      preview_asset_id: track.preview_asset_id || null,
      platforms: track.platforms && typeof track.platforms === "object" ? track.platforms : {},
      credits: trackCredits
    });
    setTrackError(null);
    setIsTrackModalOpen(true);
  };

  const handleSaveTrack = async (e) => {
    e.preventDefault();
    if (!editingTrack.title || !editingTrack.title.trim()) {
      setTrackError("Track title is required.");
      return;
    }

    setIsSavingTrack(true);
    setTrackError(null);
    try {
      const payload = {
        release_id: currentRelease.id,
        track_number: Number(editingTrack.track_number) || (projectTracks.length + 1),
        title: editingTrack.title.trim(),
        preview_asset_id: editingTrack.preview_asset_id || null,
        platforms: editingTrack.platforms && Object.keys(editingTrack.platforms).length > 0 ? editingTrack.platforms : null
      };

      if (editingTrack.id) {
        await adminApi.updateTrack(editingTrack.id, payload);
      } else {
        await adminApi.createTrack(payload);
      }

      // Refresh data
      const updatedTracks = await adminApi.getTracks();
      setTracks(updatedTracks);
      refreshCatalogue();
      setIsTrackModalOpen(false);
      setEditingTrack(null);
    } catch (err) {
      setTrackError(err.message || "Failed to save track.");
    } finally {
      setIsSavingTrack(false);
    }
  };

  const handleDeleteTrack = async (trackId) => {
    try {
      await adminApi.deleteTrack(trackId);
      const updatedTracks = await adminApi.getTracks();
      setTracks(updatedTracks);
      refreshCatalogue();
      setDeleteTrackConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete track.");
    }
  };

  const handleAddTrackCredit = async (e) => {
    e.preventDefault();
    if (!newTrackCreditName.trim() || !editingTrack?.id) return;
    try {
      await adminApi.createTrackCredit({
        track_id: editingTrack.id,
        credit_name: newTrackCreditName.trim(),
        role: newTrackCreditRole
      });
      const updatedCredits = await adminApi.getTrackCredits();
      setCredits(updatedCredits);
      setEditingTrack(prev => ({
        ...prev,
        credits: updatedCredits.filter(c => c.track_id === editingTrack.id)
      }));
      setNewTrackCreditName("");
    } catch (err) {
      setTrackError(err.message || "Failed to add track credit.");
    }
  };

  const handleDeleteTrackCredit = async (creditId) => {
    try {
      await adminApi.deleteTrackCredit(creditId);
      const updatedCredits = await adminApi.getTrackCredits();
      setCredits(updatedCredits);
      setEditingTrack(prev => ({
        ...prev,
        credits: updatedCredits.filter(c => c.track_id === editingTrack.id)
      }));
    } catch (err) {
      setTrackError(err.message || "Failed to delete credit.");
    }
  };

  // Sort releases by user-editable release_date || created_at
  const sortedReleases = [...releases].sort((a, b) => {
    const da = a.release_date ? new Date(a.release_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
    const db = b.release_date ? new Date(b.release_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
    return sortOrder === "desc" ? db - da : da - db;
  });

  // Helper to find cover image url
  const getCoverUrl = (coverAssetId) => {
    if (!coverAssetId) return null;
    const asset = mediaAssets.find(m => m.id === coverAssetId);
    if (asset?.has_file_data) return `/api/media/asset/${asset.id}`;
    if (asset?.r2_key) {
      return asset.r2_key.startsWith('http') ? asset.r2_key : '/' + asset.r2_key.replace(/^\//, '');
    }
    return `/api/media/asset/${coverAssetId}`;
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)", padding: "48px", textAlign: "center" }}>Loading releases...</div>;
  }

  // -------------------------------------------------------------
  // PROJECT FORM VIEW (CREATE / EDIT)
  // -------------------------------------------------------------
  if (view === "CREATE" || view === "EDIT") {
    return (
      <div className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="studio-section-heading" style={{ margin: 0 }}>
              {view === "CREATE" ? "Create Project / Release" : `Manage Project: ${currentRelease.title}`}
            </h2>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {view === "EDIT" ? `Editing "${currentRelease.title || "Untitled Project"}" • /release/${currentRelease.slug || ""}` : "Configure project metadata, artwork, sources, and tracks."}
            </div>
          </div>
          <button onClick={handleCancelForm} className="studio-pill-btn" style={{ background: "transparent", color: "var(--text)" }} disabled={isSaving}>
            ← Back to Releases
          </button>
        </div>

        {error && <div className="admin-login-error" style={{ marginBottom: 16 }}>{error}</div>}

        <DraftAutosaveBanner
          hasRestorableDraft={hasRestorableDraft}
          lastSavedAt={lastSavedAt}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "4px" }}>1. Project Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Project Title *</label>
              <input 
                type="text" 
                name="title" 
                className="studio-input" 
                value={currentRelease.title || ""} 
                onChange={(e) => {
                  handleChange(e);
                  handleTitleOrArtistOrSourcesChange({ title: e.target.value });
                }} 
                required 
                disabled={isSaving} 
                placeholder="e.g. HORUS" 
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Primary Artist</label>
              <input 
                type="text" 
                name="primary_artist" 
                className="studio-input" 
                value={currentRelease.primary_artist || "silachomka"} 
                onChange={(e) => {
                  handleChange(e);
                  handleTitleOrArtistOrSourcesChange({ primary_artist: e.target.value });
                }} 
                disabled={isSaving} 
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Release Type *</label>
              <select name="type" className="studio-input" value={currentRelease.type || "single"} onChange={handleChange} required disabled={isSaving} style={{ height: "44px" }}>
                <option value="single">Single</option>
                <option value="ep">EP</option>
                <option value="album">Album</option>
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Release Date *</label>
              <input 
                type="date" 
                name="release_date_part" 
                className="studio-input" 
                value={releaseDatePart} 
                onChange={(e) => handleDateTimeChange(e.target.value, releaseTimePart)} 
                required 
                disabled={isSaving} 
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Release Time</label>
              <input 
                type="time" 
                name="release_time_part" 
                className="studio-input" 
                value={releaseTimePart} 
                onChange={(e) => handleDateTimeChange(releaseDatePart, e.target.value)} 
                disabled={isSaving} 
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Lifecycle Status (Automatic)</label>
              {(() => {
                const relDate = currentRelease.release_date ? new Date(currentRelease.release_date) : null;
                const schedDate = currentRelease.scheduled_at ? new Date(currentRelease.scheduled_at) : null;
                const isFuture =
                  (relDate && !isNaN(relDate.getTime()) && relDate > new Date()) ||
                  (schedDate && !isNaN(schedDate.getTime()) && schedDate > new Date());
                const computedStatus =
                  view === "CREATE" && saveState !== "SAVED"
                    ? "DRAFT (WILL " + (isFuture ? "SCHEDULE" : "PUBLISH") + " ON SAVE)"
                    : isFuture
                    ? "SCHEDULED"
                    : "PUBLISHED";
                const isSched = isFuture;
                return (
                  <div
                    className="studio-input"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      height: "44px",
                      background: "rgba(255, 255, 255, 0.02)",
                      cursor: "default",
                      fontSize: "12px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color:
                        view === "CREATE" && saveState !== "SAVED"
                          ? "#fbbf24"
                          : isSched
                          ? "#38bdf8"
                          : "#34d399",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          view === "CREATE" && saveState !== "SAVED"
                            ? "#fbbf24"
                            : isSched
                            ? "#38bdf8"
                            : "#34d399",
                      }}
                    />
                    <span>{computedStatus}</span>
                  </div>
                );
              })()}
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Schedule Publication (Optional)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="datetime-local" 
                  name="scheduled_at" 
                  className="studio-input" 
                  value={currentRelease.scheduled_at ? currentRelease.scheduled_at.slice(0, 16) : ""} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentRelease(prev => ({
                      ...prev,
                      scheduled_at: val ? new Date(val).toISOString() : null,
                      status: val ? "SCHEDULED" : (prev.status === "SCHEDULED" ? "PUBLISHED" : prev.status)
                    }));
                  }} 
                  disabled={isSaving} 
                />
                {currentRelease.scheduled_at && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRelease(prev => ({
                        ...prev,
                        scheduled_at: null,
                        status: prev.status === "SCHEDULED" ? "PUBLISHED" : prev.status
                      }));
                    }}
                    className="studio-pill-btn"
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                    title="Publish immediately / clear schedule"
                  >
                    Clear (Publish Now)
                  </button>
                )}
              </div>
              {currentRelease.scheduled_at && (
                <span style={{ fontSize: 11, color: "var(--gold)", marginTop: 4, display: "block" }}>
                  Scheduled for {new Date(currentRelease.scheduled_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--muted)", margin: "-8px 0 4px" }}>
            Canonical Display Date: <strong style={{ color: "var(--gold)" }}>{formatReleaseDisplayDate(currentRelease.release_date) || "—"}</strong>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Description / Liner Notes</label>
                <button
                  type="button"
                  onClick={handleRegenerateDescription}
                  className="studio-pill-btn"
                  style={{ fontSize: 11 }}
                  title="Reset description to official canonical format"
                >
                  Regenerate Default Description
                </button>
              </div>
              <textarea 
                name="description" 
                className="studio-input" 
                style={{ minHeight: "80px", resize: "vertical" }} 
                value={currentRelease.description || ""} 
                onChange={(e) => {
                  setIsCustomDescription(true);
                  handleChange(e);
                }} 
                disabled={isSaving} 
                placeholder="Project description, inspiration, and liner notes..." 
              />
            </div>
          </div>

          {/* SOURCES EDITOR */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>2. Project Sources</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px 0" }}>
              Specify the imprint or distribution source(s) for this release (e.g. chomkaMUSIC™, Def Jam).
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" }}>
              {(Array.isArray(currentRelease.sources) ? currentRelease.sources : []).map((source) => (
                <span
                  key={source}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(223, 194, 125, 0.15)",
                    border: "1px solid var(--gold)",
                    color: "var(--gold)",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: 500
                  }}
                >
                  {source}
                  <button
                    type="button"
                    onClick={() => handleRemoveSource(source)}
                    style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", padding: "0 2px", fontSize: "14px" }}
                    title="Remove source"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", maxWidth: "400px" }}>
              <input
                type="text"
                className="studio-input"
                style={{ fontSize: 13, height: 38 }}
                placeholder="Add source (e.g. chomkaMUSIC™)"
                value={newSourceInput}
                onChange={(e) => setNewSourceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSource(e); }}
              />
              <button
                type="button"
                onClick={handleAddSource}
                className="studio-pill-btn"
                style={{ whiteSpace: "nowrap", padding: "0 16px" }}
              >
                + Add Source
              </button>
            </div>
          </div>

          {/* COVER ART PICKER */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>3. Cover Artwork</h3>
            <MediaAssetPicker
              label="Release Cover Art"
              assetType="IMAGE"
              value={currentRelease.cover_asset_id}
              onChange={(id, assetRecord) => {
                setSaveState("IDLE");
                setCurrentRelease(prev => ({ ...prev, cover_asset_id: id }));
                if (assetRecord) {
                  setMediaAssets(prev => [assetRecord, ...prev.filter(m => m.id !== assetRecord.id)]);
                }
              }}
              disabled={isSaving}
              hint="Select or upload high-resolution cover artwork for this project."
            />
          </div>

          {/* PROJECT STREAMING LINKS */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <h3 style={{ fontSize: 14, color: "var(--gold)", marginBottom: "8px" }}>4. Project Streaming Links</h3>
            <PlatformLinksEditor
              label="Release Streaming Links (Spotify, Apple Music, YouTube Music, etc.)"
              value={currentRelease.platforms}
              onChange={(platforms) => {
                setSaveState("IDLE");
                setCurrentRelease(prev => ({ ...prev, platforms }));
              }}
              disabled={isSaving}
            />
          </div>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="studio-pill-btn"
              onClick={(e) => handleSave(e, true)}
              disabled={isSaving}
              style={{ background: "rgba(223, 194, 125, 0.08)", borderColor: "rgba(223, 194, 125, 0.4)", color: "var(--gold)" }}
            >
              Save as Draft
            </button>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {saveState === "SAVING" ? "Saving…" : saveState === "SAVED" ? "Saved" : "Save Project Metadata"}
            </button>
          </div>

        </form>

        {/* --------------------------------------------------------- */}
        {/* 5. PROJECT TRACKS SECTION (PROJECT-FIRST MANAGEMENT) */}
        {/* --------------------------------------------------------- */}
        {view === "EDIT" && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: "32px", paddingTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, color: "var(--gold)", margin: 0 }}>5. Project Tracks & Pre-Release Previews ({projectTracks.length})</h3>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0 0" }}>
                  Manage the tracklist and attach optional MP3 preview snippets to each track. During the pre-release countdown, the public 30-second preview player randomly selects a track with preview audio and plays a 30-second snippet without revealing track titles.
                </p>
              </div>
              <button
                type="button"
                className="studio-pill-btn"
                style={{ background: "rgba(223, 194, 125, 0.1)", borderColor: "var(--gold)", color: "var(--gold)" }}
                onClick={handleOpenAddTrack}
              >
                + Add Track to Project
              </button>
            </div>

            {projectTracks.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "6px", color: "var(--muted)" }}>
                No tracks have been added to this release project yet. Click "+ Add Track to Project" to add your first track.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(255, 255, 255, 0.02)" }}>
                      <th style={{ padding: "10px 12px", width: "50px", color: "var(--muted)" }}>#</th>
                      <th style={{ padding: "10px 12px", color: "var(--muted)" }}>Title</th>
                      <th style={{ padding: "10px 12px", color: "var(--muted)" }}>Credits</th>
                      <th style={{ padding: "10px 12px", color: "var(--muted)" }}>Platforms</th>
                      <th style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTracks.map((trk) => {
                      const trackCredits = credits.filter(c => c.track_id === trk.id);
                      const platformCount = trk.platforms && typeof trk.platforms === "object" ? Object.keys(trk.platforms).length : 0;
                      return (
                        <tr key={trk.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", color: "var(--gold)", fontWeight: 700 }}>
                            #{trk.track_number}
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--text-h)", fontWeight: 500 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span>{trk.title}</span>
                              {trk.preview_asset_id && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: "rgba(223, 194, 125, 0.14)",
                                    border: "1px solid rgba(223, 194, 125, 0.4)",
                                    color: "var(--gold)",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Preview Ready
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", color: "var(--muted)", fontSize: 12 }}>
                            {trackCredits.length > 0 ? (
                              trackCredits.map(c => `${c.role.toLowerCase()}: ${c.credit_name}`).join(", ")
                            ) : (
                              <span style={{ fontStyle: "italic", opacity: 0.6 }}>silachomka</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>
                            {platformCount > 0 ? `${platformCount} platform(s)` : "None"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            {deleteTrackConfirmId === trk.id ? (
                              <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: "#fca5a5" }}>Confirm?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTrack(trk.id)}
                                  className="studio-pill-btn"
                                  style={{ background: "rgba(220,38,38,0.2)", color: "#fca5a5", borderColor: "#fca5a5", fontSize: 11, padding: "2px 8px" }}
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTrackConfirmId(null)}
                                  className="studio-pill-btn"
                                  style={{ fontSize: 11, padding: "2px 8px" }}
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTrack(trk)}
                                  className="studio-pill-btn"
                                  style={{ fontSize: 12, padding: "2px 10px", marginRight: 6 }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTrackConfirmId(trk.id)}
                                  className="studio-pill-btn"
                                  style={{ background: "transparent", color: "var(--muted)", fontSize: 12, padding: "2px 8px" }}
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
        )}

        {/* --------------------------------------------------------- */}
        {/* INLINE TRACK EDIT / ADD MODAL */}
        {/* --------------------------------------------------------- */}
        {isTrackModalOpen && editingTrack && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}>
            <div style={{
              background: "var(--surface, #111116)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              textAlign: "left"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--text-h)" }}>
                  {editingTrack.id ? `Edit Track: ${editingTrack.title}` : `Add Track to ${currentRelease.title}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTrackModalOpen(false)}
                  style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer" }}
                >
                  ×
                </button>
              </div>

              {trackError && <div className="admin-login-error" style={{ marginBottom: 12 }}>{trackError}</div>}

              <form onSubmit={handleSaveTrack} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "12px" }}>
                  <div className="studio-field">
                    <label># Track</label>
                    <input
                      type="number"
                      className="studio-input"
                      value={editingTrack.track_number}
                      onChange={(e) => setEditingTrack(prev => ({ ...prev, track_number: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="studio-field">
                    <label>Track Title *</label>
                    <input
                      type="text"
                      className="studio-input"
                      value={editingTrack.title}
                      onChange={(e) => setEditingTrack(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. No Be Jazz"
                      required
                    />
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Inherited Release Date: <strong style={{ color: "var(--gold)" }}>{currentRelease.display_date || currentRelease.release_date}</strong>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <MediaAssetPicker
                    label="Track Preview Audio (MP3 — Optional Pre-Release Snippet)"
                    assetType="AUDIO"
                    value={editingTrack.preview_asset_id}
                    onChange={(id, assetRecord) => {
                      setEditingTrack(prev => ({ ...prev, preview_asset_id: id }));
                      if (assetRecord) {
                        setMediaAssets(prev => [assetRecord, ...prev.filter(m => m.id !== assetRecord.id)]);
                      }
                    }}
                    disabled={isSavingTrack}
                    hint="Plays a random 30s snippet on upcoming release pages without revealing the track title publicly."
                  />
                </div>

                <PlatformLinksEditor
                  label="Track Specific Streaming Links"
                  value={editingTrack.platforms}
                  onChange={(platforms) => setEditingTrack(prev => ({ ...prev, platforms }))}
                />

                {/* Credits section in edit modal */}
                {editingTrack.id && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>Track Credits</label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "8px 0" }}>
                      {(editingTrack.credits || []).map(c => (
                        <span key={c.id} style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--border)",
                          borderRadius: "14px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <strong>{c.role}:</strong> {c.credit_name}
                          <button
                            type="button"
                            onClick={() => handleDeleteTrackCredit(c.id)}
                            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        className="studio-input"
                        placeholder="Credit Name (e.g. Artist or Producer)"
                        value={newTrackCreditName}
                        onChange={(e) => setNewTrackCreditName(e.target.value)}
                        style={{ fontSize: 12, height: 34, flex: 1 }}
                      />
                      <select
                        className="studio-input"
                        value={newTrackCreditRole}
                        onChange={(e) => setNewTrackCreditRole(e.target.value)}
                        style={{ fontSize: 12, height: 34, minWidth: 145 /* minWidth: 135 */, flex: "0 0 145px", width: 145, boxSizing: "border-box", padding: "0 24px 0 10px" }}
                      >
                        <option value="FEATURING">FEATURING</option>
                        <option value="PRODUCER">PRODUCER</option>
                        <option value="WRITER">WRITER</option>
                        <option value="ENGINEER">ENGINEER</option>
                        <option value="DIRECTOR">DIRECTOR</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddTrackCredit}
                        className="studio-pill-btn"
                        style={{ fontSize: 11, padding: "0 10px" }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setIsTrackModalOpen(false)}
                    className="studio-pill-btn"
                    style={{ background: "transparent" }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={isSavingTrack}>
                    {isSavingTrack ? "Saving..." : "Save Track"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  // -------------------------------------------------------------
  // LIST VIEW (GRID / TABLE)
  // -------------------------------------------------------------
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>Music Management (Projects)</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <AdminSortControl sortOrder={sortOrder} onChange={setSortOrder} label="Sort Releases" />
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
          <button className="primary-button" onClick={handleCreateClick}>+ Create Release Project</button>
        </div>
      </div>

      {error && <div className="admin-login-error" style={{ marginBottom: 16 }}>{error}</div>}

      <DraftListResumeBanner
        entityKey="release_new"
        entityLabel="Release Project"
        onResume={(draftData) => {
          setCurrentRelease(draftData);
          if (draftData.release_date) {
            const d = new Date(draftData.release_date);
            if (!isNaN(d.getTime())) {
              setReleaseDatePart(d.toISOString().split("T")[0]);
              setReleaseTimePart(d.toISOString().split("T")[1]?.slice(0, 5) || "00:00");
            }
          }
          setView("CREATE");
        }}
      />

      {sortedReleases.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Releases Found</h2>
          <p>You haven't added any music releases to the catalogue yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Release Project</button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="admin-listing-grid">
          {sortedReleases.map(release => {
            const coverUrl = getCoverUrl(release.cover_asset_id);
            const relTracks = tracks.filter(t => t.release_id === release.id);
            return (
              <div key={release.id} className="admin-item-card">
                <div>
                  {/* Artwork frame */}
                  <div style={{ position: "relative", width: "100%", paddingBottom: "100%", background: "rgba(255, 255, 255, 0.03)", borderRadius: "4px", overflow: "hidden", marginBottom: "12px", border: "1px solid var(--border)" }}>
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={release.title}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          if (!e.target.dataset.fallbackTried) {
                            e.target.dataset.fallbackTried = 'true';
                            e.target.src = '/og-image.png';
                          }
                        }}
                      />
                    ) : (
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "var(--muted)", fontSize: "12px" }}>
                        No Artwork
                      </div>
                    )}
                    <span style={{ 
                      position: "absolute", 
                      top: 8, 
                      right: 8, 
                      padding: "2px 8px", 
                      borderRadius: "4px", 
                      fontSize: 10, 
                      fontWeight: 700, 
                      textTransform: "uppercase",
                      background: release.status === "PUBLISHED" ? "rgba(16, 185, 129, 0.9)" : release.status === "SCHEDULED" ? "rgba(56, 189, 248, 0.9)" : "rgba(245, 158, 11, 0.9)",
                      color: "#000"
                    }}>
                      {release.status || "DRAFT"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, margin: "0 0 4px 0", color: "var(--text-h)" }}>{release.title}</h3>
                  <div style={{ fontSize: 12, color: "var(--gold)", textTransform: "uppercase", fontWeight: 600 }}>
                    {release.type} • {release.display_date || release.release_date}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    {relTracks.length} {relTracks.length === 1 ? "track" : "tracks"} • /{release.slug}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <button 
                    onClick={() => handleEditClick(release)}
                    className="studio-pill-btn"
                    style={{ fontSize: 12 }}
                  >
                    Manage Project
                  </button>
                  {deleteConfirmId === release.id ? (
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#fca5a5" }}>Delete?</span>
                      <button 
                        onClick={() => handleDelete(release.id)} 
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
                      onClick={() => setDeleteConfirmId(release.id)}
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
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Cover / Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type / Date</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Tracks</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedReleases.map(release => {
                const coverUrl = getCoverUrl(release.cover_asset_id);
                const relTracks = tracks.filter(t => t.release_id === release.id);
                return (
                  <tr key={release.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {coverUrl && (
                          <img
                            src={coverUrl}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)" }}
                            onError={(e) => {
                              if (!e.target.dataset.fallbackTried) {
                                e.target.dataset.fallbackTried = 'true';
                                e.target.src = '/og-image.png';
                              }
                            }}
                          />
                        )}
                        <div>
                          <div>{release.title}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 2 }}>/{release.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ textTransform: "uppercase", fontSize: 12, fontWeight: 600 }}>{release.type}</span>
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>{release.display_date || release.release_date}</div>
                    </td>
                    <td style={{ padding: "16px", fontSize: 13, color: "var(--text-h)" }}>
                      {relTracks.length} track(s)
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        fontSize: 10, 
                        fontWeight: 700, 
                        textTransform: "uppercase",
                        background: release.status === "PUBLISHED" ? "rgba(16, 185, 129, 0.1)" : release.status === "SCHEDULED" ? "rgba(56, 189, 248, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        color: release.status === "PUBLISHED" ? "#34d399" : release.status === "SCHEDULED" ? "#38bdf8" : "#fbbf24"
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
                            Manage Project
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminMusicPage;

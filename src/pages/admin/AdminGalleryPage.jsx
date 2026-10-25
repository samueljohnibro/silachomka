import { useState, useEffect } from "react";
import { adminApi } from "../../data/adminApi";
import AdminSortControl from "../../components/admin/AdminSortControl";
import AdminViewToggle from "../../components/admin/AdminViewToggle";
import "./admin.css";

const AdminGalleryPage = () => {
  const [posts, setPosts] = useState([]);
  const [slides, setSlides] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [releases, setReleases] = useState([]);
  const [tracks, setTracks] = useState([]);
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

  const [currentPost, setCurrentPost] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Slide management state
  const [newSlideAssetId, setNewSlideAssetId] = useState("");
  const [newSlideType, setNewSlideType] = useState("image");
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [slideError, setSlideError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [postsData, slidesData, mediaData, releasesData, tracksData] = await Promise.all([
        adminApi.getGallery().catch(() => []),
        adminApi.getGallerySlides().catch(() => []),
        adminApi.getMediaAssets().catch(() => []),
        adminApi.getReleases().catch(() => []),
        adminApi.getTracks().catch(() => []),
      ]);
      setPosts(postsData);
      setSlides(slidesData);
      setMediaAssets(mediaData);
      setReleases(releasesData);
      setTracks(tracksData);
    } catch (err) {
      setError(err.message || "Failed to load gallery posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClick = () => {
    setCurrentPost({
      slug: "",
      title: "",
      caption: "",
      category: "portraits",
      post_type: "image",
      primary_asset_id: "",
      related_release_id: "",
      related_track_id: "",
      related_beat_id: "",
      legacy_link: "",
      tags: "",
      post_date: "",
      display_date: "",
      status: "DRAFT",
    });
    setView("CREATE");
    setError(null);
    setSlideError(null);
  };

  const handleEditClick = (post) => {
    setCurrentPost({
      ...post,
      tags: post.tags ? JSON.stringify(post.tags) : "",
    });
    setView("EDIT");
    setError(null);
    setSlideError(null);
    setNewSlideAssetId("");
  };

  const handleCancelForm = (e) => {
    if (e) e.preventDefault();
    setView("LIST");
    setCurrentPost(null);
    setError(null);
    setSlideError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPost((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    const slugify = (text) => (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    let slug = currentPost.slug ? currentPost.slug.trim() : slugify(currentPost.title);
    if (!slug) slug = "gallery-" + Date.now();

    if (!currentPost.title || !currentPost.post_date) {
      setError("Title and Post Date are required.");
      return;
    }

    try {
      const payload = { 
        ...currentPost,
        slug,
        post_type: currentPost.post_type || "image"
      };
      const nullableFields = [
        "caption", "category", "primary_asset_id", "related_release_id",
        "related_track_id", "related_beat_id", "legacy_link", "display_date",
      ];
      nullableFields.forEach((field) => {
        if (payload[field] === "") {
          payload[field] = null;
        }
      });

      if (payload.tags === "") {
        payload.tags = null;
      } else if (payload.tags) {
        try {
          payload.tags = JSON.parse(payload.tags);
        } catch {
          setError("Invalid JSON in Tags field.");
          return;
        }
      }

      setIsSaving(true);
      let savedPost;
      if (view === "CREATE") {
        savedPost = await adminApi.createGalleryPost(payload);
      } else {
        savedPost = await adminApi.updateGalleryPost(payload.id, payload);
      }

      await fetchData();
      setView("LIST");
      setCurrentPost(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.message || "Failed to save gallery post.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteGalleryPost(id);
      await fetchData();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Gallery Slides Management
  const currentPostSlides = currentPost?.id
    ? slides.filter((s) => s.post_id === currentPost.id).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const handleAddSlide = async (e) => {
    e.preventDefault();
    if (!newSlideAssetId.trim() || !currentPost?.id) return;

    setIsAddingSlide(true);
    setSlideError(null);
    try {
      const nextSortOrder = currentPostSlides.length > 0
        ? Math.max(...currentPostSlides.map((s) => s.sort_order)) + 1
        : 0;

      await adminApi.createGallerySlide({
        post_id: currentPost.id,
        asset_id: newSlideAssetId.trim(),
        sort_order: nextSortOrder,
        slide_type: newSlideType,
      });
      const updatedSlides = await adminApi.getGallerySlides();
      setSlides(updatedSlides);
      setNewSlideAssetId("");
    } catch (err) {
      setSlideError(err.message || "Failed to add slide.");
    } finally {
      setIsAddingSlide(false);
    }
  };

  const handleDeleteSlide = async (slideId) => {
    setSlideError(null);
    try {
      await adminApi.deleteGallerySlide(slideId);
      const updatedSlides = await adminApi.getGallerySlides();
      setSlides(updatedSlides);
    } catch (err) {
      setSlideError(err.message || "Failed to remove slide.");
    }
  };

  // Helper to resolve asset filename
  const getAssetLabel = (assetId) => {
    const asset = mediaAssets.find((a) => a.id === assetId);
    if (asset) return asset.original_filename || asset.r2_key;
    return assetId;
  };

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)" }}>Loading gallery posts...</div>;
  }

  if (view === "CREATE" || view === "EDIT") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>
            {view === "CREATE" ? "Create Gallery Post" : "Edit Gallery Post"}
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
              <input type="text" name="title" className="studio-input" value={currentPost.title || ""} onChange={handleChange} required disabled={isSaving} placeholder="Post title or visual name" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Slug (Auto-generated if blank)</label>
              <input type="text" name="slug" className="studio-input" value={currentPost.slug || ""} onChange={handleChange} disabled={isSaving} placeholder="Leave blank to auto-generate" />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Format / Type *</label>
              <select name="post_type" className="studio-input" value={currentPost.post_type || "image"} onChange={handleChange} disabled={isSaving} style={{ height: "44px" }}>
                <option value="image">Single Image</option>
                <option value="carousel">Carousel (Multi-slide)</option>
                <option value="video">Video</option>
                <option value="reel">Reel / Vertical Short</option>
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Category</label>
              <input type="text" name="category" className="studio-input" value={currentPost.category || ""} onChange={handleChange} disabled={isSaving} placeholder="e.g. portraits, live, studio" />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Date & Display</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Post Date *</label>
              <input 
                type="date" 
                name="post_date" 
                className="studio-input" 
                value={currentPost.post_date ? currentPost.post_date.split("T")[0] : ""} 
                onChange={handleChange} 
                required 
                disabled={isSaving} 
              />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Display Date (Formatted text override)</label>
              <input type="text" name="display_date" className="studio-input" value={currentPost.display_date || ""} onChange={handleChange} disabled={isSaving} placeholder="e.g. March 2025" />
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Details & Media Asset</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Caption / Note</label>
              <textarea name="caption" className="studio-input" style={{ minHeight: "80px", resize: "vertical" }} value={currentPost.caption || ""} onChange={handleChange} disabled={isSaving} placeholder="Caption or context for this visual..." />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Primary Media Asset</label>
              <select name="primary_asset_id" className="studio-input" value={currentPost.primary_asset_id || ""} onChange={handleChange} disabled={isSaving} style={{ height: "44px" }}>
                <option value="">-- Select from Uploaded Media Assets --</option>
                {mediaAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.original_filename || a.r2_key} ({a.asset_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 14, color: "var(--gold)", marginTop: "16px", marginBottom: "8px" }}>Project & Track Associations</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Associated Release / Project</label>
              <select name="related_release_id" className="studio-input" value={currentPost.related_release_id || ""} onChange={handleChange} disabled={isSaving} style={{ height: "44px" }}>
                <option value="">-- None (Independent Gallery Post) --</option>
                {releases.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.type || "Release"})
                  </option>
                ))}
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Associated Track</label>
              <select name="related_track_id" className="studio-input" value={currentPost.related_track_id || ""} onChange={handleChange} disabled={isSaving} style={{ height: "44px" }}>
                <option value="">-- None --</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>External Post / Instagram Link</label>
              <input type="text" name="legacy_link" className="studio-input" value={currentPost.legacy_link || ""} onChange={handleChange} disabled={isSaving} placeholder="https://instagram.com/p/..." />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Tags (JSON Array)</label>
              <input type="text" name="tags" className="studio-input" value={currentPost.tags || ""} onChange={handleChange} disabled={isSaving} placeholder='["tag1", "tag2"]' />
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Status</label>
              <select name="status" className="studio-input" value={currentPost.status || "DRAFT"} onChange={handleChange} disabled={isSaving}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ARCHIVED">Archived</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </div>
            <div className="studio-field" style={{ textAlign: "left" }}>
              <label>Schedule Publication (Optional)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="datetime-local" 
                  name="scheduled_at" 
                  className="studio-input" 
                  value={currentPost.scheduled_at ? currentPost.scheduled_at.slice(0, 16) : ""} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentPost(prev => ({
                      ...prev,
                      scheduled_at: val ? new Date(val).toISOString() : null,
                      status: val ? "SCHEDULED" : (prev.status === "SCHEDULED" ? "PUBLISHED" : prev.status)
                    }));
                  }} 
                  disabled={isSaving} 
                />
                {currentPost.scheduled_at && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPost(prev => ({
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
              {currentPost.scheduled_at && (
                <span style={{ fontSize: 11, color: "var(--gold)", marginTop: 4, display: "block" }}>
                  ⏰ Scheduled for {new Date(currentPost.scheduled_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Post"}
            </button>
          </div>

        </form>

        {/* GALLERY SLIDES (EDIT MODE for carousel posts) */}
        {view === "EDIT" && currentPost?.id && (
          <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
            <h3 style={{ fontSize: 16, color: "var(--text-h)", marginBottom: 8 }}>
              Carousel Slides
              {currentPost.post_type !== "carousel" && (
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginLeft: 8 }}>
                  (set Post Type to "carousel" to use multi-slide)
                </span>
              )}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
              Manage the ordered media slides for this post. Each slide references a media asset. Changes are saved immediately.
            </p>

            {slideError && <div className="admin-login-error" style={{ marginBottom: 16 }}>{slideError}</div>}

            <div style={{ marginBottom: 20 }}>
              {currentPostSlides.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>
                  No slides added yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {currentPostSlides.map((s, idx) => (
                    <div
                      key={s.id}
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
                        <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: 16, minWidth: 24, textAlign: "center" }}>
                          {idx + 1}
                        </span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600,
                          background: s.slide_type === "video" ? "rgba(147, 51, 234, 0.15)" : "rgba(34, 197, 94, 0.15)",
                          color: s.slide_type === "video" ? "#c084fc" : "#4ade80",
                        }}>
                          {s.slide_type || "image"}
                        </span>
                        <span style={{ color: "var(--text-h)", fontSize: 13 }}>
                          {getAssetLabel(s.asset_id)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(s.id)}
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

            <form onSubmit={handleAddSlide} style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 8, maxWidth: 600 }}>
              <select
                className="studio-input"
                value={newSlideAssetId}
                onChange={(e) => setNewSlideAssetId(e.target.value)}
                disabled={isAddingSlide}
                required
              >
                <option value="">-- Select Asset --</option>
                {mediaAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.original_filename || a.r2_key} ({a.asset_type})
                  </option>
                ))}
              </select>
              <select
                className="studio-input"
                value={newSlideType}
                onChange={(e) => setNewSlideType(e.target.value)}
                disabled={isAddingSlide}
              >
                <option value="image">image</option>
                <option value="video">video</option>
              </select>
              <button
                type="submit"
                className="studio-pill-btn"
                style={{ background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)", whiteSpace: "nowrap" }}
                disabled={isAddingSlide || !newSlideAssetId}
              >
                {isAddingSlide ? "Adding..." : "+ Add Slide"}
              </button>
            </form>
          </div>
        )}

        {view === "CREATE" && currentPost?.post_type === "carousel" && (
          <div style={{ marginTop: 24, padding: 16, background: "rgba(255, 255, 255, 0.02)", border: "1px dashed var(--border)", borderRadius: 4, color: "var(--muted)", fontSize: 13 }}>
            💡 Tip: Save this carousel post first, then you can add individual slides immediately.
          </div>
        )}
      </div>
    );
  }

  // Sort posts by post_date || created_at
  const sortedPosts = [...posts].sort((a, b) => {
    const da = a.post_date ? new Date(a.post_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
    const db = b.post_date ? new Date(b.post_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
    return sortOrder === "desc" ? db - da : da - db;
  });

  // LIST VIEW
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="studio-section-heading" style={{ margin: 0 }}>Gallery Management</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <AdminSortControl sortOrder={sortOrder} onChange={setSortOrder} label="Sort Gallery" />
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
          <button className="primary-button" onClick={handleCreateClick}>+ Create Post</button>
        </div>
      </div>

      {error && <div className="admin-login-error">{error}</div>}

      {sortedPosts.length === 0 ? (
        <div className="admin-placeholder">
          <h2>No Gallery Posts Found</h2>
          <p>You haven't added any posts to the gallery yet.</p>
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>Create First Post</button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="admin-listing-grid">
          {sortedPosts.map((post) => {
            const postSlides = slides.filter((s) => s.post_id === post.id);
            const primaryAsset = mediaAssets.find((m) => m.id === post.primary_asset_id) || (postSlides[0] ? mediaAssets.find((m) => m.id === postSlides[0].asset_id) : null);
            const assetUrl = primaryAsset
              ? (primaryAsset.has_file_data ? `/api/media/asset/${primaryAsset.id}` : (primaryAsset.r2_key ? '/' + primaryAsset.r2_key.replace(/^\//, '') : `/api/media/asset/${primaryAsset.id}`))
              : (post.primary_asset_id ? `/api/media/asset/${post.primary_asset_id}` : null);
            return (
              <div key={post.id} className="admin-item-card">
                <div>
                  <div style={{ position: "relative", width: "100%", paddingBottom: "75%", background: "#000", borderRadius: "4px", overflow: "hidden", marginBottom: "12px", border: "1px solid var(--border)" }}>
                    {assetUrl ? (
                      <img
                        src={assetUrl}
                        alt={post.title}
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
                        No Image
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
                      background: post.status === "PUBLISHED" ? "rgba(16, 185, 129, 0.9)" : post.status === "SCHEDULED" ? "rgba(56, 189, 248, 0.9)" : "rgba(245, 158, 11, 0.9)",
                      color: "#000"
                    }}>
                      {post.status || "DRAFT"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, margin: "0 0 4px 0", color: "var(--text-h)" }}>{post.title}</h3>
                  <div style={{ fontSize: 12, color: "var(--gold)", textTransform: "uppercase", fontWeight: 600 }}>
                    {post.post_type} • {post.display_date || post.post_date}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    {postSlides.length} slide(s) • category: {post.category || "General"}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <button
                    onClick={() => handleEditClick(post)}
                    className="studio-pill-btn"
                    style={{ fontSize: 12 }}
                  >
                    Edit
                  </button>
                  {deleteConfirmId === post.id ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#fca5a5" }}>Delete?</span>
                      <button
                        onClick={() => handleDelete(post.id)}
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
                      onClick={() => setDeleteConfirmId(post.id)}
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
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type / Date</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Slides</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((post) => {
                const postSlides = slides.filter((s) => s.post_id === post.id);
                return (
                  <tr key={post.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                      {post.title}
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>/{post.slug}</div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      {post.post_type}
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 4 }}>{post.post_date}</div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      {postSlides.length > 0 ? (
                        <span style={{ padding: "2px 6px", background: "rgba(223, 194, 125, 0.1)", color: "var(--gold)", borderRadius: 3, fontSize: 11 }}>
                          {postSlides.length} slide{postSlides.length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: post.status === "PUBLISHED" ? "rgba(16, 185, 129, 0.1)" : post.status === "SCHEDULED" ? "rgba(56, 189, 248, 0.1)" : "rgba(245, 158, 11, 0.1)",
                        color: post.status === "PUBLISHED" ? "#34d399" : post.status === "SCHEDULED" ? "#38bdf8" : "#fbbf24",
                      }}>
                        {post.status || "DRAFT"}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      {deleteConfirmId === post.id ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "#fca5a5" }}>Confirm?</span>
                          <button
                            onClick={() => handleDelete(post.id)}
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
                            onClick={() => handleEditClick(post)}
                            className="studio-pill-btn"
                            style={{ marginRight: 8 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(post.id)}
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

export default AdminGalleryPage;

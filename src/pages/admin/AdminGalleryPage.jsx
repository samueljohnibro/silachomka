import { useState, useEffect, useRef } from "react";
import { adminApi } from "../../data/adminApi";
import AdminSortControl from "../../components/admin/AdminSortControl";
import AdminViewToggle from "../../components/admin/AdminViewToggle";
import { formatGalleryDate } from "../../utils/dateFormatter";
import "./admin.css";

const AdminGalleryPage = () => {
  const [posts, setPosts] = useState([]);
  const [slides, setSlides] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [releases, setReleases] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [categories, setCategories] = useState([]);
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

  // Media Library Modal state
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState("primary"); // 'primary' or 'carousel'
  const [librarySearch, setLibrarySearch] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // File input refs
  const primaryFileInputRef = useRef(null);
  const carouselFileInputRef = useRef(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [postsData, slidesData, mediaData, releasesData, tracksData, categoriesData] = await Promise.all([
        adminApi.getGallery().catch(() => []),
        adminApi.getGallerySlides().catch(() => []),
        adminApi.getMediaAssets().catch(() => []),
        adminApi.getReleases().catch(() => []),
        adminApi.getTracks().catch(() => []),
        adminApi.getGalleryCategories().catch(() => [
          { slug: "portraits", label: "Portraits & Style" },
          { slug: "bts", label: "Studio & BTS" },
          { slug: "releases", label: "Releases" },
          { slug: "freestyles", label: "Freestyles & Covers" },
          { slug: "videos", label: "Videos" },
        ]),
      ]);
      setPosts(postsData);
      setSlides(slidesData);
      setMediaAssets(mediaData);
      setReleases(releasesData);
      setTracks(tracksData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message || "Failed to load gallery posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getMediaUrl = (assetId) => {
    if (!assetId) return null;
    const asset = mediaAssets.find((a) => a.id === assetId);
    if (asset?.has_file_data) return `/api/media/asset/${asset.id}`;
    if (asset?.r2_key) return `/${asset.r2_key.replace(/^\//, "")}`;
    return `/api/media/asset/${assetId}`;
  };

  const handleCreateClick = () => {
    const today = new Date().toISOString().split("T")[0];
    setCurrentPost({
      title: "",
      caption: "",
      category: categories[0]?.label || "Portraits & Style",
      post_type: "image",
      primary_asset_id: "",
      related_release_id: "",
      related_track_id: "",
      legacy_link: "",
      post_date: today,
      status: "DRAFT",
      carouselSlides: [],
    });
    setView("CREATE");
    setError(null);
  };

  const handleEditClick = (post) => {
    const postSlides = slides
      .filter((s) => s.post_id === post.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        asset_id: s.asset_id,
        slide_type: s.slide_type || "image",
        sort_order: s.sort_order,
      }));

    setCurrentPost({
      ...post,
      title: post.title || "",
      caption: post.caption || "",
      category: post.category || "Portraits & Style",
      post_date: post.post_date ? post.post_date.split("T")[0] : "",
      carouselSlides: postSlides,
    });
    setView("EDIT");
    setError(null);
  };

  const handleCancelForm = (e) => {
    if (e) e.preventDefault();
    setView("LIST");
    setCurrentPost(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPost((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Direct file upload handler
  const handleFileUpload = async (e, target = "primary") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    setError(null);

    try {
      if (target === "primary") {
        const file = files[0];
        const res = await adminApi.uploadMediaAsset(file);
        const newAsset = res.asset;

        // Add to mediaAssets state immediately
        setMediaAssets((prev) => [newAsset, ...prev]);

        // Auto-detect post type based on file MIME
        const isVid = file.type.startsWith("video/") || newAsset.asset_type === "VIDEO";
        setCurrentPost((prev) => ({
          ...prev,
          primary_asset_id: newAsset.id,
          post_type: prev.post_type === "carousel" ? "carousel" : (isVid ? "video" : "image"),
        }));
      } else {
        // Carousel multi-upload
        const newSlides = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const res = await adminApi.uploadMediaAsset(file);
          const newAsset = res.asset;
          setMediaAssets((prev) => [newAsset, ...prev]);

          const isVid = file.type.startsWith("video/") || newAsset.asset_type === "VIDEO";
          newSlides.push({
            asset_id: newAsset.id,
            slide_type: isVid ? "video" : "image",
            sort_order: (currentPost.carouselSlides?.length || 0) + i,
          });
        }

        setCurrentPost((prev) => ({
          ...prev,
          post_type: "carousel",
          carouselSlides: [...(prev.carouselSlides || []), ...newSlides],
          primary_asset_id: prev.primary_asset_id || newSlides[0]?.asset_id || "",
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to upload file.");
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = "";
    }
  };

  // Library modal select handler
  const handleSelectFromLibrary = (asset) => {
    if (libraryTarget === "primary") {
      const isVid = asset.asset_type === "VIDEO" || asset.mime_type?.startsWith("video/");
      setCurrentPost((prev) => ({
        ...prev,
        primary_asset_id: asset.id,
        post_type: prev.post_type === "carousel" ? "carousel" : (isVid ? "video" : "image"),
      }));
    } else {
      const isVid = asset.asset_type === "VIDEO" || asset.mime_type?.startsWith("video/");
      const nextSort = currentPost.carouselSlides?.length || 0;
      setCurrentPost((prev) => ({
        ...prev,
        post_type: "carousel",
        carouselSlides: [
          ...(prev.carouselSlides || []),
          { asset_id: asset.id, slide_type: isVid ? "video" : "image", sort_order: nextSort },
        ],
        primary_asset_id: prev.primary_asset_id || asset.id,
      }));
    }
    setShowLibraryModal(false);
  };

  // Carousel slide manipulation
  const moveCarouselSlide = (index, direction) => {
    const list = [...(currentPost.carouselSlides || [])];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    list.forEach((s, idx) => {
      s.sort_order = idx;
    });
    setCurrentPost((prev) => ({
      ...prev,
      carouselSlides: list,
      primary_asset_id: list[0]?.asset_id || prev.primary_asset_id,
    }));
  };

  const removeCarouselSlide = (index) => {
    const list = [...(currentPost.carouselSlides || [])];
    list.splice(index, 1);
    list.forEach((s, idx) => {
      s.sort_order = idx;
    });
    setCurrentPost((prev) => ({
      ...prev,
      carouselSlides: list,
      primary_asset_id: list[0]?.asset_id || "",
      post_type: list.length <= 1 ? "image" : "carousel",
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    if (!currentPost.post_date) {
      setError("Post Date is required.");
      return;
    }

    // Auto-generate stable slug if not existing
    const slugify = (text) => (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    let slug = currentPost.slug ? currentPost.slug.trim() : slugify(currentPost.title);
    if (!slug) {
      const datePart = currentPost.post_date ? currentPost.post_date.split("T")[0] : new Date().toISOString().slice(0, 10);
      const typePart = (currentPost.post_type || "image").toLowerCase();
      const randPart = Math.random().toString(36).substring(2, 7);
      slug = `post-${datePart}-${typePart}-${randPart}`;
    }

    try {
      setIsSaving(true);

      const payload = {
        ...currentPost,
        slug,
        title: currentPost.title && currentPost.title.trim() ? currentPost.title.trim() : null,
        caption: currentPost.caption && currentPost.caption.trim() ? currentPost.caption.trim() : null,
        category: currentPost.category && currentPost.category.trim() ? currentPost.category.trim() : "Portraits & Style",
        post_type: currentPost.post_type || "image",
        primary_asset_id:
          currentPost.post_type === "carousel"
            ? (currentPost.carouselSlides?.[0]?.asset_id || currentPost.primary_asset_id || null)
            : (currentPost.primary_asset_id || null),
        related_release_id: currentPost.related_release_id || null,
        related_track_id: currentPost.related_track_id || null,
        legacy_link: currentPost.legacy_link || null,
        slides: currentPost.post_type === "carousel" ? (currentPost.carouselSlides || []) : [],
      };

      if (view === "CREATE") {
        await adminApi.createGalleryPost(payload);
      } else {
        await adminApi.updateGalleryPost(currentPost.id, payload);
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

  const getAssetObj = (assetId) => mediaAssets.find((a) => a.id === assetId);

  // Sorting
  const sortedPosts = [...posts].sort((a, b) => {
    const da = a.post_date ? new Date(a.post_date).getTime() : 0;
    const db = b.post_date ? new Date(b.post_date).getTime() : 0;
    return sortOrder === "desc" ? db - da : da - db;
  });

  // Filtered media assets for library picker
  const filteredLibraryAssets = mediaAssets.filter((a) => {
    if (!librarySearch.trim()) return true;
    const q = librarySearch.toLowerCase();
    return (
      (a.original_filename && a.original_filename.toLowerCase().includes(q)) ||
      (a.asset_type && a.asset_type.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  });

  if (isLoading && view === "LIST") {
    return <div style={{ color: "var(--muted)", padding: 24 }}>Loading gallery visual archive...</div>;
  }

  // ==========================================
  // CREATE / EDIT FORM VIEW
  // ==========================================
  if (view === "CREATE" || view === "EDIT") {
    const primaryAssetObj = getAssetObj(currentPost.primary_asset_id);
    const primaryAssetUrl = getMediaUrl(currentPost.primary_asset_id);
    const isPrimaryVideo =
      primaryAssetObj?.asset_type === "VIDEO" ||
      primaryAssetObj?.mime_type?.startsWith("video/") ||
      (typeof primaryAssetUrl === "string" && /\.(mp4|webm|mov)$/i.test(primaryAssetUrl));

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 className="studio-section-heading" style={{ margin: 0 }}>
              {view === "CREATE" ? "Create Gallery Post" : "Edit Gallery Post"}
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
              Fast Instagram-style visual posting. Titles are optional.
            </p>
          </div>
          <button
            onClick={handleCancelForm}
            className="studio-pill-btn"
            style={{ background: "transparent", color: "var(--text)" }}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>

        {error && <div className="admin-login-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* SECTION 1: GALLERY MEDIA SECTION */}
          <div
            style={{
              padding: "20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, color: "var(--gold)", margin: 0, fontWeight: 600 }}>
                📷 Gallery Media
              </h3>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Format: <strong style={{ color: "var(--text-h)" }}>{currentPost.post_type.toUpperCase()}</strong>
              </div>
            </div>

            {/* Media Type Selector */}
            <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Post Format / Type *</label>
                <select
                  name="post_type"
                  className="studio-input"
                  value={currentPost.post_type || "image"}
                  onChange={handleChange}
                  disabled={isSaving}
                  style={{ height: "44px" }}
                >
                  <option value="image">Single Image</option>
                  <option value="carousel">Carousel (Multi-slide Photos / Videos)</option>
                  <option value="video">Video</option>
                  <option value="reel">Reel / Vertical Short</option>
                </select>
              </div>

              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Post Date * (Canonical)</label>
                <input
                  type="date"
                  name="post_date"
                  className="studio-input"
                  value={currentPost.post_date || ""}
                  onChange={handleChange}
                  required
                  disabled={isSaving}
                />
                {currentPost.post_date && (
                  <span style={{ fontSize: 11, color: "var(--gold)", marginTop: 4, display: "block" }}>
                    Public date: {formatGalleryDate(currentPost.post_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Hidden native file inputs */}
            <input
              type="file"
              ref={primaryFileInputRef}
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e, "primary")}
            />
            <input
              type="file"
              ref={carouselFileInputRef}
              accept="image/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e, "carousel")}
            />

            {/* A. SINGLE MEDIA WORKFLOW (Image, Video, Reel) */}
            {currentPost.post_type !== "carousel" && (
              <div>
                {primaryAssetUrl ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 20,
                      padding: 16,
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {isPrimaryVideo ? (
                        <video
                          src={primaryAssetUrl}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          controls
                        />
                      ) : (
                        <img
                          src={primaryAssetUrl}
                          alt="Post media preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.currentTarget.src = "/og-image.png";
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ color: "var(--text-h)", fontWeight: 600, fontSize: 14 }}>
                        {primaryAssetObj?.original_filename || "Selected Media Asset"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Format: {isPrimaryVideo ? "Video" : "Image"}{primaryAssetObj?.size_bytes ? ` • ${(primaryAssetObj.size_bytes / 1024).toFixed(1)} KB` : ""}{primaryAssetObj?.mime_type ? ` • ${primaryAssetObj.mime_type}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => primaryFileInputRef.current?.click()}
                          className="studio-pill-btn"
                          disabled={isUploadingMedia || isSaving}
                          style={{ fontSize: 12 }}
                        >
                          {isUploadingMedia ? "Uploading..." : "Replace File"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLibraryTarget("primary");
                            setShowLibraryModal(true);
                          }}
                          className="studio-pill-btn"
                          style={{ background: "transparent", fontSize: 12 }}
                          disabled={isUploadingMedia || isSaving}
                        >
                          Choose from Library
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPost((prev) => ({ ...prev, primary_asset_id: "" }))}
                          className="studio-pill-btn"
                          style={{
                            background: "transparent",
                            color: "#fca5a5",
                            borderColor: "rgba(252, 165, 165, 0.3)",
                            fontSize: 12,
                          }}
                          disabled={isSaving}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: "2px dashed var(--border)",
                      borderRadius: 8,
                      padding: "32px 20px",
                      textAlign: "center",
                      background: "rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📷 / 🎬</div>
                    <div style={{ color: "var(--text-h)", fontWeight: 600, marginBottom: 4 }}>
                      Select or Upload Post Media
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 auto 16px auto", maxWidth: 400 }}>
                      Upload high-resolution photography, artwork, video clip, or vertical reel.
                    </p>
                    <div style={{ display: "inline-flex", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => primaryFileInputRef.current?.click()}
                        className="primary-button"
                        disabled={isUploadingMedia || isSaving}
                        style={{ padding: "10px 20px" }}
                      >
                        {isUploadingMedia ? "Uploading..." : "↑ Upload New Media"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLibraryTarget("primary");
                          setShowLibraryModal(true);
                        }}
                        className="studio-pill-btn"
                        disabled={isUploadingMedia || isSaving}
                        style={{ padding: "10px 18px", fontSize: 13 }}
                      >
                        Browse Media Library
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. CAROUSEL MULTI-SLIDE WORKFLOW */}
            {currentPost.post_type === "carousel" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    Carousel Slides ({currentPost.carouselSlides?.length || 0} items)
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => carouselFileInputRef.current?.click()}
                      className="studio-pill-btn"
                      disabled={isUploadingMedia || isSaving}
                      style={{ background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)", fontSize: 12 }}
                    >
                      {isUploadingMedia ? "Uploading..." : "+ Upload Slide(s)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLibraryTarget("carousel");
                        setShowLibraryModal(true);
                      }}
                      className="studio-pill-btn"
                      disabled={isUploadingMedia || isSaving}
                      style={{ fontSize: 12 }}
                    >
                      + Add from Library
                    </button>
                  </div>
                </div>

                {(!currentPost.carouselSlides || currentPost.carouselSlides.length === 0) ? (
                  <div
                    style={{
                      border: "2px dashed var(--border)",
                      borderRadius: 8,
                      padding: "28px 16px",
                      textAlign: "center",
                      background: "rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
                      No carousel slides added yet. Add multiple images or videos to build a swipeable carousel.
                    </div>
                    <div style={{ display: "inline-flex", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => carouselFileInputRef.current?.click()}
                        className="primary-button"
                        disabled={isUploadingMedia || isSaving}
                        style={{ fontSize: 13 }}
                      >
                        {isUploadingMedia ? "Uploading..." : "↑ Upload First Slide(s)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLibraryTarget("carousel");
                          setShowLibraryModal(true);
                        }}
                        className="studio-pill-btn"
                        style={{ fontSize: 13 }}
                      >
                        Select from Media Library
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {currentPost.carouselSlides.map((slide, idx) => {
                      const slideAssetObj = getAssetObj(slide.asset_id);
                      const slideUrl = getMediaUrl(slide.asset_id);
                      const isVid = slide.slide_type === "video";

                      return (
                        <div
                          key={`${slide.asset_id}-${idx}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            background: "rgba(0, 0, 0, 0.4)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span
                              style={{
                                color: "var(--gold)",
                                fontWeight: 700,
                                fontSize: 15,
                                minWidth: 24,
                                textAlign: "center",
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 4,
                                overflow: "hidden",
                                background: "#000",
                                flexShrink: 0,
                                border: "1px solid var(--border)",
                              }}
                            >
                              {isVid ? (
                                <video
                                  src={slideUrl}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                <img
                                  src={slideUrl}
                                  alt="Slide preview"
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => {
                                    e.currentTarget.src = "/og-image.png";
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <div style={{ color: "var(--text-h)", fontSize: 13, fontWeight: 500 }}>
                                {slideAssetObj?.original_filename || `${slide.slide_type === 'video' ? 'Video' : 'Image'} Slide #${idx + 1}`}
                              </div>
                              <span
                                style={{
                                  padding: "1px 6px",
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  background: isVid ? "rgba(147, 51, 234, 0.2)" : "rgba(34, 197, 94, 0.2)",
                                  color: isVid ? "#c084fc" : "#4ade80",
                                }}
                              >
                                {slide.slide_type}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => moveCarouselSlide(idx, -1)}
                              disabled={idx === 0 || isSaving}
                              className="studio-pill-btn"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              title="Move slide earlier"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCarouselSlide(idx, 1)}
                              disabled={idx === currentPost.carouselSlides.length - 1 || isSaving}
                              className="studio-pill-btn"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              title="Move slide later"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => removeCarouselSlide(idx)}
                              disabled={isSaving}
                              className="studio-pill-btn"
                              style={{
                                background: "transparent",
                                color: "#fca5a5",
                                borderColor: "rgba(252, 165, 165, 0.3)",
                                padding: "4px 8px",
                                fontSize: 11,
                              }}
                              title="Remove slide"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: DETAILS & HYBRID CATEGORY COMBOBOX */}
          <div
            style={{
              padding: "20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ fontSize: 15, color: "var(--gold)", margin: "0 0 16px 0", fontWeight: 600 }}>
              📝 Post Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Title (Optional)</label>
                <input
                  type="text"
                  name="title"
                  className="studio-input"
                  value={currentPost.title || ""}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="Post title or headline (optional)"
                />
              </div>

              {/* Hybrid Combobox for Category */}
              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Category (Select existing or type new)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    name="category"
                    list="gallery-categories-datalist"
                    className="studio-input"
                    value={currentPost.category || ""}
                    onChange={handleChange}
                    disabled={isSaving}
                    placeholder="e.g. Portraits & Style, Studio & BTS"
                  />
                  <select
                    className="studio-input"
                    style={{ width: "130px", height: "44px", flexShrink: 0 }}
                    value={currentPost.category || ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCurrentPost((prev) => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    disabled={isSaving}
                  >
                    <option value="">-- Presets --</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <datalist id="gallery-categories-datalist">
                  {categories.map((c) => (
                    <option key={c.slug} value={c.label} />
                  ))}
                </datalist>
                <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                  💡 New categories typed here are automatically saved permanently.
                </span>
              </div>
            </div>

            <div className="studio-field" style={{ textAlign: "left", marginTop: "16px" }}>
              <label>Caption / Note</label>
              <textarea
                name="caption"
                className="studio-input"
                style={{ minHeight: "80px", resize: "vertical" }}
                value={currentPost.caption || ""}
                onChange={handleChange}
                disabled={isSaving}
                placeholder="Story, caption, or behind-the-scenes context..."
              />
            </div>
          </div>

          {/* SECTION 3: PROJECT & TRACK ASSOCIATIONS & SCHEDULING */}
          <div
            style={{
              padding: "20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ fontSize: 15, color: "var(--gold)", margin: "0 0 16px 0", fontWeight: 600 }}>
              🔗 Associations & Publication
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Associated Music Project / Release (Optional)</label>
                <select
                  name="related_release_id"
                  className="studio-input"
                  value={currentPost.related_release_id || ""}
                  onChange={handleChange}
                  disabled={isSaving}
                  style={{ height: "44px" }}
                >
                  <option value="">-- None (Independent Visual) --</option>
                  {releases.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.type || "Release"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Associated Track (Optional)</label>
                <select
                  name="related_track_id"
                  className="studio-input"
                  value={currentPost.related_track_id || ""}
                  onChange={handleChange}
                  disabled={isSaving}
                  style={{ height: "44px" }}
                >
                  <option value="">-- None --</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>External Post / Instagram Link (Optional)</label>
                <input
                  type="text"
                  name="legacy_link"
                  className="studio-input"
                  value={currentPost.legacy_link || ""}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="https://instagram.com/p/..."
                />
              </div>

              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Status</label>
                <select
                  name="status"
                  className="studio-input"
                  value={currentPost.status || "DRAFT"}
                  onChange={handleChange}
                  disabled={isSaving}
                  style={{ height: "44px" }}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>

              <div className="studio-field" style={{ textAlign: "left", gridColumn: "1 / -1" }}>
                <label>Schedule Publication (Optional)</label>
                <div style={{ display: "flex", gap: "8px", maxWidth: "450px" }}>
                  <input
                    type="datetime-local"
                    name="scheduled_at"
                    className="studio-input"
                    value={currentPost.scheduled_at ? currentPost.scheduled_at.slice(0, 16) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrentPost((prev) => ({
                        ...prev,
                        scheduled_at: val ? new Date(val).toISOString() : null,
                        status: val ? "SCHEDULED" : prev.status === "SCHEDULED" ? "PUBLISHED" : prev.status,
                      }));
                    }}
                    disabled={isSaving}
                  />
                  {currentPost.scheduled_at && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPost((prev) => ({
                          ...prev,
                          scheduled_at: null,
                          status: prev.status === "SCHEDULED" ? "PUBLISHED" : prev.status,
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
          </div>

          <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button type="button" onClick={handleCancelForm} className="studio-pill-btn" disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving || isUploadingMedia}>
              {isSaving ? "Saving Post..." : "Save Gallery Post"}
            </button>
          </div>
        </form>

        {/* MODAL: MEDIA LIBRARY ASSET PICKER */}
        {showLibraryModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
            }}
            onClick={() => setShowLibraryModal(false)}
          >
            <div
              style={{
                background: "#161616",
                border: "1px solid var(--border)",
                borderRadius: 8,
                width: "100%",
                maxWidth: 800,
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--text-h)" }}>
                  Select from Media Library ({libraryTarget === "carousel" ? "Add to Carousel" : "Set Post Media"})
                </h3>
                <button
                  onClick={() => setShowLibraryModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
                <input
                  type="text"
                  className="studio-input"
                  placeholder="Search assets by filename or type..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div
                style={{
                  padding: 20,
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 12,
                  flex: 1,
                }}
              >
                {filteredLibraryAssets.map((asset) => {
                  const url = getMediaUrl(asset.id);
                  const isVid = asset.asset_type === "VIDEO" || asset.mime_type?.startsWith("video/");

                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectFromLibrary(asset)}
                      style={{
                        background: "#0d0d0d",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "transform 0.15s, border-color 0.15s",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--gold)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          paddingBottom: "100%",
                          position: "relative",
                          background: "#000",
                        }}
                      >
                        {isVid ? (
                          <video
                            src={url}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <img
                            src={url}
                            alt={asset.original_filename}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.src = "/og-image.png";
                            }}
                          />
                        )}
                        <span
                          style={{
                            position: "absolute",
                            bottom: 4,
                            right: 4,
                            padding: "1px 4px",
                            borderRadius: 2,
                            fontSize: 9,
                            fontWeight: 700,
                            background: isVid ? "rgba(147, 51, 234, 0.85)" : "rgba(34, 197, 94, 0.85)",
                            color: "#fff",
                          }}
                        >
                          {isVid ? "VID" : "IMG"}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: 6,
                          fontSize: 11,
                          color: "var(--text-h)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={asset.original_filename}
                      >
                        {asset.original_filename || "Media asset"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // LIST VIEW (Cards / Table)
  // ==========================================
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
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.4)",
                color: "#86efac",
                padding: "6px 14px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
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
          <button className="primary-button" style={{ marginTop: 16 }} onClick={handleCreateClick}>
            Create First Post
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID / CARDS VIEW */
        <div className="admin-listing-grid">
          {sortedPosts.map((post) => {
            const postSlides = slides.filter((s) => s.post_id === post.id);
            const primaryAssetId = post.primary_asset_id || (postSlides[0] ? postSlides[0].asset_id : null);
            const assetUrl = getMediaUrl(primaryAssetId);
            const formattedPostDate = post.post_date ? formatGalleryDate(post.post_date) : "";
            const displayTitle = post.title?.trim() || post.caption?.trim() || (formattedPostDate ? `Untitled Gallery Post — ${formattedPostDate}` : `Untitled ${post.post_type || "Media"} Post`);

            return (
              <div key={post.id} className="admin-item-card">
                <div>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      paddingBottom: "75%",
                      background: "#000",
                      borderRadius: "4px",
                      overflow: "hidden",
                      marginBottom: "12px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {assetUrl ? (
                      <img
                        src={assetUrl}
                        alt={displayTitle}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.currentTarget.src = "/og-image.png";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          color: "var(--muted)",
                          fontSize: "12px",
                        }}
                      >
                        No Media
                      </div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          post.status === "PUBLISHED"
                            ? "rgba(16, 185, 129, 0.9)"
                            : post.status === "SCHEDULED"
                            ? "rgba(56, 189, 248, 0.9)"
                            : "rgba(245, 158, 11, 0.9)",
                        color: "#000",
                      }}
                    >
                      {post.status || "DRAFT"}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16, margin: "0 0 4px 0", color: "var(--text-h)" }}>{displayTitle}</h3>
                  <div style={{ fontSize: 12, color: "var(--gold)", textTransform: "uppercase", fontWeight: 600 }}>
                    {post.post_type} • {formatGalleryDate(post.post_date)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    {postSlides.length > 0 ? `${postSlides.length} slide(s)` : "Single item"} • category: {post.category || "Portraits & Style"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 16,
                    borderTop: "1px solid var(--border)",
                    paddingTop: 12,
                  }}
                >
                  <button onClick={() => handleEditClick(post)} className="studio-pill-btn" style={{ fontSize: 12 }}>
                    Edit
                  </button>
                  {deleteConfirmId === post.id ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#fca5a5" }}>Delete?</span>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="studio-pill-btn"
                        style={{
                          background: "rgba(220,38,38,0.2)",
                          color: "#fca5a5",
                          borderColor: "#fca5a5",
                          fontSize: 11,
                          padding: "2px 8px",
                        }}
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
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Visual / Title</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Type / Date</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Category</th>
                <th style={{ padding: "16px", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: 12, textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((post) => {
                const postSlides = slides.filter((s) => s.post_id === post.id);
                const primaryAssetId = post.primary_asset_id || (postSlides[0] ? postSlides[0].asset_id : null);
                const assetUrl = getMediaUrl(primaryAssetId);
                const formattedPostDate = post.post_date ? formatGalleryDate(post.post_date) : "";
                const displayTitle = post.title?.trim() || post.caption?.trim() || (formattedPostDate ? `Untitled Gallery Post — ${formattedPostDate}` : `Untitled ${post.post_type || "Media"} Post`);

                return (
                  <tr key={post.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px", color: "var(--text-h)", fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 4,
                            overflow: "hidden",
                            background: "#000",
                            flexShrink: 0,
                            border: "1px solid var(--border)",
                          }}
                        >
                          {assetUrl ? (
                            <img
                              src={assetUrl}
                              alt={displayTitle}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                e.currentTarget.src = "/og-image.png";
                              }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 10 }}>
                              No Media
                            </div>
                          )}
                        </div>
                        <div>
                          <div>{displayTitle}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 2 }}>
                            /{post.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ textTransform: "capitalize", fontWeight: 500 }}>{post.post_type}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginTop: 2 }}>
                        {formatGalleryDate(post.post_date)}
                      </div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          background: "rgba(223, 194, 125, 0.1)",
                          color: "var(--gold)",
                          borderRadius: 3,
                          fontSize: 12,
                        }}
                      >
                        {post.category || "Portraits & Style"}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background:
                            post.status === "PUBLISHED"
                              ? "rgba(16, 185, 129, 0.1)"
                              : post.status === "SCHEDULED"
                              ? "rgba(56, 189, 248, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                          color:
                            post.status === "PUBLISHED"
                              ? "#34d399"
                              : post.status === "SCHEDULED"
                              ? "#38bdf8"
                              : "#fbbf24",
                        }}
                      >
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

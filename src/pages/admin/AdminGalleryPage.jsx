import { useState, useEffect, useRef } from "react";
import { adminApi } from "../../data/adminApi";
import { refreshCatalogue } from "../../data/store";
import { useDraftAutosave, DraftAutosaveBanner, DraftListResumeBanner } from "../../utils/useDraftAutosave";
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
  const [saveState, setSaveState] = useState("IDLE"); // 'IDLE' | 'SAVING' | 'SAVED'
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Media Library Modal state
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState("primary"); // 'primary' or 'carousel'
  const [librarySearch, setLibrarySearch] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [availableSocialLinks, setAvailableSocialLinks] = useState([]);

  // File input refs
  const primaryFileInputRef = useRef(null);
  const carouselFileInputRef = useRef(null);

  const {
    hasRestorableDraft,
    lastSavedAt,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useDraftAutosave({
    entityKey: currentPost?.id ? `gallery_${currentPost.id}` : "gallery_new",
    formData: currentPost,
    setFormData: setCurrentPost,
    enabled: view === "CREATE" || view === "EDIT",
  });

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let loadErr = null;
      const [postsData, slidesData, mediaData, releasesData, tracksData, categoriesData, socialsData] = await Promise.all([
        adminApi.getGallery().catch((e) => { loadErr = e; return []; }),
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
        fetch("/api/social-links").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      if (loadErr) {
        setError(loadErr.message || "Failed to load gallery posts from server.");
      }
      setPosts(postsData);
      setSlides(slidesData);
      setMediaAssets(mediaData);
      setReleases(releasesData);
      setTracks(tracksData);
      const uniqueCats = [];
      const seenLabels = new Set();
      for (const cat of Array.isArray(categoriesData) ? categoriesData : []) {
        if (!cat || !cat.label) continue;
        const key = cat.label.trim().toLowerCase();
        if (!seenLabels.has(key)) {
          seenLabels.add(key);
          uniqueCats.push({ ...cat, label: cat.label.trim() });
        }
      }
      setCategories(uniqueCats);
      if (socialsData) {
        const allLinks = [
          ...(Array.isArray(socialsData.artist) ? socialsData.artist : []),
          ...(Array.isArray(socialsData.ecosystem) ? socialsData.ecosystem : []),
        ];
        setAvailableSocialLinks(allLinks);
      }
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
      location: "",
      category: categories[0]?.label || "Portraits & Style",
      post_type: "image",
      primary_asset_id: "",
      related_release_id: "",
      related_track_id: "",
      legacy_link: "",
      external_social_url: "",
      external_social_platform: "",
      post_date: today,
      status: "DRAFT",
      carouselSlides: [],
      assignedSocials: [],
      is_hero: true,
      notify_feed: true,
      notification_text: "",
    });
    setView("CREATE");
    setError(null);
  };

  const inferFormatFromItems = (items, fallbackPrimaryId) => {
    if (Array.isArray(items) && items.length > 1) return "carousel";
    if (Array.isArray(items) && items.length === 1) {
      return items[0].slide_type === "video" ? "video" : "image";
    }
    if (fallbackPrimaryId) {
      const a = mediaAssets.find((m) => m && m.id === fallbackPrimaryId);
      if (a && (a.asset_type === "VIDEO" || a.mime_type?.startsWith("video/"))) {
        return "video";
      }
    }
    return "image";
  };

  const handleEditClick = (post) => {
    const postSlides = slides
      .filter((s) => s.post_id === post.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => {
        const assetObj = mediaAssets.find((a) => a && a.id === s.asset_id);
        const isHero = Boolean(
          s.is_hero ||
          s.isHero ||
          (assetObj?.alt_text && assetObj.alt_text.includes("[HERO]")) ||
          assetObj?.is_hero
        );
        return {
          asset_id: s.asset_id,
          slide_type: s.slide_type || "image",
          sort_order: s.sort_order,
          is_hero: isHero,
        };
      });

    // If single-asset post had no rows in gallery_slides yet, seed 1 item so adding a 2nd item seamlessly creates a carousel
    let initialSlides = postSlides;
    if (initialSlides.length === 0 && post.primary_asset_id) {
      const primaryAsset = mediaAssets.find((a) => a && a.id === post.primary_asset_id);
      const isVid =
        post.post_type === "video" ||
        primaryAsset?.asset_type === "VIDEO" ||
        primaryAsset?.mime_type?.startsWith("video/");
      const isHero = Boolean(
        post.is_hero ||
        post.isHero ||
        (primaryAsset?.alt_text && primaryAsset.alt_text.includes("[HERO]")) ||
        primaryAsset?.is_hero
      );
      initialSlides = [
        {
          asset_id: post.primary_asset_id,
          slide_type: isVid ? "video" : "image",
          sort_order: 0,
          is_hero: isHero,
        },
      ];
    }

    setCurrentPost({
      ...post,
      title: post.title || "",
      caption: post.caption || "",
      location: post.location || post.tags?.location || "",
      category: post.category || "Portraits & Style",
      post_type: inferFormatFromItems(initialSlides, post.primary_asset_id),
      external_social_url: post.external_social_url || post.legacy_link || "",
      external_social_platform: post.external_social_platform || "",
      post_date: post.post_date ? post.post_date.split("T")[0] : "",
      carouselSlides: initialSlides,
      assignedSocials: post.tags?.assignedSocials || post.assignedSocials || [],
      is_hero: Boolean(post.is_hero || post.isHero || post.tags?.is_hero || post.tags?.isHero),
      notify_feed: post.tags?.notify_feed !== false,
      notification_text: post.tags?.notification_text || post.notification_text || "",
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

  // Unified file upload handler — automatically determines Single Image, Video, or Carousel (Req #9)
  const handleFileUpload = async (e, target = "primary") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    setError(null);

    try {
      const uploadedSlides = [];
      const addedAssets = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith("video/");
        const res = await adminApi.uploadMediaAsset(file, isVideo ? "VIDEO" : "IMAGE");
        const newAsset = res?.asset || res;
        if (!newAsset || !newAsset.id) continue;
        addedAssets.push(newAsset);

        const isVid = isVideo || newAsset.asset_type === "VIDEO" || newAsset.mime_type?.startsWith("video/");
        uploadedSlides.push({
          asset_id: newAsset.id,
          slide_type: isVid ? "video" : "image",
          sort_order: i,
          is_hero: true,
        });
      }

      if (addedAssets.length === 0) {
        throw new Error("Upload succeeded but invalid asset record returned.");
      }

      const newIds = new Set(addedAssets.map((a) => a.id));
      setMediaAssets((prev) => [...addedAssets, ...prev.filter((a) => a && !newIds.has(a.id))]);

      setCurrentPost((prev) => {
        const existingSlides = Array.isArray(prev.carouselSlides) ? prev.carouselSlides : [];
        let combined;
        if (target === "primary" || target === "replace") {
          // Setting or replacing the primary selection directly
          combined = uploadedSlides.map((s, idx) => ({ ...s, sort_order: idx }));
        } else {
          // Appending to carousel
          combined = [...existingSlides, ...uploadedSlides].map((s, idx) => ({ ...s, sort_order: idx }));
        }
        const nextType =
          combined.length > 1
            ? "carousel"
            : combined[0]?.slide_type === "video"
            ? "video"
            : "image";
        return {
          ...prev,
          post_type: nextType,
          carouselSlides: combined,
          primary_asset_id: combined[0]?.asset_id || "",
        };
      });
    } catch (err) {
      console.error("Gallery upload error:", err);
      setError(err.message || "Failed to upload file.");
    } finally {
      setIsUploadingMedia(false);
      if (e.target) e.target.value = "";
    }
  };

  // Library modal select handler — automatically determines Single Image, Video, or Carousel (Req #9)
  const handleSelectFromLibrary = (asset) => {
    const isVid = asset.asset_type === "VIDEO" || asset.mime_type?.startsWith("video/");
    const isHero = asset.is_hero !== undefined ? Boolean(asset.is_hero) : true;
    setCurrentPost((prev) => {
      const existingSlides = Array.isArray(prev.carouselSlides) ? prev.carouselSlides : [];
      const newItem = { asset_id: asset.id, slide_type: isVid ? "video" : "image", sort_order: 0, is_hero: isHero };
      let combined;
      if (libraryTarget === "primary" || libraryTarget === "replace") {
        combined = [newItem];
      } else {
        combined = [...existingSlides, newItem].map((s, idx) => ({ ...s, sort_order: idx }));
      }
      const nextType =
        combined.length > 1
          ? "carousel"
          : combined[0]?.slide_type === "video"
          ? "video"
          : "image";
      return {
        ...prev,
        post_type: nextType,
        carouselSlides: combined,
        primary_asset_id: combined[0]?.asset_id || "",
      };
    });
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
    const nextType =
      list.length > 1
        ? "carousel"
        : list[0]?.slide_type === "video"
        ? "video"
        : "image";
    setCurrentPost((prev) => ({
      ...prev,
      carouselSlides: list,
      primary_asset_id: list[0]?.asset_id || "",
      post_type: nextType,
    }));
  };

  const handleSave = async (e, asDraft = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (!currentPost.post_date) {
      setError("Post Date is required.");
      return;
    }

    const activeSlides = Array.isArray(currentPost.carouselSlides) ? currentPost.carouselSlides : [];
    const inferredType = inferFormatFromItems(activeSlides, currentPost.primary_asset_id);

    // Auto-generate stable slug if not existing
    const slugify = (text) => (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    let slug = currentPost.slug ? currentPost.slug.trim() : slugify(currentPost.title);
    if (!slug) {
      const datePart = currentPost.post_date ? currentPost.post_date.split("T")[0] : new Date().toISOString().slice(0, 10);
      const typePart = inferredType.toLowerCase();
      const randPart = Math.random().toString(36).substring(2, 7);
      slug = `post-${datePart}-${typePart}-${randPart}`;
    }

    // Automatic status determination (Req #10)
    const schedDate = currentPost.scheduled_at ? new Date(currentPost.scheduled_at) : null;
    const postDateObj = currentPost.post_date ? new Date(currentPost.post_date) : null;
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const isFuture =
      (schedDate && !isNaN(schedDate.getTime()) && schedDate > now) ||
      (postDateObj && !isNaN(postDateObj.getTime()) && postDateObj > todayUtc && postDateObj > now);
    const targetStatus = asDraft ? "DRAFT" : (isFuture ? "SCHEDULED" : "PUBLISHED");

    try {
      setIsSaving(true);
      setSaveState("SAVING");

      const payload = {
        ...currentPost,
        slug,
        status: targetStatus,
        is_draft: asDraft,
        title: currentPost.title && currentPost.title.trim() ? currentPost.title.trim() : null,
        caption: currentPost.caption && currentPost.caption.trim() ? currentPost.caption.trim() : null,
        category: currentPost.category && currentPost.category.trim() ? currentPost.category.trim() : "Portraits & Style",
        post_type: inferredType,
        primary_asset_id: activeSlides[0]?.asset_id || currentPost.primary_asset_id || null,
        related_release_id: currentPost.related_release_id || null,
        related_track_id: currentPost.related_track_id || null,
        legacy_link: currentPost.external_social_url || currentPost.legacy_link || null,
        external_social_url: currentPost.external_social_url || currentPost.legacy_link || null,
        external_social_platform: currentPost.external_social_platform || null,
        location: currentPost.location && currentPost.location.trim() ? currentPost.location.trim() : null,
        is_hero: activeSlides.length > 0
          ? activeSlides.some((s) => Boolean(s.is_hero))
          : Boolean(currentPost.is_hero),
        tags: {
          ...(currentPost.tags || {}),
          assignedSocials: currentPost.assignedSocials || [],
          location: currentPost.location && currentPost.location.trim() ? currentPost.location.trim() : null,
          is_hero: activeSlides.length > 0
            ? activeSlides.some((s) => Boolean(s.is_hero))
            : Boolean(currentPost.is_hero),
          notify_feed: Boolean(currentPost.notify_feed),
          notification_text: currentPost.notification_text || "",
          slide_hero_flags: activeSlides.map((s) => Boolean(s.is_hero)),
        },
        slides: activeSlides.map((s, idx) => ({
          ...s,
          sort_order: idx,
          is_hero: Boolean(s.is_hero),
        })),
      };

      // Sync media asset hero flags so API/slides immediately reflect individual slide hero choices
      for (const s of activeSlides) {
        if (s.asset_id) {
          adminApi.updateMediaAsset(s.asset_id, { is_hero: Boolean(s.is_hero) }).catch(() => {});
        }
      }
      if (currentPost.primary_asset_id) {
        adminApi.updateMediaAsset(currentPost.primary_asset_id, { is_hero: Boolean(payload.is_hero) }).catch(() => {});
      }

      if (view === "CREATE") {
        const created = await adminApi.createGalleryPost(payload);
        clearDraft({ ...created, carouselSlides: activeSlides });
        await fetchData();
        refreshCatalogue();
        setCurrentPost({
          ...created,
          carouselSlides: activeSlides,
        });
        setView("EDIT");
      } else {
        const updated = await adminApi.updateGalleryPost(currentPost.id, payload);
        clearDraft({ ...updated, carouselSlides: activeSlides });
        await fetchData();
        refreshCatalogue();
        setCurrentPost({
          ...updated,
          carouselSlides: activeSlides,
        });
      }

      setSaveSuccess(true);
      setSaveState("SAVED");
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.message || "Failed to save gallery post.");
      setSaveState("IDLE");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminApi.deleteGalleryPost(id);
      await fetchData();
      refreshCatalogue();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getAssetObj = (assetId) => mediaAssets.find((a) => a && a.id === assetId);

  // Sorting (Stage 31 Part 15: deterministic secondary ordering by created_at DESC)
  const sortedPosts = [...posts].sort((a, b) => {
    const da = a.post_date ? new Date(a.post_date).getTime() : 0;
    const db = b.post_date ? new Date(b.post_date).getTime() : 0;
    if (da !== db) {
      return sortOrder === "desc" ? db - da : da - db;
    }
    const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
    const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return sortOrder === "desc" ? cb - ca : ca - cb;
  });

  // Filtered media assets for library picker
  const filteredLibraryAssets = mediaAssets.filter((a) => {
    if (!a) return false;
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

        <DraftAutosaveBanner
          hasRestorableDraft={hasRestorableDraft}
          lastSavedAt={lastSavedAt}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />

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
                1. Gallery Media
              </h3>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Format: <strong style={{ color: "var(--text-h)" }}>{currentPost.post_type.toUpperCase()}</strong>
              </div>
            </div>

            {/* Automatic Media Format Indicator & Post Date */}
            <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Detected Post Format (Automatic)</label>
                <div
                  className="studio-input"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(255,255,255,0.03)",
                    cursor: "default",
                    minHeight: "42px",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--gold)", letterSpacing: "0.06em", fontSize: 12 }}>
                    {currentPost.post_type === "carousel"
                      ? `CAROUSEL (${currentPost.carouselSlides?.length || 0} ITEMS)`
                      : (currentPost.post_type === "video" || isPrimaryVideo)
                      ? "VIDEO"
                      : "SINGLE IMAGE"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    Inferred from uploaded media
                  </span>
                </div>
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
              multiple
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

            {/* A. SINGLE MEDIA WORKFLOW (Image, Video) — Auto-converts to Carousel when 2+ items are added */}
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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => carouselFileInputRef.current?.click()}
                          className="studio-pill-btn"
                          disabled={isUploadingMedia || isSaving}
                          style={{ fontSize: 12, background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)" }}
                        >
                          {isUploadingMedia ? "Uploading..." : "+ Add More Media (Carousel)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLibraryTarget("carousel");
                            setShowLibraryModal(true);
                          }}
                          className="studio-pill-btn"
                          style={{ background: "transparent", fontSize: 12 }}
                          disabled={isUploadingMedia || isSaving}
                        >
                          + Add Slide from Library
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
                          Replace from Library
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPost((prev) => ({ ...prev, primary_asset_id: "", post_type: "image" }))}
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
                    <div style={{ color: "var(--text-h)", fontWeight: 600, marginBottom: 4 }}>
                      Select or Upload Post Media
                    </div>
                    <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 auto 16px auto", maxWidth: 440 }}>
                      Upload 1 photo (Single Image), 1 video (Video), or multiple photos/videos (Carousel). Format is detected automatically.
                    </p>
                    <div style={{ display: "inline-flex", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => primaryFileInputRef.current?.click()}
                        className="primary-button"
                        disabled={isUploadingMedia || isSaving}
                        style={{ padding: "10px 20px" }}
                      >
                        {isUploadingMedia ? "Uploading..." : "↑ Upload Media (1 or Multiple)"}
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

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <label
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: 4,
                                background: slide.is_hero ? "rgba(223, 194, 125, 0.16)" : "rgba(255, 255, 255, 0.04)",
                                border: slide.is_hero ? "1px solid var(--gold)" : "1px solid var(--border)",
                                fontSize: 11,
                                color: slide.is_hero ? "var(--gold)" : "var(--muted)",
                                fontWeight: 600,
                              }}
                              title="When enabled, this specific media slide can appear in the homepage hero slideshow"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(slide.is_hero)}
                                onChange={(e) => {
                                  const updated = [...currentPost.carouselSlides];
                                  updated[idx] = { ...updated[idx], is_hero: e.target.checked };
                                  setCurrentPost((prev) => ({ ...prev, carouselSlides: updated }));
                                }}
                                style={{ width: 14, height: 14, accentColor: "var(--gold)", cursor: "pointer" }}
                              />
                              <span>{slide.is_hero ? "★ Hero Slide" : "Hero"}</span>
                            </label>
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
              2. Post Details
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
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

              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Location (Optional)</label>
                <input
                  type="text"
                  name="location"
                  className="studio-input"
                  value={currentPost.location || ""}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="e.g. Lagos, Nigeria or Studio A"
                />
              </div>
            </div>

            {/* Category Selection / Custom Input (Stage 37 — Req #4) */}
            <div className="studio-field" style={{ textAlign: "left", marginTop: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>
                Category
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Choose Existing Category
                  </span>
                  <select
                    className="studio-input"
                    style={{ width: "100%", height: "44px" }}
                    value={categories.some((c) => c.label === currentPost.category || c.slug === currentPost.category) ? currentPost.category : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCurrentPost((prev) => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    disabled={isSaving}
                  >
                    <option value="">-- Select from existing categories --</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Or Type Custom / New Category
                  </span>
                  <input
                    type="text"
                    name="category"
                    list="gallery-categories-datalist"
                    className="studio-input"
                    style={{ width: "100%", height: "44px" }}
                    value={currentPost.category || ""}
                    onChange={handleChange}
                    disabled={isSaving}
                    placeholder="e.g. Portraits & Style, Studio & BTS"
                  />
                </div>
              </div>
              <datalist id="gallery-categories-datalist">
                {categories.map((c) => (
                  <option key={c.slug} value={c.label} />
                ))}
              </datalist>
              <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px", display: "block" }}>
                Select an existing category or enter a custom name to automatically create and assign it.
              </span>
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

          {/* SECTION 3: PROJECT & TRACK ASSOCIATIONS, EXTERNAL SOCIAL EMBED & SCHEDULING */}
          <div
            style={{
              padding: "20px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ fontSize: 15, color: "var(--gold)", margin: "0 0 16px 0", fontWeight: 600 }}>
              3. Associations, External Social Embed & Publication
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
                <label>External Social Post URL (Instagram, X, Snapchat — Optional)</label>
                <input
                  type="url"
                  name="external_social_url"
                  className="studio-input"
                  value={currentPost.external_social_url ?? currentPost.legacy_link ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentPost((prev) => ({
                      ...prev,
                      external_social_url: val,
                      legacy_link: val,
                    }));
                  }}
                  disabled={isSaving}
                  placeholder="https://www.instagram.com/p/... or https://x.com/..."
                />
                <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                  Renders an embedded post or interactive social card inside the public gallery modal.
                </span>
              </div>

              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>External Social Platform</label>
                <select
                  name="external_social_platform"
                  className="studio-input"
                  value={currentPost.external_social_platform || ""}
                  onChange={handleChange}
                  disabled={isSaving}
                  style={{ height: "44px" }}
                >
                  <option value="">Auto-Detect from URL</option>
                  <option value="Instagram">Instagram</option>
                  <option value="X">X (Twitter)</option>
                  <option value="Snapchat">Snapchat</option>
                </select>
              </div>

              {/* Req #22: Cross-Post Link Assignment */}
              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Assigned Cross-Post Ecosystem Links (Optional)</label>
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 8px 0" }}>
                  Select specific social/ecosystem links to feature on this post in the public modal. If none are selected, default links apply.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(availableSocialLinks.length > 0
                    ? availableSocialLinks
                    : [
                        { name: "Instagram", platform: "Instagram", url: "https://www.instagram.com/silachomka/?__pwa=1" },
                        { name: "X", platform: "X", url: "https://x.com/silachomka" },
                        { name: "Threads", platform: "Threads", url: "https://www.threads.net/@silachomka" },
                        { name: "TikTok", platform: "TikTok", url: "https://www.tiktok.com/@silachomka" },
                        { name: "YouTube", platform: "YouTube", url: "https://www.youtube.com/@silachomka" },
                      ]
                  ).map((linkItem) => {
                    const identifier = linkItem.url || linkItem.platform || linkItem.name;
                    const assignedList = Array.isArray(currentPost.assignedSocials) ? currentPost.assignedSocials : [];
                    const isAssigned = assignedList.includes(identifier) || assignedList.includes(linkItem.platform);

                    return (
                      <button
                        key={identifier}
                        type="button"
                        onClick={() => {
                          setCurrentPost((prev) => {
                            const cur = Array.isArray(prev.assignedSocials) ? [...prev.assignedSocials] : [];
                            const next = isAssigned
                              ? cur.filter((x) => x !== identifier && x !== linkItem.platform)
                              : [...cur, identifier];
                            return { ...prev, assignedSocials: next };
                          });
                        }}
                        className="studio-pill-btn"
                        style={{
                          fontSize: 12,
                          background: isAssigned ? "rgba(223, 194, 125, 0.2)" : "rgba(0,0,0,0.3)",
                          color: isAssigned ? "var(--gold)" : "var(--muted)",
                          borderColor: isAssigned ? "var(--gold)" : "var(--border)",
                          fontWeight: isAssigned ? 700 : 500,
                        }}
                      >
                        {isAssigned ? "✓ " : "+ "}{linkItem.name || linkItem.platform}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="studio-field" style={{ textAlign: "left" }}>
                <label>Lifecycle Status (Automatic)</label>
                <div
                  className="studio-input"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(255,255,255,0.03)",
                    cursor: "default",
                    minHeight: "42px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        (currentPost.scheduled_at && new Date(currentPost.scheduled_at).getTime() > Date.now()) ||
                        (currentPost.post_date && new Date(currentPost.post_date).getTime() > Date.now())
                          ? "#93c5fd"
                          : currentPost.id && currentPost.status !== "DRAFT"
                          ? "#86efac"
                          : "var(--gold)",
                      letterSpacing: "0.06em",
                      fontSize: 12,
                    }}
                  >
                    {(currentPost.scheduled_at && new Date(currentPost.scheduled_at).getTime() > Date.now()) ||
                    (currentPost.post_date && new Date(currentPost.post_date).getTime() > Date.now())
                      ? "SCHEDULED"
                      : currentPost.id && currentPost.status !== "DRAFT"
                      ? "PUBLISHED"
                      : "DRAFT (UNTIL SAVED)"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    Auto-set on Save
                  </span>
                </div>
              </div>

              <div className="studio-field" style={{ textAlign: "left" }}>
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
                    Scheduled for {new Date(currentPost.scheduled_at).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Instagram-Style Notification Feed & Broadcast Alert */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 8,
                  background: "rgba(223, 194, 125, 0.05)",
                  border: "1px solid rgba(223, 194, 125, 0.3)",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🔔</span>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Notification Feed & Broadcast Alert
                      </h4>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
                        Push notification alert sent to subscriber feed when this post goes live (Instagram style)
                      </p>
                    </div>
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: currentPost.notify_feed !== false ? "var(--gold)" : "var(--muted)" }}>
                    <input
                      type="checkbox"
                      name="notify_feed"
                      checked={currentPost.notify_feed !== false}
                      onChange={(e) => setCurrentPost((prev) => ({ ...prev, notify_feed: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: "var(--gold)", cursor: "pointer" }}
                    />
                    <span>{currentPost.notify_feed !== false ? "Notify Feed Active" : "Disabled"}</span>
                  </label>
                </div>

                {currentPost.notify_feed !== false && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="studio-field">
                      <label style={{ fontSize: 11, color: "var(--text-h)", fontWeight: 600 }}>
                        Custom Alert Message (Optional — defaults to post caption/title)
                      </label>
                      <input
                        type="text"
                        name="notification_text"
                        className="studio-input"
                        placeholder={`e.g. 🚨 New visuals just dropped: ${currentPost.title || "Check out the new archive post"}...`}
                        value={currentPost.notification_text || ""}
                        onChange={handleChange}
                        maxLength={140}
                        style={{ fontSize: 13 }}
                      />
                      <span style={{ fontSize: 10, color: "var(--muted)", textAlign: "right", display: "block", marginTop: 2 }}>
                        {(currentPost.notification_text || "").length}/140 characters
                      </span>
                    </div>

                    {/* Live Instagram-style notification card preview */}
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "rgba(10, 10, 15, 0.85)",
                        border: "1px solid rgba(223, 194, 125, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        maxWidth: 420,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "#000",
                          border: "1px solid var(--gold)",
                          overflow: "hidden",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img src="/silachomka.com-logo.png" alt="silachomka" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                          <strong style={{ color: "var(--text-h)" }}>silachomka</strong>
                          <span style={{ color: "var(--muted)", fontSize: 10 }}>• just now</span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {currentPost.notification_text || currentPost.title || currentPost.caption || "Shared a new visual archive post"}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", border: "1px solid rgba(223, 194, 125, 0.3)", borderRadius: 4, padding: "2px 6px" }}>
                        View
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Single-Media Post Homepage Hero Eligibility Checkbox */}
              {(!currentPost.carouselSlides || currentPost.carouselSlides.length <= 1) && (
                <div className="studio-field" style={{ textAlign: "left", marginTop: 14 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      name="is_hero"
                      checked={Boolean(currentPost.is_hero)}
                      onChange={handleChange}
                      disabled={isSaving}
                      style={{ width: 18, height: 18, accentColor: "var(--gold)", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      Show in Homepage Hero
                    </span>
                  </label>
                  <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                    When enabled, this single-media post appears in the homepage hero slideshow. (For carousels, configure each slide individually in the list above).
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={handleCancelForm} className="studio-pill-btn" disabled={isSaving}>
              Back to Gallery
            </button>
            <button
              type="button"
              className="studio-pill-btn"
              onClick={(e) => handleSave(e, true)}
              disabled={isSaving || isUploadingMedia}
              style={{ background: "rgba(223, 194, 125, 0.08)", borderColor: "rgba(223, 194, 125, 0.4)", color: "var(--gold)" }}
            >
              Save as Draft
            </button>
            <button type="submit" className="primary-button" disabled={isSaving || isUploadingMedia}>
              {saveState === "SAVING" ? "Saving…" : saveState === "SAVED" ? "Saved" : "Save Gallery Post"}
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 14,
                  flex: 1,
                  minHeight: 0,
                  alignContent: "start",
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
                        background: "#0d0d12",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "all 0.16s ease",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 180,
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--gold)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.6)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "1/1",
                          position: "relative",
                          background: "#000",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {isVid ? (
                          <video
                            src={url}
                            muted
                            playsInline
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <img
                            src={url}
                            alt={asset.original_filename}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            onError={(e) => {
                              e.currentTarget.src = "/og-image.png";
                            }}
                          />
                        )}
                        <span
                          style={{
                            position: "absolute",
                            bottom: 6,
                            right: 6,
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontSize: 9,
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            background: isVid ? "rgba(147, 51, 234, 0.9)" : "rgba(34, 197, 94, 0.9)",
                            color: "#fff",
                          }}
                        >
                          {isVid ? "VID" : "IMG"}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: "8px 10px",
                          fontSize: 11,
                          color: "var(--text-h)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          overflow: "hidden",
                        }}
                        title={asset.original_filename || asset.r2_key}
                      >
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                          {asset.original_filename || asset.r2_key}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>
                          {asset.size_bytes ? `${(asset.size_bytes / 1024).toFixed(1)} KB` : "—"}
                        </span>
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

      <DraftListResumeBanner
        entityKey="gallery_new"
        entityLabel="Gallery Post"
        onResume={(draftData) => {
          setCurrentPost(draftData);
          setView("CREATE");
        }}
      />

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
            const primaryAssetObj = getAssetObj(primaryAssetId);
            const assetUrl = getMediaUrl(primaryAssetId);
            const formattedPostDate = post.post_date ? formatGalleryDate(post.post_date) : "";
            const displayTitle = post.title?.trim() || post.caption?.trim() || (formattedPostDate ? `Untitled Gallery Post — ${formattedPostDate}` : `Untitled ${post.post_type || "Media"} Post`);
            const isPostVideo =
              post.post_type === "video" ||
              post.type === "video" ||
              primaryAssetObj?.asset_type === "VIDEO" ||
              (primaryAssetObj?.mime_type && primaryAssetObj.mime_type.startsWith("video/")) ||
              postSlides[0]?.slide_type === "video" ||
              (typeof assetUrl === "string" && (assetUrl.startsWith("data:video") || /\.(mp4|webm|mov)(\?.*)?$/i.test(assetUrl)));

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
                      isPostVideo ? (
                        <video
                          src={`${assetUrl}#t=0.5`}
                          preload="metadata"
                          muted
                          playsInline
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <img
                          src={assetUrl}
                          alt={displayTitle}
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.currentTarget.src = "/og-image.png";
                          }}
                        />
                      )
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
                const primaryAssetObj = getAssetObj(primaryAssetId);
                const assetUrl = getMediaUrl(primaryAssetId);
                const formattedPostDate = post.post_date ? formatGalleryDate(post.post_date) : "";
                const displayTitle = post.title?.trim() || post.caption?.trim() || (formattedPostDate ? `Untitled Gallery Post — ${formattedPostDate}` : `Untitled ${post.post_type || "Media"} Post`);
                const isPostVideo =
                  post.post_type === "video" ||
                  post.type === "video" ||
                  primaryAssetObj?.asset_type === "VIDEO" ||
                  (primaryAssetObj?.mime_type && primaryAssetObj.mime_type.startsWith("video/")) ||
                  postSlides[0]?.slide_type === "video" ||
                  (typeof assetUrl === "string" && (assetUrl.startsWith("data:video") || /\.(mp4|webm|mov)(\?.*)?$/i.test(assetUrl)));

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
                            isPostVideo ? (
                              <video
                                src={`${assetUrl}#t=0.5`}
                                preload="metadata"
                                muted
                                playsInline
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <img
                                src={assetUrl}
                                alt={displayTitle}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  e.currentTarget.src = "/og-image.png";
                                }}
                              />
                            )
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

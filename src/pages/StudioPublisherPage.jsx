// src/pages/StudioPublisherPage.jsx

import { useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChomkaStore } from "../data/store";

const CREATOR_PIN = "chomka2026";
const STORAGE_KEY = "silachomka_creator_auth";
const MAX_CAROUSEL_ITEMS = 20;

export default function StudioPublisherPage() {
  const navigate = useNavigate();
  const {
    releases,
    beats,
    gallery,
    videos,
    saveRelease,
    deleteRelease,
    saveBeat,
    deleteBeat,
    saveGalleryPost,
    deleteGalleryPost,
    saveVideo,
    deleteVideo,
  } = useChomkaStore();

  /* Passcode authentication state */
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === CREATOR_PIN) {
      setIsAuthenticated(true);
      setPinError(false);
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // Ignore localStorage error
      }
    } else {
      setPinError(true);
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setPinInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage error
    }
  };

  /* Active mode tab: "gallery" | "release" | "beat" | "video" | "manage" */
  const [activeTab, setActiveTab] = useState("gallery");
  const [publishSuccess, setPublishSuccess] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  /* Dates */
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayDisplay = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }, []);

  const slugify = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  /* =========================================================
     1. GALLERY POST FORM STATE (UP TO 20 PHOTOS / VIDEOS CAROUSEL)
     ========================================================= */
  const [galleryTitle, setGalleryTitle] = useState("");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [galleryCategory, setGalleryCategory] = useState("portraits");
  const [galleryMediaItems, setGalleryMediaItems] = useState([
    { id: "init-1", type: "image", src: "/covers/noisemaker.png" },
  ]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [manualMediaUrl, setManualMediaUrl] = useState("");
  const [galleryLink, setGalleryLink] = useState("");
  const [galleryTags, setGalleryTags] = useState("#silachomka #chomkaMUSIC");
  const [galleryDate, setGalleryDate] = useState(todayStr);
  const [galleryDisplayDate, setGalleryDisplayDate] = useState(todayDisplay);
  const fileInputRef = useRef(null);

  /* Drag and drop reordering states */
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleReorder = (fromIndex, toIndex) => {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;
    setGalleryMediaItems((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    setActiveMediaIndex(toIndex);
  };

  /* Continuous Media File Upload (Up to 20 items) */
  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_CAROUSEL_ITEMS - galleryMediaItems.length;
    if (remainingSlots <= 0) {
      alert(`Maximum of ${MAX_CAROUSEL_ITEMS} media items reached.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (!result) return;

        const isVid = file.type.startsWith("video/");
        setGalleryMediaItems((prev) => {
          if (prev.length >= MAX_CAROUSEL_ITEMS) return prev;
          return [
            ...prev,
            {
              id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              type: isVid ? "video" : "image",
              src: result,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* Add Manual URL to Media Items */
  const handleAddManualUrl = () => {
    if (!manualMediaUrl.trim()) return;
    if (galleryMediaItems.length >= MAX_CAROUSEL_ITEMS) {
      alert(`Maximum of ${MAX_CAROUSEL_ITEMS} media items reached.`);
      return;
    }

    const url = manualMediaUrl.trim();
    const isVid = url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");

    setGalleryMediaItems((prev) => [
      ...prev,
      {
        id: `media-${Date.now()}`,
        type: isVid ? "video" : "image",
        src: url,
      },
    ]);
    setManualMediaUrl("");
  };

  const handleRemoveMediaItem = (index) => {
    setGalleryMediaItems((prev) => prev.filter((_, i) => i !== index));
    setActiveMediaIndex((prev) => {
      if (prev >= index && prev > 0) return prev - 1;
      return 0;
    });
  };

  /* =========================================================
     2. MUSIC RELEASE FORM STATE
     ========================================================= */
  const [releaseTitle, setReleaseTitle] = useState("");
  const [releaseSources, setReleaseSources] = useState(["chomkaMUSIC™"]);
  const [newSourceInput, setNewSourceInput] = useState("");
  const [releaseEdition, setReleaseEdition] = useState("1");
  const [releaseDate, setReleaseDate] = useState(todayStr);
  const [releaseDisplayDate, setReleaseDisplayDate] = useState(todayDisplay);
  const [releaseCover, setReleaseCover] = useState("/covers/noisemaker.png");
  const [releaseDesc, setReleaseDesc] = useState("");
  const [releaseSpotify, setReleaseSpotify] = useState("");
  const [releaseApple, setReleaseApple] = useState("");
  const [releaseYoutube, setReleaseYoutube] = useState("");
  const [releaseAudiomack, setReleaseAudiomack] = useState("");
  const [releaseBoomplay, setReleaseBoomplay] = useState("");
  const [releaseDeezer, setReleaseDeezer] = useState("");
  const coverInputRef = useRef(null);

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) setReleaseCover(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  /* Custom Platforms List */
  const [customPlatforms, setCustomPlatforms] = useState([]);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformUrl, setNewPlatformUrl] = useState("");

  const handleAddCustomPlatform = () => {
    if (!newPlatformName.trim() || !newPlatformUrl.trim()) return;
    setCustomPlatforms((prev) => [
      ...prev,
      { name: newPlatformName.trim(), url: newPlatformUrl.trim() },
    ]);
    setNewPlatformName("");
    setNewPlatformUrl("");
  };

  const handleRemoveCustomPlatform = (index) => {
    setCustomPlatforms((prev) => prev.filter((_, i) => i !== index));
  };

  /* Dynamic Tracklist */
  const [tracks, setTracks] = useState([
    {
      title: "Track 1",
      featuring: [],
      newFeatInput: "",
      producers: ["silachomka"],
      newProducerInput: "",
      platforms: {
        spotify: "",
        appleMusic: "",
        youtubeMusic: "",
        audiomack: "",
        boomplay: "",
        deezer: "",
      },
    },
  ]);

  const handleAddSource = () => {
    const src = newSourceInput.trim();
    if (!src) return;
    setReleaseSources((prev) => [...prev, src]);
    setNewSourceInput("");
  };

  const handleRemoveSource = (index) => {
    setReleaseSources((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTrack = () => {
    setTracks((prev) => [
      ...prev,
      {
        title: `Track ${prev.length + 1}`,
        featuring: [],
        newFeatInput: "",
        producers: ["silachomka"],
        newProducerInput: "",
        platforms: {
          spotify: "",
          appleMusic: "",
          youtubeMusic: "",
          audiomack: "",
          boomplay: "",
          deezer: "",
        },
      },
    ]);
  };

  const handleRemoveTrack = (index) => {
    setTracks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTrackFieldChange = (index, field, value) => {
    setTracks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const handleTrackPlatformChange = (trackIndex, platform, value) => {
    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex
          ? { ...t, platforms: { ...t.platforms, [platform]: value } }
          : t
      )
    );
  };

  const handleAddFeature = (trackIndex) => {
    const track = tracks[trackIndex];
    const feat = track.newFeatInput.trim();
    if (!feat) return;

    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex
          ? {
              ...t,
              featuring: [...t.featuring, feat],
              newFeatInput: "",
            }
          : t
      )
    );
  };

  const handleRemoveFeature = (trackIndex, featIndex) => {
    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex
          ? {
              ...t,
              featuring: t.featuring.filter((_, fIdx) => fIdx !== featIndex),
            }
          : t
      )
    );
  };

  const handleAddProducer = (trackIndex) => {
    const track = tracks[trackIndex];
    const prod = track.newProducerInput.trim();
    if (!prod) return;
    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex
          ? {
              ...t,
              producers: [...t.producers, prod],
              newProducerInput: "",
            }
          : t
      )
    );
  };

  const handleRemoveProducer = (trackIndex, prodIndex) => {
    setTracks((prev) =>
      prev.map((t, i) =>
        i === trackIndex
          ? {
              ...t,
              producers: t.producers.filter((_, pIdx) => pIdx !== prodIndex),
            }
          : t
      )
    );
  };

  /* =========================================================
     3. STUDIO BEAT FORM STATE
     ========================================================= */
  const [beatTitle, setBeatTitle] = useState("");
  const [beatGenre, setBeatGenre] = useState("Afro-Alternative × Trap");
  const [beatBpm, setBeatBpm] = useState("130 BPM");
  const [beatKey, setBeatKey] = useState("F Minor");
  const [beatVideo, setBeatVideo] = useState("/beats/chinese-empathy.mp4");
  const [beatAudio, setBeatAudio] = useState("/beats/chinese-empathy.mp3");
  const [beatCategories, setBeatCategories] = useState(["afro"]);
  const [beatSelarBasic, setBeatSelarBasic] = useState("https://selar.com/chomkamusicstudio-");
  const [beatSelarPremium, setBeatSelarPremium] = useState("https://selar.com/chomkamusicstudio-");
  const [beatSelarUltimate, setBeatSelarUltimate] = useState("https://selar.com/chomkamusicstudio-");
  const [beatDate, setBeatDate] = useState(todayStr);

  /* =========================================================
     4. MUSIC VIDEO FORM STATE
     ========================================================= */
  const [videoTitle, setVideoTitle] = useState("");
  const [videoSubtitle, setVideoSubtitle] = useState("");
  const [videoCategory, setVideoCategory] = useState("Visualizer");
  const [videoYoutubeId, setVideoYoutubeId] = useState("");
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoAudiomack, setVideoAudiomack] = useState("");
  const [videoSoundcloud, setVideoSoundcloud] = useState("");
  const [videoDate, setVideoDate] = useState(todayStr);

  /* =========================================================
     DIRECT ONE-CLICK PUBLISHING HANDLER
     ========================================================= */
  const handlePublishNow = async () => {
    setIsPublishing(true);

    try {
      if (activeTab === "gallery") {
        if (galleryMediaItems.length === 0) {
          alert("Please add at least one photo or video before publishing to the gallery.");
          setIsPublishing(false);
          return;
        }

        const id = slugify(galleryTitle || `gallery-${Date.now()}`);
        const tagsArr = galleryTags
          .split(/\s+/)
          .map((t) => (t.startsWith("#") ? t : `#${t}`))
          .filter(Boolean);

        const isMulti = galleryMediaItems.length > 1;
        const primaryMedia = galleryMediaItems[0] || { type: "image", src: "/covers/noisemaker.png" };

        const postObj = {
          id,
          type: isMulti ? "carousel" : primaryMedia.type,
          category: galleryCategory,
          title: galleryTitle || "Visual Post",
          caption: galleryCaption,
          date: galleryDate || todayStr,
          displayDate: galleryDisplayDate || todayDisplay,
          src: primaryMedia.src,
          ...(isMulti
            ? {
                slides: galleryMediaItems.map((m) => m.src),
                slideTypes: galleryMediaItems.map((m) => m.type),
              }
            : primaryMedia.type === "video"
            ? { videoSrc: primaryMedia.src }
            : {}),
          ...(galleryLink ? { link: galleryLink } : {}),
          tags: tagsArr,
        };

        await saveGalleryPost(postObj);
        setPublishSuccess({
          title: `✓ Gallery post "${postObj.title}" published live!`,
          message: `Post with ${galleryMediaItems.length} media item(s) is now active in the Visual Archive.`,
          link: "/#gallery",
          linkText: "View Live in Gallery Archive →",
        });
      } else if (activeTab === "release") {
        const slug = slugify(releaseTitle || `release-${Date.now()}`);
        const cleanTracks = tracks.map((t) => ({
          title: t.title,
          featuring: t.featuring,
          producers: t.producers,
          platforms: Object.fromEntries(
            Object.entries(t.platforms).filter(([, val]) => Boolean(val.trim()))
          ),
        }));

        const customPlatformMap = Object.fromEntries(
          customPlatforms.map((p) => [slugify(p.name), p.url])
        );

        const releaseObj = {
          number: releases.length + 1,
          title: (releaseTitle || "NEW RELEASE").toUpperCase(),
          slug,
          edition: Number(releaseEdition) || 1,
          date: releaseDate || todayStr,
          displayDate: releaseDisplayDate || todayDisplay,
          cover: releaseCover,
          description: releaseDesc,
          sources: releaseSources,
          platforms: {
            ...(releaseSpotify ? { spotify: releaseSpotify } : {}),
            ...(releaseApple ? { appleMusic: releaseApple } : {}),
            ...(releaseYoutube ? { youtubeMusic: releaseYoutube } : {}),
            ...(releaseAudiomack ? { audiomack: releaseAudiomack } : {}),
            ...(releaseBoomplay ? { boomplay: releaseBoomplay } : {}),
            ...(releaseDeezer ? { deezer: releaseDeezer } : {}),
            ...customPlatformMap,
          },
          tracks: cleanTracks,
        };

        await saveRelease(releaseObj);
        setPublishSuccess({
          title: `✓ Music project "${releaseObj.title}" published live!`,
          message: `Release is now live on the homepage discography and has a dedicated showcase page.`,
          link: `/release/${slug}`,
          linkText: `View "${releaseObj.title}" Project Page →`,
        });
      } else if (activeTab === "beat") {
        const id = slugify(beatTitle || `beat-${Date.now()}`);
        const beatObj = {
          id,
          title: (beatTitle || "NEW BEAT").toUpperCase(),
          genre: beatGenre,
          shortGenre: beatGenre,
          categories: beatCategories,
          bpm: beatBpm.includes("BPM") ? beatBpm : `${beatBpm} BPM`,
          key: beatKey,
          video: beatVideo,
          audio: beatAudio,
          showVisualTitle: true,
          status: "available",
          date: beatDate || todayStr,
          selar: {
            basic: beatSelarBasic,
            premium: beatSelarPremium,
            ultimate: beatSelarUltimate,
          },
        };

        await saveBeat(beatObj);
        setPublishSuccess({
          title: `✓ Studio beat "${beatObj.title}" published live!`,
          message: `Beat is active in the Beats catalog with full playback and Selar checkout integration.`,
          link: `/beats/${id}`,
          linkText: `View "${beatObj.title}" Beat Page →`,
        });
      } else if (activeTab === "video") {
        const id = slugify(videoTitle || `video-${Date.now()}`);
        let extractedId = videoYoutubeId.trim();
        if (videoYoutubeUrl.includes("youtu.be/")) {
          extractedId = videoYoutubeUrl.split("youtu.be/")[1]?.split("?")[0] || extractedId;
        } else if (videoYoutubeUrl.includes("watch?v=")) {
          extractedId = videoYoutubeUrl.split("watch?v=")[1]?.split("&")[0] || extractedId;
        }

        const videoObj = {
          id,
          title: videoTitle || "New Video",
          subtitle: videoSubtitle,
          category: videoCategory,
          youtubeId: extractedId,
          youtubeUrl: videoYoutubeUrl || `https://youtu.be/${extractedId}`,
          aspectRatio: videoAspectRatio,
          date: videoDate || todayStr,
          featuring: [],
          links: {
            youtube: videoYoutubeUrl || `https://youtu.be/${extractedId}`,
            ...(videoAudiomack ? { audiomack: videoAudiomack } : {}),
            ...(videoSoundcloud ? { soundcloud: videoSoundcloud } : {}),
          },
        };

        await saveVideo(videoObj);
        setPublishSuccess({
          title: `✓ Music video "${videoObj.title}" published live!`,
          message: `Visual is now active in the Visual Cinema Theatre.`,
          link: "/#videos",
          linkText: "View in Visual Cinema Theatre →",
        });
      }
    } catch (err) {
      console.error("Publish error:", err);
      alert(`Publishing failed: ${err.message || err}`);
    } finally {
      setIsPublishing(false);
    }
  };

  /* =========================================================
     PIN LOCK SCREEN
     ========================================================= */
  if (!isAuthenticated) {
    return (
      <main className="studio-publisher-view">
        <div className="studio-container" style={{ maxWidth: "460px", margin: "60px auto", textAlign: "center" }}>
          <Link to="/" className="release-breadcrumb" style={{ display: "inline-block", marginBottom: "20px" }}>
            ← Return to Main Site
          </Link>

          <div
            style={{
              padding: "40px",
              background: "var(--surface)",
              border: "1px solid var(--line-gold)",
              borderRadius: "8px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div style={{ width: "50px", height: "50px", margin: "0 auto 16px", borderRadius: "50%", background: "var(--gold)", color: "var(--bg)", display: "grid", placeItems: "center", fontSize: "22px", fontWeight: 700 }}>
              🔒
            </div>

            <p className="eyebrow">CHOMKA NATION CREATOR SYSTEM</p>
            <h1 style={{ fontSize: "26px", margin: "8px 0 16px", fontFamily: "var(--font-display)", color: "var(--text)" }}>
              Creator Studio Access
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: "1.6", marginBottom: "24px" }}>
              Private publishing portal for silachomka. Enter your creator passcode to publish or delete content.
            </p>

            <form onSubmit={handleUnlock}>
              <input
                type="password"
                placeholder="Enter Creator PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className="studio-input"
                style={{ textAlign: "center", fontSize: "18px", letterSpacing: "0.2em", marginBottom: "16px" }}
                autoFocus
              />

              {pinError && (
                <p style={{ color: "#ff6b6b", fontSize: "12px", margin: "-8px 0 14px" }}>
                  Invalid creator passcode. Please try again.
                </p>
              )}

              <button type="submit" className="primary-button" style={{ width: "100%" }}>
                Unlock Creator Studio →
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     MAIN CREATOR STUDIO INTERFACE
     ========================================================= */
  const selectedMedia = galleryMediaItems.length > 0 ? (galleryMediaItems[activeMediaIndex] || galleryMediaItems[0]) : null;

  return (
    <main className="studio-publisher-view">
      <div className="studio-container">
        {/* Header Bar */}
        <div className="studio-header">
          <div>
            <Link to="/" className="release-breadcrumb">
              ← Return to Main Site
            </Link>
            <p className="eyebrow" style={{ marginTop: "12px" }}>
              chomkaMUSIC™ Creator Studio (Active Live Publisher)
            </p>
            <h1 className="studio-title">Zero-Code Content Publisher & Manager</h1>
            <p className="studio-subtitle">
              Publish new media directly to the live website, or manage and delete existing catalog assets.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "14px" }}>
            <button
              type="button"
              onClick={handleLock}
              className="text-button"
              style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "0.1em" }}
            >
              🔒 Lock Creator Studio
            </button>

            <div className="studio-tab-group">
              <button
                type="button"
                className={`studio-tab-btn ${activeTab === "gallery" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("gallery");
                  setPublishSuccess(null);
                }}
              >
                📸 Post
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${activeTab === "release" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("release");
                  setPublishSuccess(null);
                }}
              >
                🎵 Music
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${activeTab === "beat" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("beat");
                  setPublishSuccess(null);
                }}
              >
                🎹 Beat
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${activeTab === "video" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("video");
                  setPublishSuccess(null);
                }}
              >
                🎬 Video
              </button>
              <button
                type="button"
                className={`studio-tab-btn ${activeTab === "manage" ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab("manage");
                  setPublishSuccess(null);
                }}
                style={{ borderColor: "var(--gold)" }}
              >
                🗑️ Manage & Delete
              </button>
            </div>
          </div>
        </div>

        {/* Celebratory Post-Publish Live Jump Card */}
        {publishSuccess && (
          <div
            style={{
              padding: "24px 28px",
              background: "rgba(13, 10, 23, 0.85)",
              border: "1.5px solid var(--gold)",
              borderRadius: "8px",
              boxShadow: "0 15px 40px rgba(0, 0, 0, 0.8), 0 0 30px var(--gold-glow)",
              marginBottom: "32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              animation: "fadeIn 300ms ease",
            }}
          >
            <div>
              <strong style={{ color: "var(--gold)", fontSize: "16px", display: "block", marginBottom: "4px" }}>
                {publishSuccess.title}
              </strong>
              <span style={{ color: "var(--text)", fontSize: "13px" }}>
                {publishSuccess.message}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => navigate(publishSuccess.link)}
                className="primary-button"
                style={{ minHeight: "44px", padding: "0 22px", fontSize: "12px", letterSpacing: "0.1em" }}
              >
                {publishSuccess.linkText}
              </button>
              <button
                type="button"
                onClick={() => setPublishSuccess(null)}
                style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontSize: "14px", padding: "8px" }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ===============================================
            MANAGE & DELETE CATALOG TAB
            =============================================== */}
        {activeTab === "manage" && (
          <div className="studio-manage-section">
            <h2 className="studio-section-heading">Manage & Delete Existing Content</h2>
            <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "24px" }}>
              Click delete on any item to remove it immediately from the live website.
            </p>

            <div style={{ display: "grid", gap: "36px" }}>
              {/* Releases */}
              <div>
                <h3 style={{ color: "var(--gold)", fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
                  Music Releases ({releases.length})
                </h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {releases.map((rel) => (
                    <div key={rel.slug} className="manage-item-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <img src={rel.cover} alt={rel.title} style={{ width: "45px", height: "45px", objectFit: "cover", borderRadius: "4px" }} />
                        <div>
                          <strong style={{ color: "var(--text)", fontSize: "14px", display: "block" }}>{rel.title}</strong>
                          <span style={{ color: "var(--muted)", fontSize: "11px" }}>{rel.displayDate || rel.date} • {rel.tracks?.length || 0} tracks</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${rel.title}"?`)) {
                            await deleteRelease(rel.slug);
                          }
                        }}
                        className="manage-delete-btn"
                      >
                        Delete ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery Posts */}
              <div>
                <h3 style={{ color: "var(--gold)", fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
                  Gallery Posts ({gallery.length})
                </h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {gallery.map((post) => (
                    <div key={post.id} className="manage-item-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <img src={post.src} alt={post.title} style={{ width: "45px", height: "45px", objectFit: "cover", borderRadius: "4px" }} />
                        <div>
                          <strong style={{ color: "var(--text)", fontSize: "14px", display: "block" }}>{post.title}</strong>
                          <span style={{ color: "var(--muted)", fontSize: "11px" }}>{post.displayDate || post.date} • {post.category}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
                            await deleteGalleryPost(post.id);
                          }
                        }}
                        className="manage-delete-btn"
                      >
                        Delete ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beats */}
              <div>
                <h3 style={{ color: "var(--gold)", fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
                  Studio Beats ({beats.length})
                </h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {beats.map((beat) => (
                    <div key={beat.id} className="manage-item-row">
                      <div>
                        <strong style={{ color: "var(--text)", fontSize: "14px", display: "block" }}>{beat.title}</strong>
                        <span style={{ color: "var(--muted)", fontSize: "11px" }}>{beat.genre} • {beat.bpm} • {beat.key}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${beat.title}"?`)) {
                            await deleteBeat(beat.id);
                          }
                        }}
                        className="manage-delete-btn"
                      >
                        Delete ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Videos */}
              <div>
                <h3 style={{ color: "var(--gold)", fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>
                  Visual Catalogue Videos ({videos.length})
                </h3>
                <div style={{ display: "grid", gap: "10px" }}>
                  {videos.map((vid) => (
                    <div key={vid.id} className="manage-item-row">
                      <div>
                        <strong style={{ color: "var(--text)", fontSize: "14px", display: "block" }}>{vid.title}</strong>
                        <span style={{ color: "var(--muted)", fontSize: "11px" }}>{vid.category} • {vid.subtitle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${vid.title}"?`)) {
                            await deleteVideo(vid.id);
                          }
                        }}
                        className="manage-delete-btn"
                      >
                        Delete ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===============================================
            PUBLISHING FORMS
            =============================================== */}
        {activeTab !== "manage" && (
          <div className="studio-form-card">
            {/* 1. GALLERY POST BUILDER (UP TO 20 MEDIA REEL) */}
            {activeTab === "gallery" && (
              <div>
                <h2 className="studio-section-heading">Compose Gallery Archive Post</h2>

                {/* INSTAGRAM STYLE CONTINUOUS MEDIA REEL UPLOADER */}
                <div className="studio-media-uploader-box">
                  <div className="uploader-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="uploader-label">📸 Media Reel / Carousel</span>
                      <span className="uploader-sub">Add up to 20 photos and videos. Drag to rearrange order.</span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--gold)", fontWeight: 800 }}>
                      {galleryMediaItems.length} / {MAX_CAROUSEL_ITEMS} Selected
                    </span>
                  </div>

                  {/* THUMBNAIL REEL STRIP OR EMPTY DROPZONE */}
                  {galleryMediaItems.length > 0 ? (
                    <div className="uploader-reel-strip">
                      {galleryMediaItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          draggable
                          onDragStart={(e) => {
                            setDraggedIndex(idx);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            setDragOverIndex(idx);
                          }}
                          onDragLeave={() => setDragOverIndex(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleReorder(draggedIndex, idx);
                            setDraggedIndex(null);
                            setDragOverIndex(null);
                          }}
                          onDragEnd={() => {
                            setDraggedIndex(null);
                            setDragOverIndex(null);
                          }}
                          className={`uploader-reel-item ${idx === activeMediaIndex ? "is-active" : ""} ${idx === draggedIndex ? "is-dragging" : ""} ${idx === dragOverIndex ? "is-drag-over" : ""}`}
                          onClick={() => setActiveMediaIndex(idx)}
                          title="Drag to rearrange order, click to preview"
                        >
                          {item.type === "video" ? (
                            <div className="uploader-video-thumb">
                              <video src={item.src} muted playsInline className="uploader-thumb-media" />
                              <span className="uploader-video-badge">🎬</span>
                            </div>
                          ) : (
                            <img src={item.src} alt={`Slide ${idx + 1}`} className="uploader-thumb-media" />
                          )}
                          <span className="uploader-item-num">#{idx + 1}</span>

                          {/* Always-visible X delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMediaItem(idx);
                            }}
                            className="uploader-item-del"
                            title="Remove slide"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      {/* CONTINUOUS "+" BUTTON TO ADD UP TO 20 PHOTOS / VIDEOS */}
                      {galleryMediaItems.length < MAX_CAROUSEL_ITEMS && (
                        <button
                          type="button"
                          className="uploader-add-slot-btn"
                          onClick={() => fileInputRef.current?.click()}
                          title="Add photo or video"
                        >
                          <div className="uploader-add-plus">+</div>
                          <span>Add Media</span>
                          <small>({galleryMediaItems.length}/{MAX_CAROUSEL_ITEMS})</small>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="uploader-empty-dropzone" onClick={() => fileInputRef.current?.click()}>
                      <div className="uploader-icon">+</div>
                      <strong style={{ color: "var(--gold)", fontSize: "14px", marginBottom: "4px" }}>Click to Add Media Files</strong>
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>Upload up to 20 photos and videos in any format</span>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaUpload}
                    style={{ display: "none" }}
                  />

                  {/* Active Slide Full Preview or Empty State Notice */}
                  {selectedMedia ? (
                    <div className="uploader-active-preview-box">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "11px", color: "var(--muted)", width: "100%" }}>
                        <span>Slide #{activeMediaIndex + 1} Preview ({selectedMedia.type.toUpperCase()})</span>
                        <span>Drag thumbnails above to rearrange • Click thumbnail to preview</span>
                      </div>
                      {selectedMedia.type === "video" ? (
                        <video src={selectedMedia.src} autoPlay muted loop playsInline className="uploader-preview-media" />
                      ) : (
                        <img src={selectedMedia.src} alt="Slide Preview" className="uploader-preview-media" />
                      )}
                    </div>
                  ) : (
                    <div className="uploader-empty-preview">
                      <span style={{ fontSize: "24px" }}>📁</span>
                      <strong style={{ color: "var(--text)" }}>No media selected</strong>
                      <span>Add photos or videos using the button above or paste an external URL below.</span>
                    </div>
                  )}

                  {/* Manual URL Input */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                    <input
                      type="text"
                      placeholder="Or paste external photo/video URL to add to reel..."
                      value={manualMediaUrl}
                      onChange={(e) => setManualMediaUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddManualUrl())}
                      className="studio-input"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualUrl}
                      className="primary-button"
                      style={{ minHeight: "42px", padding: "0 16px", whiteSpace: "nowrap" }}
                      disabled={galleryMediaItems.length >= MAX_CAROUSEL_ITEMS}
                    >
                      + Add to Reel
                    </button>
                  </div>
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 2 }}>
                    <label>Post Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Swaggy Studio Visuals or Night Portrait"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Post Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={galleryDate}
                      onChange={(e) => setGalleryDate(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Display Date</label>
                    <input
                      type="text"
                      placeholder="e.g. 23 Jan 2026"
                      value={galleryDisplayDate}
                      onChange={(e) => setGalleryDisplayDate(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-field">
                  <label>Caption</label>
                  <textarea
                    rows={4}
                    placeholder="Write your thoughts, credits, release info or lyrics..."
                    value={galleryCaption}
                    onChange={(e) => setGalleryCaption(e.target.value)}
                    className="studio-textarea"
                  />
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Category</label>
                    <select
                      value={galleryCategory}
                      onChange={(e) => setGalleryCategory(e.target.value)}
                      className="studio-select"
                    >
                      <option value="portraits">Portraits & Style</option>
                      <option value="releases">Releases & Music</option>
                      <option value="freestyles">Freestyles & Covers</option>
                      <option value="videos">Videos & Motion</option>
                      <option value="bts">Studio & BTS</option>
                    </select>
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Connected Link (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. /release/noisemaker"
                      value={galleryLink}
                      onChange={(e) => setGalleryLink(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Tags</label>
                    <input
                      type="text"
                      placeholder="#silachomka #chomkaMUSIC"
                      value={galleryTags}
                      onChange={(e) => setGalleryTags(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. MUSIC RELEASE / PROJECT BUILDER */}
            {activeTab === "release" && (
              <div>
                <h2 className="studio-section-heading">Register New Music Project / Release</h2>

                {/* Album Cover Picker */}
                <div className="studio-media-uploader-box">
                  <div className="uploader-header">
                    <span className="uploader-label">🎵 Album Cover Artwork</span>
                    <span className="uploader-sub">Upload high-res square cover art</span>
                  </div>

                  {releaseCover ? (
                    <div className="uploader-preview-container" style={{ maxHeight: "200px" }}>
                      <img src={releaseCover} alt="Cover Preview" className="uploader-preview-media" style={{ width: "180px", height: "180px", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setReleaseCover("")}
                        className="uploader-remove-btn"
                      >
                        ✕ Change Cover
                      </button>
                    </div>
                  ) : (
                    <div className="uploader-dropzone" onClick={() => coverInputRef.current?.click()}>
                      <div className="uploader-icon">+</div>
                      <strong>Upload Cover Image</strong>
                    </div>
                  )}

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    style={{ display: "none" }}
                  />

                  <div style={{ marginTop: "10px" }}>
                    <input
                      type="text"
                      placeholder="Or cover art path (e.g. /covers/noisemaker.png)"
                      value={releaseCover}
                      onChange={(e) => setReleaseCover(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 2 }}>
                    <label>Project Title</label>
                    <input
                      type="text"
                      placeholder="e.g. NOISEMAKER or ITEM5"
                      value={releaseTitle}
                      onChange={(e) => setReleaseTitle(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Edition Number</label>
                    <input
                      type="number"
                      value={releaseEdition}
                      onChange={(e) => setReleaseEdition(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Release Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Display Date</label>
                    <input
                      type="text"
                      placeholder="e.g. Friday, 21 August 2026"
                      value={releaseDisplayDate}
                      onChange={(e) => setReleaseDisplayDate(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-field">
                  <label>Description / Liner Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Official EP / Album story & liner notes..."
                    value={releaseDesc}
                    onChange={(e) => setReleaseDesc(e.target.value)}
                    className="studio-textarea"
                  />
                </div>

                <div className="studio-field">
                  <label>Project Sources</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                    {releaseSources.map((src, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "var(--surface)",
                          border: "1px solid var(--line-gold)",
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        {src}
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(idx)}
                          style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: "10px", padding: 0 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder="e.g. chomkaMUSIC™"
                      value={newSourceInput}
                      onChange={(e) => setNewSourceInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSource())}
                      className="studio-input"
                    />
                    <button type="button" onClick={handleAddSource} className="primary-button" style={{ padding: "0 16px" }}>
                      +
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: "14px", color: "var(--gold)", margin: "24px 0 12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Project-Level Platform Links
                </h3>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Spotify Album URL</label>
                    <input
                      type="text"
                      placeholder="https://open.spotify.com/album/..."
                      value={releaseSpotify}
                      onChange={(e) => setReleaseSpotify(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Apple Music Album URL</label>
                    <input
                      type="text"
                      placeholder="https://music.apple.com/..."
                      value={releaseApple}
                      onChange={(e) => setReleaseApple(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>YouTube Music Playlist URL</label>
                    <input
                      type="text"
                      placeholder="https://music.youtube.com/playlist?list=..."
                      value={releaseYoutube}
                      onChange={(e) => setReleaseYoutube(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Audiomack Album URL</label>
                    <input
                      type="text"
                      placeholder="https://audiomack.com/..."
                      value={releaseAudiomack}
                      onChange={(e) => setReleaseAudiomack(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Boomplay Album URL</label>
                    <input
                      type="text"
                      placeholder="https://www.boomplay.com/..."
                      value={releaseBoomplay}
                      onChange={(e) => setReleaseBoomplay(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Deezer Album URL</label>
                    <input
                      type="text"
                      placeholder="https://link.deezer.com/..."
                      value={releaseDeezer}
                      onChange={(e) => setReleaseDeezer(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                {/* Custom Platforms */}
                <div style={{ marginTop: "18px", padding: "16px", background: "var(--surface-glass)", borderRadius: "4px" }}>
                  <label style={{ display: "block", color: "var(--gold)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>
                    + Custom Streaming Platforms
                  </label>

                  {customPlatforms.map((p, pIdx) => (
                    <div key={pIdx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ color: "var(--text)", fontWeight: 600, fontSize: "13px", minWidth: "100px" }}>{p.name}:</span>
                      <span style={{ color: "var(--muted)", fontSize: "12px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.url}</span>
                      <button type="button" onClick={() => handleRemoveCustomPlatform(pIdx)} style={{ color: "#ff6b6b", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                    </div>
                  ))}

                  <div className="studio-row" style={{ marginTop: "10px" }}>
                    <div className="studio-field" style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Platform Name (e.g. Tidal or Bandcamp)"
                        value={newPlatformName}
                        onChange={(e) => setNewPlatformName(e.target.value)}
                        className="studio-input"
                      />
                    </div>
                    <div className="studio-field" style={{ flex: 2 }}>
                      <input
                        type="text"
                        placeholder="Platform URL"
                        value={newPlatformUrl}
                        onChange={(e) => setNewPlatformUrl(e.target.value)}
                        className="studio-input"
                      />
                    </div>
                    <button type="button" onClick={handleAddCustomPlatform} className="primary-button" style={{ minHeight: "42px", padding: "0 16px" }}>
                      + Add Platform
                    </button>
                  </div>
                </div>

                {/* Dynamic Tracklist */}
                <div style={{ marginTop: "30px", borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "16px", color: "var(--text)", margin: 0, fontFamily: "var(--font-display)" }}>
                      Tracklist ({tracks.length})
                    </h3>
                    <button type="button" onClick={handleAddTrack} className="primary-button" style={{ minHeight: "34px", padding: "0 14px" }}>
                      + Add Track
                    </button>
                  </div>

                  {tracks.map((track, tIdx) => (
                    <div
                      key={tIdx}
                      style={{
                        padding: "16px",
                        background: "var(--surface-glass)",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "12px" }}>
                          TRACK {tIdx + 1}
                        </span>
                        {tracks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTrack(tIdx)}
                            style={{ color: "#ff6b6b", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}
                          >
                            Remove Track ✕
                          </button>
                        )}
                      </div>

                      <div className="studio-field">
                        <label>Track Title</label>
                        <input
                          type="text"
                          value={track.title}
                          onChange={(e) => handleTrackFieldChange(tIdx, "title", e.target.value)}
                          className="studio-input"
                        />
                      </div>

                      <div className="studio-field">
                        <label>Featured Artists</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                          {track.featuring.map((feat, fIdx) => (
                            <span
                              key={fIdx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                background: "var(--gold)",
                                color: "var(--bg)",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              {feat}
                              <button
                                type="button"
                                onClick={() => handleRemoveFeature(tIdx, fIdx)}
                                style={{ background: "none", border: "none", color: "var(--bg)", cursor: "pointer", fontWeight: 900 }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="Add featured artist..."
                            value={track.newFeatInput || ""}
                            onChange={(e) => handleTrackFieldChange(tIdx, "newFeatInput", e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFeature(tIdx))}
                            className="studio-input"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddFeature(tIdx)}
                            className="primary-button"
                            style={{ minHeight: "36px", padding: "0 16px" }}
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      <div className="studio-field">
                        <label>Producers</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                          {track.producers?.map((prod, pIdx) => (
                            <span
                              key={pIdx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                background: "var(--surface)",
                                border: "1px solid var(--line-gold)",
                                color: "var(--text)",
                                borderRadius: "20px",
                                fontSize: "11px",
                              }}
                            >
                              {prod}
                              <button
                                type="button"
                                onClick={() => handleRemoveProducer(tIdx, pIdx)}
                                style={{ background: "none", border: "none", color: "#ff6b6b", cursor: "pointer", fontWeight: 700 }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            placeholder="Add producer..."
                            value={track.newProducerInput || ""}
                            onChange={(e) => handleTrackFieldChange(tIdx, "newProducerInput", e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddProducer(tIdx))}
                            className="studio-input"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddProducer(tIdx)}
                            className="primary-button"
                            style={{ minHeight: "36px", padding: "0 16px" }}
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      <div className="studio-row">
                        <div className="studio-field" style={{ flex: 1 }}>
                          <label>Track Spotify URL</label>
                          <input
                            type="text"
                            placeholder="https://open.spotify.com/track/..."
                            value={track.platforms.spotify || ""}
                            onChange={(e) => handleTrackPlatformChange(tIdx, "spotify", e.target.value)}
                            className="studio-input"
                          />
                        </div>
                        <div className="studio-field" style={{ flex: 1 }}>
                          <label>Track Apple Music URL</label>
                          <input
                            type="text"
                            placeholder="https://music.apple.com/us/song/..."
                            value={track.platforms.appleMusic || ""}
                            onChange={(e) => handleTrackPlatformChange(tIdx, "appleMusic", e.target.value)}
                            className="studio-input"
                          />
                        </div>
                      </div>

                      <div className="studio-row">
                        <div className="studio-field" style={{ flex: 1 }}>
                          <label>Track YouTube Music URL</label>
                          <input
                            type="text"
                            placeholder="https://music.youtube.com/watch?v=..."
                            value={track.platforms.youtubeMusic || ""}
                            onChange={(e) => handleTrackPlatformChange(tIdx, "youtubeMusic", e.target.value)}
                            className="studio-input"
                          />
                        </div>
                        <div className="studio-field" style={{ flex: 1 }}>
                          <label>Track Deezer URL</label>
                          <input
                            type="text"
                            placeholder="https://link.deezer.com/s/..."
                            value={track.platforms.deezer || ""}
                            onChange={(e) => handleTrackPlatformChange(tIdx, "deezer", e.target.value)}
                            className="studio-input"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. STUDIO BEAT BUILDER */}
            {activeTab === "beat" && (
              <div>
                <h2 className="studio-section-heading">Register New Studio Beat</h2>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 2 }}>
                    <label>Beat Title</label>
                    <input
                      type="text"
                      placeholder="e.g. CHINESE EMPATHY or NOISEMAKER"
                      value={beatTitle}
                      onChange={(e) => setBeatTitle(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={beatDate}
                      onChange={(e) => setBeatDate(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-field">
                  <label>Genre / Fusion Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Afro-Alternative × Afro Trap"
                    value={beatGenre}
                    onChange={(e) => setBeatGenre(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Tempo (BPM)</label>
                    <input
                      type="text"
                      placeholder="e.g. 140 BPM"
                      value={beatBpm}
                      onChange={(e) => setBeatBpm(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Musical Key</label>
                    <input
                      type="text"
                      placeholder="e.g. F minor or C♯ major"
                      value={beatKey}
                      onChange={(e) => setBeatKey(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-field">
                  <label>Video Visualizer Path / Media File</label>
                  <input
                    type="text"
                    placeholder="e.g. /beats/my-beat.mp4"
                    value={beatVideo}
                    onChange={(e) => setBeatVideo(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="studio-field">
                  <label>Audio Stream Path (MP3 Preview)</label>
                  <input
                    type="text"
                    placeholder="e.g. /beats/my-beat.mp3"
                    value={beatAudio}
                    onChange={(e) => setBeatAudio(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="studio-field">
                  <label>Basic License Selar URL (₦15,000)</label>
                  <input
                    type="text"
                    placeholder="https://selar.com/chomkamusicstudio-mybeat-basic"
                    value={beatSelarBasic}
                    onChange={(e) => setBeatSelarBasic(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="studio-field">
                  <label>Premium License Selar URL (₦30,000)</label>
                  <input
                    type="text"
                    placeholder="https://selar.com/chomkamusicstudio-mybeat-premium"
                    value={beatSelarPremium}
                    onChange={(e) => setBeatSelarPremium(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="studio-field">
                  <label>Ultimate License Selar URL (₦60,000)</label>
                  <input
                    type="text"
                    placeholder="https://selar.com/chomkamusicstudio-mybeat-ultimate"
                    value={beatSelarUltimate}
                    onChange={(e) => setBeatSelarUltimate(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="studio-field">
                  <label>Filter Categories</label>
                  <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                    {["afro", "trap", "rnb", "drill"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setBeatCategories((prev) =>
                            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                          )
                        }
                        className={`studio-pill-btn ${beatCategories.includes(cat) ? "is-active" : ""}`}
                      >
                        {cat.toUpperCase()} {beatCategories.includes(cat) ? "✓" : "+"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. MUSIC VIDEO BUILDER */}
            {activeTab === "video" && (
              <div>
                <h2 className="studio-section-heading">Register Music Video / Visualizer</h2>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 2 }}>
                    <label>Video Title</label>
                    <input
                      type="text"
                      placeholder="e.g. facto (Official Visualizer)"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={videoDate}
                      onChange={(e) => setVideoDate(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-field">
                  <label>Subtitle / Project Association</label>
                  <input
                    type="text"
                    placeholder="e.g. Track 4 off NOISEMAKER EP"
                    value={videoSubtitle}
                    onChange={(e) => setVideoSubtitle(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Category</label>
                    <select
                      value={videoCategory}
                      onChange={(e) => setVideoCategory(e.target.value)}
                      className="studio-select"
                    >
                      <option value="Music Video">Official Music Video</option>
                      <option value="Visualizer">Visualizer</option>
                      <option value="Lyric Video">Lyric Video</option>
                      <option value="Vocal Cover">Vocal Cover</option>
                      <option value="Freestyle Cover">Freestyle Cover</option>
                    </select>
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Aspect Ratio</label>
                    <select
                      value={videoAspectRatio}
                      onChange={(e) => setVideoAspectRatio(e.target.value)}
                      className="studio-select"
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="9:16">9:16 Portrait</option>
                    </select>
                  </div>
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 2 }}>
                    <label>YouTube Video URL</label>
                    <input
                      type="text"
                      placeholder="https://youtu.be/sVA_MkT8D3c"
                      value={videoYoutubeUrl}
                      onChange={(e) => setVideoYoutubeUrl(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Or YouTube ID</label>
                    <input
                      type="text"
                      placeholder="sVA_MkT8D3c"
                      value={videoYoutubeId}
                      onChange={(e) => setVideoYoutubeId(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>

                <div className="studio-row">
                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>Audiomack Song URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="https://audiomack.com/..."
                      value={videoAudiomack}
                      onChange={(e) => setVideoAudiomack(e.target.value)}
                      className="studio-input"
                    />
                  </div>

                  <div className="studio-field" style={{ flex: 1 }}>
                    <label>SoundCloud Song URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="https://soundcloud.com/..."
                      value={videoSoundcloud}
                      onChange={(e) => setVideoSoundcloud(e.target.value)}
                      className="studio-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Direct Publishing Action Button */}
            <div style={{ marginTop: "32px", borderTop: "1px solid var(--line)", paddingTop: "24px" }}>
              <button
                type="button"
                onClick={handlePublishNow}
                disabled={isPublishing}
                className="primary-button"
                style={{
                  width: "100%",
                  minHeight: "54px",
                  fontSize: "13px",
                  letterSpacing: "0.14em",
                  opacity: isPublishing ? 0.7 : 1,
                  cursor: isPublishing ? "wait" : "pointer",
                }}
              >
                {isPublishing ? "Publishing to Website..." : "🚀 Publish Directly to Live Website"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

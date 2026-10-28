import { UpRightArrowIcon, RightArrowIcon } from "./Icons";
// src/components/GalleryPostModal.jsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import ShareLinkBox from "./ShareLinkBox";
import SocialPostEmbed from "./SocialPostEmbed";
import GalleryVideoPlayer from "./GalleryVideoPlayer";
import { absoluteUrl, canonicalUrl, DEFAULT_SOURCE } from "../data/credits";
import { formatGalleryDate } from "../utils/dateFormatter";
import { buildCalendarUrl, getSavedCalendarState } from "../utils/calendarNavigation";

function extractPostIsoDate(post) {
  if (!post) return null;
  const candidates = [post.date, post.post_date, post.displayDate];
  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    const m = c.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (post.displayDate && typeof post.displayDate === "string") {
    const d = new Date(post.displayDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dt = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dt}`;
    }
  }
  return null;
}

function isVideoSrc(src, slideObj, post, slideCount = 1) {
  if (
    slideObj?.isVideo ||
    slideObj?.slideType === "video" ||
    slideObj?.assetType === "VIDEO" ||
    (slideObj?.mimeType && String(slideObj.mimeType).toLowerCase().startsWith("video/"))
  ) {
    return true;
  }
  if (
    slideCount <= 1 &&
    (post?.isVideo ||
      post?.type === "video" ||
      post?.post_type === "video" ||
      post?.assetType === "VIDEO" ||
      (post?.mimeType && String(post.mimeType).toLowerCase().startsWith("video/")))
  ) {
    return true;
  }
  if (!src || typeof src !== "string") return false;
  if (src.startsWith("data:video/")) return true;
  const ext = src.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov", "m4v"].includes(ext);
}

const FALLBACK_GALLERY_SOCIALS = [
  { name: "Instagram", url: "https://www.instagram.com/silachomka/?__pwa=1" },
  { name: "X", url: "https://x.com/silachomka" },
  { name: "Threads", url: "https://www.threads.net/@silachomka" },
  { name: "TikTok", url: "https://www.tiktok.com/@silachomka" },
  { name: "YouTube", url: "https://www.youtube.com/@silachomka" },
];

let cachedSocialLinks = null;
let lastSelectedSocialUrl = null;

function normalizePlatformName(name) {
  if (!name) return "Instagram";
  const str = String(name).trim();
  if (/twitter/i.test(str) || str.toLowerCase() === "x") return "X";
  if (/instagram/i.test(str)) return "Instagram";
  if (/threads/i.test(str)) return "Threads";
  if (/tiktok/i.test(str)) return "TikTok";
  if (/youtube/i.test(str)) return "YouTube";
  return str;
}

export default function GalleryPostModal({
  post,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  embedded = false,
  onSelectPost,
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const isAnimatingRef = useRef(false);

  // Normalize slides whether they are strings or slide objects ({ asset, src, slideType, isVideo, mimeType, assetType })
  const rawSlides = useMemo(() => {
    if (!post) return [];
    return Array.isArray(post.slideObjects) && post.slideObjects.length > 0
      ? post.slideObjects
      : Array.isArray(post.slides)
      ? post.slides
      : [];
  }, [post]);

  const normalizedSlides = useMemo(() => {
    return rawSlides
      .map((s) => {
        if (typeof s === "string") {
          const isVid = isVideoSrc(s, null, post, rawSlides.length);
          return { src: s, slideType: isVid ? "video" : "image", isVideo: isVid };
        }
        const url = s?.src || s?.asset || "";
        const isVid = isVideoSrc(url, s, post, rawSlides.length);
        return { ...s, src: url, slideType: isVid ? "video" : "image", isVideo: isVid };
      })
      .filter((s) => Boolean(s.src));
  }, [rawSlides, post]);

  const primaryMediaUrl =
    post?.src || post?.asset || post?.videoSrc || normalizedSlides[0]?.src || "";

  const effectiveSlides = useMemo(() => {
    if (normalizedSlides.length > 0) return normalizedSlides;
    if (primaryMediaUrl) {
      return [
        {
          src: primaryMediaUrl,
          slideType: isVideoSrc(primaryMediaUrl, null, post, 1) ? "video" : "image",
          isVideo: isVideoSrc(primaryMediaUrl, null, post, 1),
        },
      ];
    }
    return [];
  }, [normalizedSlides, primaryMediaUrl, post]);

  const isCarousel =
    (post?.type === "carousel" || effectiveSlides.length > 1) &&
    effectiveSlides.length > 1;

  const activeSlideObj = isCarousel
    ? effectiveSlides[activeSlide] || effectiveSlides[0]
    : effectiveSlides[0] || { src: primaryMediaUrl };

  const currentSlideSrc = activeSlideObj?.src || primaryMediaUrl;

  const currentIsVideo =
    isVideoSrc(currentSlideSrc, activeSlideObj, post, effectiveSlides.length) ||
    post?.slideTypes?.[activeSlide] === "video";

  const ambientImageSrc = !currentIsVideo ? currentSlideSrc : post?.ogImage || post?.image || null;

  // Reset active slide on post change (or initialize to targetSlideIndex for isolated videos)
  useEffect(() => {
    if (typeof post?.targetSlideIndex === "number") {
      setActiveSlide(post.targetSlideIndex);
    } else {
      setActiveSlide(0);
    }
  }, [post?.id, post?.targetSlideIndex]);

  const goToSlide = useCallback((targetIndex) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setActiveSlide(targetIndex);
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 460);
  }, []);

  const stopAllVideos = useCallback(() => {
    if (typeof document !== "undefined") {
      const videos = document.querySelectorAll(
        ".gallery-modal-video video, .gallery-modal-media video, .gallery-modal-backdrop video, .gallery-carousel-viewport video"
      );
      videos.forEach((v) => {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {}
      });
    }
  }, []);

  // Stop all playback immediately on unmount (Req #8)
  useEffect(() => {
    return () => {
      stopAllVideos();
    };
  }, [stopAllVideos]);

  const handlePrevPost = useCallback((e) => {
    if (e) e.stopPropagation();
    stopAllVideos();
    if (onPrev) onPrev();
  }, [stopAllVideos, onPrev]);

  const handleNextPost = useCallback((e) => {
    if (e) e.stopPropagation();
    stopAllVideos();
    if (onNext) onNext();
  }, [stopAllVideos, onNext]);

  const handleClose = useCallback(() => {
    stopAllVideos();
    if (onClose) onClose();
  }, [stopAllVideos, onClose]);

  const handlePrevSlide = useCallback((e) => {
    if (e) e.stopPropagation();
    if (isAnimatingRef.current || effectiveSlides.length === 0) return;
    stopAllVideos();
    setActiveSlide((prev) => {
      isAnimatingRef.current = true;
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 460);
      return prev > 0 ? prev - 1 : effectiveSlides.length - 1;
    });
  }, [effectiveSlides.length, stopAllVideos]);

  const handleNextSlide = useCallback((e) => {
    if (e) e.stopPropagation();
    if (isAnimatingRef.current || effectiveSlides.length === 0) return;
    stopAllVideos();
    setActiveSlide((prev) => {
      isAnimatingRef.current = true;
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 460);
      return prev < effectiveSlides.length - 1 ? prev + 1 : 0;
    });
  }, [effectiveSlides.length, stopAllVideos]);

  const handleTouchStart = (e) => {
    if (!e.touches?.[0]) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (touchStartXRef.current === null || !e.touches?.[0]) return;
    touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (touchStartXRef.current === null) return;
    const delta = touchDeltaXRef.current;
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
    if (delta < -40) {
      handleNextSlide();
    } else if (delta > 40) {
      handlePrevSlide();
    }
  };

  const [socialOptions, setSocialOptions] = useState(
    cachedSocialLinks || FALLBACK_GALLERY_SOCIALS
  );

  // Fetch gallery-eligible social links once and cache
  useEffect(() => {
    if (cachedSocialLinks) return;
    fetch("/api/social-links")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const eligible =
          Array.isArray(data.galleryEligible) && data.galleryEligible.length > 0
            ? data.galleryEligible
            : Array.isArray(data.artist) && data.artist.length > 0
            ? data.artist
            : null;
        if (eligible && eligible.length > 0) {
          cachedSocialLinks = eligible;
          setSocialOptions(eligible);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch gallery social links:", err);
      });
  }, []);

  const { events } = useChomkaStore();
  const taggedEvent = useMemo(() => {
    if (!post?.id || !Array.isArray(events)) return null;
    return events.find((e) => Array.isArray(e.tagged_gallery_post_ids) && e.tagged_gallery_post_ids.map(String).includes(String(post.id)));
  }, [post?.id, events]);

  // Pick random social link with session anti-repeat logic (Req #22: per-post assigned links support)
  const selectedSocial = useMemo(() => {
    const assigned = post?.assignedSocials || post?.tags?.assignedSocials;
    let list;
    if (Array.isArray(assigned) && assigned.length > 0) {
      const matched = socialOptions.filter(
        (s) =>
          assigned.includes(s.url) ||
          assigned.includes(s.platform) ||
          assigned.includes(s.name)
      );
      list = matched.length > 0 ? matched : assigned.map((item) => ({
        name: normalizePlatformName(item),
        url: String(item).startsWith("http") ? item : `https://${item}`,
      }));
    } else {
      list = socialOptions.length > 0 ? socialOptions : FALLBACK_GALLERY_SOCIALS;
    }

    const candidates =
      list.length > 1
        ? list.filter((s) => s.url !== lastSelectedSocialUrl)
        : list;
    const pick =
      candidates[Math.floor(Math.random() * candidates.length)] || list[0];
    lastSelectedSocialUrl = pick.url;
    return pick;
  }, [post?.id, post?.assignedSocials, post?.tags, socialOptions]);

  /* Keyboard navigation (Escape, ArrowLeft, ArrowRight) */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft") {
        if (isCarousel && effectiveSlides.length > 1) {
          handlePrevSlide();
        } else if (hasPrev) {
          handlePrevPost();
        }
      } else if (e.key === "ArrowRight") {
        if (isCarousel && effectiveSlides.length > 1) {
          handleNextSlide();
        } else if (hasNext) {
          handleNextPost();
        }
      }
    },
    [handleClose, handlePrevSlide, handleNextSlide, handlePrevPost, handleNextPost, hasPrev, hasNext, isCarousel, effectiveSlides.length]
  );

  // Body scroll lock on modal mount / clean restore on unmount
  useEffect(() => {
    if (embedded) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [embedded]);

  // Keydown listener
  useEffect(() => {
    if (embedded) return undefined;
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, embedded]);

  const location = useLocation();

  const postLocation = useMemo(() => {
    if (!post) return null;
    if (post.location && typeof post.location === "string" && post.location.trim()) {
      return post.location.trim();
    }
    if (post.tags && typeof post.tags === "object" && !Array.isArray(post.tags) && post.tags.location) {
      return String(post.tags.location).trim();
    }
    return null;
  }, [post?.location, post?.tags]);

  const postIsoDate = useMemo(() => {
    return extractPostIsoDate(post);
  }, [post?.date, post?.post_date, post?.displayDate]);

  const savedCal = useMemo(() => getSavedCalendarState(), []);
  const effectiveViewMode = useMemo(() => {
    const raw = location?.state?.viewMode || savedCal?.viewMode || "GRID";
    return String(raw).toUpperCase() === "TIMELINE" ? "TIMELINE" : "GRID";
  }, [location?.state?.viewMode, savedCal]);

  const calendarUrl = useMemo(() => {
    const d = postIsoDate ? new Date(postIsoDate) : null;
    const validDate = d && !isNaN(d.getTime()) ? d : null;
    return buildCalendarUrl({
      viewMode: effectiveViewMode,
      currentDate: validDate,
      selectedDateStr: postIsoDate || null,
      actId: `gal-${post?.id || post?.slug || ""}`,
    });
  }, [effectiveViewMode, postIsoDate, post?.id, post?.slug]);

  const formattedDate = useMemo(() => {
    return formatGalleryDate(post?.displayDate || post?.date || post?.post_date);
  }, [post?.displayDate, post?.date, post?.post_date]);

  if (!post) return null;

  const externalSocialUrl = post.externalSocialUrl || post.external_social_url || null;
  const externalSocialPlatform = post.externalSocialPlatform || post.external_social_platform || null;

  const shareUrl = absoluteUrl(`/gallery/${post.id}`);

  const dialog = (
    <div
      className={`gallery-modal-dialog ${embedded ? "is-embedded" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {!embedded && (
        <button
          type="button"
          className="gallery-modal-close"
          onClick={handleClose}
          aria-label="Close post viewer"
          title="Close viewer (Esc)"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      <div className="gallery-modal-content">
        {/* ===============================================
            MEDIA VIEWER AREA (Req #11 & #15)
            =============================================== */}
        <div className="gallery-modal-media">
          {isCarousel ? (
            <div
              className={`gallery-carousel-wrapper ${currentIsVideo ? "has-video-active" : ""}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="gallery-carousel-viewport">
                <div
                  className="gallery-carousel-track"
                  style={{
                    transform: `translateX(-${activeSlide * 100}%)`,
                    transition: isSwiping ? "none" : "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                >
                  {effectiveSlides.map((slide, idx) => {
                    const isVid = slide.isVideo || slide.slideType === "video";
                    return (
                      <div key={idx} className="gallery-carousel-slide">
                        {isVid ? (
                          <GalleryVideoPlayer
                            src={slide.src}
                            isActive={idx === activeSlide}
                            className="gallery-modal-video"
                          />
                        ) : (
                          <img
                            src={slide.src}
                            alt={`${post.title || "Gallery post"} slide ${idx + 1}`}
                            className="gallery-modal-image"
                            loading="eager"
                            decoding="async"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Carousel Navigation Arrows with Animation Lockout (Req #3) */}
              <button
                type="button"
                className="carousel-slide-btn carousel-prev"
                onClick={handlePrevSlide}
                aria-label="Previous slide"
                title="Previous slide"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                type="button"
                className="carousel-slide-btn carousel-next"
                onClick={handleNextSlide}
                aria-label="Next slide"
                title="Next slide"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Carousel Pagination Indicator & Dots */}
              <div className="carousel-dots">
                {effectiveSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`carousel-dot ${
                      idx === activeSlide ? "is-active" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      stopAllVideos();
                      goToSlide(idx);
                    }}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div
                className="carousel-counter-badge"
                aria-label={`Slide ${activeSlide + 1} of ${effectiveSlides.length}`}
              >
                <span className="counter-num">
                  {String(activeSlide + 1).padStart(2, "0")}
                </span>
                <span className="counter-sep">/</span>
                <span className="counter-total">
                  {String(effectiveSlides.length).padStart(2, "0")}
                </span>
              </div>
            </div>
          ) : currentSlideSrc ? (
            currentIsVideo ? (
              <GalleryVideoPlayer
                key={currentSlideSrc}
                src={currentSlideSrc}
                isActive={true}
                className="gallery-modal-video"
              />
            ) : (
              <img
                src={currentSlideSrc}
                alt={post.title || "Archive post visual"}
                className="gallery-modal-image"
              />
            )
          ) : externalSocialUrl ? (
            <div style={{ padding: "24px", width: "100%" }}>
              <SocialPostEmbed
                url={externalSocialUrl}
                platform={externalSocialPlatform}
                previewImage={primaryMediaUrl || "/og-image.png"}
                title={post.title || post.caption}
              />
            </div>
          ) : null}
        </div>

        {/* ===============================================
            POST INFO & CAPTION SIDEBAR (Swaggy Editorial Style)
            =============================================== */}
        <div className="gallery-modal-sidebar gallery-modal-sidebar-swag">
          {/* Header / Author & Creator Identity */}
          <div className="gallery-sidebar-header">
            <div className="gallery-author-info">
              <div className="gallery-author-avatar-crest">
                <span className="gallery-avatar-inner">SC</span>
                <span className="gallery-avatar-glow" />
              </div>
              <div className="gallery-author-meta">
                <div className="gallery-author-name">
                  <span className="gallery-author-brand">silachomka</span>
                  <span
                    className="gallery-verified-badge"
                    title="Official chomkaMUSIC™ Artist"
                    aria-label="Official chomkaMUSIC™ Artist"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="gallery-brand-badge-pill">chomkaMUSIC™</span>
                </div>
                <div className="gallery-author-sub-row">
                  <span className="gallery-category-pill">
                    {post.category || "VISUAL ARCHIVE"}
                  </span>
                  {postLocation && (
                    <div
                      className="gallery-editorial-location"
                      title={`Captured in ${postLocation}`}
                    >
                      <svg
                        className="location-marker-glyph"
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="location-name">{postLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date as Functional Calendar Gateway */}
          <Link
            to={calendarUrl}
            state={{
              from: "gallery",
              viewMode: effectiveViewMode,
              actId: `gal-${post.id || post.slug}`,
              selectedDateStr: postIsoDate,
            }}
            className="gallery-date-gateway"
            title="Explore this milestone in Chomka Calendar"
            aria-label={`View ${formattedDate} in Chomka Calendar`}
            onClick={() => {
              if (onClose) onClose();
            }}
          >
            <div className="date-gateway-left">
              <span className="date-gateway-icon" aria-hidden="true">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span className="date-gateway-text">{formattedDate}</span>
            </div>
            <div className="date-gateway-right">
              <span className="date-gateway-pill">CALENDAR</span>
              <span className="date-gateway-arrow" aria-hidden="true">↗</span>
            </div>
          </Link>

          {/* Editorial Spec Strip */}
          <div className="gallery-editorial-specs">
            <div className="gallery-spec-chip">
              <span className="gallery-spec-dot" />
              <span>{isCarousel ? `CAROUSEL · ${effectiveSlides.length} CUTS` : currentIsVideo ? "4K MASTER SHORT" : "HI-RES ARCHIVE STILL"}</span>
            </div>
            <div className="gallery-spec-chip">
              <span>{currentIsVideo ? "🔊 24-BIT MASTER" : "📸 CHOMKA VAULT"}</span>
            </div>
            <div className="gallery-spec-chip gallery-spec-chip-gold">
              <span>OFFICIAL</span>
            </div>
          </div>

          {/* Scrollable Caption Body */}
          <div className="gallery-sidebar-body">
            {post.isIsolatedVideo && post.parentPost && (
              <div style={{ marginBottom: "14px" }}>
                <button
                  type="button"
                  className="studio-pill-btn"
                  onClick={() => {
                    if (onSelectPost) {
                      onSelectPost({ ...post.parentPost, targetSlideIndex: post.targetSlideIndex });
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(223, 194, 125, 0.12)",
                    border: "1px solid rgba(223, 194, 125, 0.4)",
                    color: "var(--gold)",
                    padding: "7px 14px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  <span aria-hidden="true">⧉</span>
                  <span>
                    View in Full Carousel Post (Slide {(post.targetSlideIndex ?? 0) + 1} of {post.totalSlides || 1}) →
                  </span>
                </button>
              </div>
            )}

            {post.title && <h3 className="gallery-modal-title gallery-title-swag">{post.title}</h3>}

            <div className="gallery-modal-caption gallery-caption-swag">
              {post.caption?.split("\n\n").map((para, idx) => (
                <p key={idx}>
                  {para.split(/(\s+)/).map((word, wIdx) => {
                    if (word.startsWith("#") && word.length > 1) {
                      return <span key={wIdx} className="gallery-swag-hashtag">{word}</span>;
                    }
                    if (word.startsWith("@") && word.length > 1) {
                      return <span key={wIdx} className="gallery-swag-mention">{word}</span>;
                    }
                    return word;
                  })}
                </p>
              )) || <p>{post.caption}</p>}
            </div>

            {/* External Social Post Embed / Fallback Card (Req #18) */}
            {externalSocialUrl && (
              <div style={{ marginTop: "14px" }}>
                <SocialPostEmbed
                  url={externalSocialUrl}
                  platform={externalSocialPlatform}
                  previewImage={!currentIsVideo ? currentSlideSrc : null}
                  title={post.title || post.caption}
                />
              </div>
            )}

            {/* Tags */}
            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <div className="gallery-modal-tags">
                {post.tags.map((tag, idx) => (
                  <span key={idx} className="gallery-modal-tag gallery-tag-swag">
                    #{String(tag).replace(/^#/, "")}
                  </span>
                ))}
              </div>
            )}

            {/* Tagged Live Event Badge */}
            {taggedEvent && (
              <div style={{ marginTop: "14px", marginBottom: "10px" }}>
                <Link
                  to={`/events/${taggedEvent.slug}`}
                  onClick={onClose}
                  className="gallery-tagged-event-card"
                >
                  <span className="gallery-ticket-icon">🎟️</span>
                  <div className="gallery-tagged-event-info">
                    <span className="gallery-tagged-event-eyebrow">CAPTURED LIVE AT</span>
                    <span className="gallery-tagged-event-title">{taggedEvent.title}</span>
                  </div>
                  <span className="gallery-tagged-event-arrow">→</span>
                </Link>
              </div>
            )}
          </div>

          {/* Footer / Connected Link */}
          <div className="gallery-sidebar-footer gallery-footer-swag">
            <ShareLinkBox url={shareUrl} />
            {post.link && post.link.startsWith("/") ? (
              <Link
                to={post.link}
                className="gallery-modal-cta-btn gallery-cta-swag"
                onClick={onClose}
              >
                <span>OPEN PROJECT ARCHIVE</span>
                <RightArrowIcon size={14} />
              </Link>
            ) : externalSocialUrl ? (
              <a
                href={externalSocialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-modal-cta-btn gallery-cta-swag"
              >
                <span>VIEW ON {normalizePlatformName(externalSocialPlatform || "Social").toUpperCase()}</span>
                <UpRightArrowIcon size={14} />
              </a>
            ) : selectedSocial ? (
              <a
                href={selectedSocial.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-modal-cta-btn gallery-cta-swag"
                aria-label={`Follow silachomka on ${normalizePlatformName(
                  selectedSocial.name || selectedSocial.platform
                )}`}
              >
                <span>FOLLOW ON {normalizePlatformName(selectedSocial.name || selectedSocial.platform).toUpperCase()}</span>
                <UpRightArrowIcon size={14} />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="gallery-embedded-shell">
        {(ambientImageSrc || (currentIsVideo && currentSlideSrc)) && (
          <div className="product-ambient-backdrop" aria-hidden="true">
            {ambientImageSrc ? (
              <div
                className="ambient-image-layer"
                style={{ backgroundImage: `url(${ambientImageSrc})` }}
              />
            ) : (
              <video
                className="ambient-video-layer"
                src={currentSlideSrc}
                muted
                playsInline
                preload="metadata"
              />
            )}
            <div className="ambient-gradient-overlay" />
          </div>
        )}
        {/* Schema.org JSON-LD (Req #13: ImageObject & BreadcrumbList) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "ImageObject",
                "@id": `${canonicalUrl(`/gallery/${post.id || post.slug}`)}#image`,
                name: post.title || post.caption || "silachomka visual archive",
                description: post.caption || post.title || "Visual archive post by silachomka",
                contentUrl: absoluteUrl(currentSlideSrc || post.asset || post.src || "/og-image.png"),
                author: {
                  "@type": "Person",
                  name: "silachomka",
                  url: canonicalUrl("/"),
                },
                ...(post.location ? {
                  contentLocation: {
                    "@type": "Place",
                    name: post.location,
                  },
                } : {}),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: canonicalUrl("/"),
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Gallery",
                    item: canonicalUrl("/#gallery"),
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: post.title || "Archive Post",
                    item: canonicalUrl(`/gallery/${post.id || post.slug}`),
                  },
                ],
              },
            ],
          }),
        }}
      />

      {dialog}
      </div>
    );
  }

  return (
    <div
      className="gallery-modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {(ambientImageSrc || (currentIsVideo && currentSlideSrc)) && (
        <div className="product-ambient-backdrop" aria-hidden="true">
          {ambientImageSrc ? (
            <div
              className="ambient-image-layer"
              style={{ backgroundImage: `url(${ambientImageSrc})` }}
            />
          ) : (
            <video
              src={currentSlideSrc}
              muted
              playsInline
              autoPlay
              loop
              className="ambient-video-layer"
            />
          )}
          <div className="ambient-gradient-overlay" />
        </div>
      )}

      {/* Outside Post Navigation Controls (Req #7) */}
      {!embedded && hasPrev && (
        <button
          type="button"
          className="gallery-modal-post-nav gallery-modal-post-prev"
          onClick={handlePrevPost}
          aria-label="Previous post"
          title="Previous post"
        >
          <span className="post-nav-arrow">←</span>
          <span className="post-nav-text">Prev Post</span>
        </button>
      )}

      {!embedded && hasNext && (
        <button
          type="button"
          className="gallery-modal-post-nav gallery-modal-post-next"
          onClick={handleNextPost}
          aria-label="Next post"
          title="Next post"
        >
          <span className="post-nav-text">Next Post</span>
          <span className="post-nav-arrow">→</span>
        </button>
      )}

      {/* Schema.org JSON-LD (Req #13: ImageObject & BreadcrumbList) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "ImageObject",
                "@id": `${canonicalUrl(`/gallery/${post.id || post.slug}`)}#image`,
                name: post.title || post.caption || "silachomka visual archive",
                description: post.caption || post.title || "Visual archive post by silachomka",
                contentUrl: absoluteUrl(currentSlideSrc || post.asset || post.src || "/og-image.png"),
                author: {
                  "@type": "Person",
                  name: "silachomka",
                  url: canonicalUrl("/"),
                },
                ...(post.location ? {
                  contentLocation: {
                    "@type": "Place",
                    name: post.location,
                  },
                } : {}),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: canonicalUrl("/"),
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Gallery",
                    item: canonicalUrl("/#gallery"),
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: post.title || "Archive Post",
                    item: canonicalUrl(`/gallery/${post.id || post.slug}`),
                  },
                ],
              },
            ],
          }),
        }}
      />

      {dialog}
    </div>
  );
}

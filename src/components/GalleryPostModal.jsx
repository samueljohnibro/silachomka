import { UpRightArrowIcon, RightArrowIcon } from "../components/Icons";
// src/components/GalleryPostModal.jsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import ShareLinkBox from "./ShareLinkBox";
import SocialPostEmbed from "./SocialPostEmbed";
import GalleryVideoPlayer from "./GalleryVideoPlayer";
import { absoluteUrl, canonicalUrl, DEFAULT_SOURCE } from "../data/credits";
import { formatGalleryDate } from "../utils/dateFormatter";

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
        >
          <svg
            width="14"
            height="14"
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
              className="gallery-carousel-wrapper"
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
              >
                ‹
              </button>

              <button
                type="button"
                className="carousel-slide-btn carousel-next"
                onClick={handleNextSlide}
                aria-label="Next slide"
              >
                ›
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

              <div className="carousel-counter-badge">
                {activeSlide + 1}/{effectiveSlides.length}
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
            POST INFO & CAPTION SIDEBAR
            =============================================== */}
        <div className="gallery-modal-sidebar">
          {/* Header / Author */}
          <div className="gallery-sidebar-header">
            <div className="gallery-author-info">
              <div className="gallery-author-avatar">s</div>
              <div>
                <div className="gallery-author-name">
                  <span>silachomka</span>
                  <span
                    className="gallery-verified-badge"
                    title="Official Archive"
                    aria-label="Official Archive"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </div>
                <span className="gallery-author-sub">
                  {post.category} · Source: {post.source || DEFAULT_SOURCE}
                </span>
                {post.location && (
                  <span className="gallery-modal-location" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--gold)", fontSize: "11px", marginTop: "2px" }}>
                    <span aria-hidden="true">📍</span> {post.location}
                  </span>
                )}
              </div>
            </div>
            <span className="gallery-modal-date">
              {formatGalleryDate(post.displayDate || post.date)}
            </span>
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
                    padding: "7px 12px",
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

            {post.title && <h3 className="gallery-modal-title">{post.title}</h3>}

            <div className="gallery-modal-caption">
              {post.caption?.split("\n\n").map((para, idx) => (
                <p key={idx}>{para}</p>
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
                  <span key={idx} className="gallery-modal-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Tagged Live Event Badge */}
            {taggedEvent && (
              <div style={{ marginTop: "12px", marginBottom: "8px" }}>
                <Link
                  to={`/events/${taggedEvent.slug}`}
                  onClick={onClose}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(212, 175, 55, 0.12)",
                    border: "1px solid rgba(212, 175, 55, 0.4)",
                    color: "var(--gold)",
                    borderRadius: "999px",
                    padding: "5px 12px",
                    fontSize: "12px",
                    textDecoration: "none",
                    fontWeight: "600"
                  }}
                >
                  🎟️ Captured Live at: {taggedEvent.title} →
                </Link>
              </div>
            )}
          </div>

          {/* Footer / Connected Link */}
          <div className="gallery-sidebar-footer">
            <ShareLinkBox url={shareUrl} />
            {post.link && post.link.startsWith("/") ? (
              <Link
                to={post.link}
                className="gallery-modal-cta-btn"
                onClick={onClose}
              >
                Open Release Project <RightArrowIcon size={14} />
              </Link>
            ) : externalSocialUrl ? (
              <a
                href={externalSocialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-modal-cta-btn"
              >
                View Original on{" "}
                {normalizePlatformName(externalSocialPlatform || "Social")}{" "}
                <UpRightArrowIcon size={14} />
              </a>
            ) : selectedSocial ? (
              <a
                href={selectedSocial.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gallery-modal-cta-btn"
                aria-label={`Follow silachomka on ${normalizePlatformName(
                  selectedSocial.name || selectedSocial.platform
                )}`}
              >
                Follow on {normalizePlatformName(selectedSocial.name || selectedSocial.platform)} <UpRightArrowIcon size={14} />
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

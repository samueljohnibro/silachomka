import { UpRightArrowIcon, RightArrowIcon } from "../components/Icons";
// src/components/GalleryPostModal.jsx

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import ShareLinkBox from "./ShareLinkBox";
import SocialPostEmbed from "./SocialPostEmbed";
import GalleryVideoPlayer from "./GalleryVideoPlayer";
import { absoluteUrl, DEFAULT_SOURCE } from "../data/credits";
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
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);

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
      setActiveSlide((prev) => (prev < effectiveSlides.length - 1 ? prev + 1 : 0));
    } else if (delta > 40) {
      setActiveSlide((prev) => (prev > 0 ? prev - 1 : effectiveSlides.length - 1));
    }
  };
  const [prevPostId, setPrevPostId] = useState(post?.id);
  const [socialOptions, setSocialOptions] = useState(
    cachedSocialLinks || FALLBACK_GALLERY_SOCIALS
  );

  if (post?.id !== prevPostId) {
    setPrevPostId(post?.id);
    setActiveSlide(0);
  }

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

  // Pick random social link with session anti-repeat logic
  const selectedSocial = useMemo(() => {
    const list =
      socialOptions.length > 0 ? socialOptions : FALLBACK_GALLERY_SOCIALS;
    const candidates =
      list.length > 1
        ? list.filter((s) => s.url !== lastSelectedSocialUrl)
        : list;
    const pick =
      candidates[Math.floor(Math.random() * candidates.length)] || list[0];
    lastSelectedSocialUrl = pick.url;
    return pick;
  }, [post?.id, socialOptions]);

  /* Keyboard navigation (Escape, ArrowLeft, ArrowRight) */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        if (isCarousel && effectiveSlides.length > 1) {
          setActiveSlide((prev) => (prev > 0 ? prev - 1 : effectiveSlides.length - 1));
        } else if (hasPrev) {
          onPrev();
        }
      } else if (e.key === "ArrowRight") {
        if (isCarousel && effectiveSlides.length > 1) {
          setActiveSlide((prev) => (prev < effectiveSlides.length - 1 ? prev + 1 : 0));
        } else if (hasNext) {
          onNext();
        }
      }
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    if (embedded) return undefined;
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown, embedded]);

  if (!post) return null;

  // Normalize slides whether they are strings or slide objects ({ asset, src, slideType, isVideo, mimeType, assetType })
  const rawSlides =
    Array.isArray(post.slideObjects) && post.slideObjects.length > 0
      ? post.slideObjects
      : Array.isArray(post.slides)
      ? post.slides
      : [];
  const normalizedSlides = rawSlides
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

  const primaryMediaUrl =
    post.src || post.asset || post.videoSrc || normalizedSlides[0]?.src || "";
  const effectiveSlides =
    normalizedSlides.length > 0
      ? normalizedSlides
      : primaryMediaUrl
      ? [
          {
            src: primaryMediaUrl,
            slideType: isVideoSrc(primaryMediaUrl, null, post, 1) ? "video" : "image",
            isVideo: isVideoSrc(primaryMediaUrl, null, post, 1),
          },
        ]
      : [];

  const isCarousel =
    (post.type === "carousel" || effectiveSlides.length > 1) &&
    effectiveSlides.length > 1;
  const activeSlideObj = isCarousel
    ? effectiveSlides[activeSlide] || effectiveSlides[0]
    : effectiveSlides[0] || { src: primaryMediaUrl };
  const currentSlideSrc = activeSlideObj?.src || primaryMediaUrl;
  const currentIsVideo =
    isVideoSrc(currentSlideSrc, activeSlideObj, post, effectiveSlides.length) ||
    post.slideTypes?.[activeSlide] === "video";
  const ambientImageSrc = !currentIsVideo ? currentSlideSrc : post.ogImage || post.image || null;

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
          onClick={onClose}
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

      {!embedded && hasPrev && (
        <button
          type="button"
          className="gallery-modal-nav gallery-modal-nav-prev"
          onClick={onPrev}
          aria-label="Previous post"
        >
          ‹
        </button>
      )}

      {!embedded && hasNext && (
        <button
          type="button"
          className="gallery-modal-nav gallery-modal-nav-next"
          onClick={onNext}
          aria-label="Next post"
        >
          ›
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
                    transition: isSwiping ? "none" : "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
                  }}
                >
                  {effectiveSlides.map((slide, idx) => {
                    const isVid = slide.isVideo || slide.slideType === "video";
                    return (
                      <div key={idx} className="gallery-carousel-slide">
                        {isVid ? (
                          <GalleryVideoPlayer
                            src={slide.src}
                            className="gallery-modal-video"
                          />
                        ) : (
                          <img
                            src={slide.src}
                            alt={`${post.title || "Gallery post"} slide ${idx + 1}`}
                            className="gallery-modal-image"
                            loading={idx === 0 ? "eager" : "lazy"}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Carousel Navigation Arrows */}
              <button
                type="button"
                className="carousel-slide-btn carousel-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((prev) =>
                    prev > 0 ? prev - 1 : effectiveSlides.length - 1
                  );
                }}
                aria-label="Previous slide"
              >
                ‹
              </button>

              <button
                type="button"
                className="carousel-slide-btn carousel-next"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide((prev) =>
                    prev < effectiveSlides.length - 1 ? prev + 1 : 0
                  );
                }}
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
                      setActiveSlide(idx);
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
              </div>
            </div>
            <span className="gallery-modal-date">
              {formatGalleryDate(post.displayDate || post.date)}
            </span>
          </div>

          {/* Scrollable Caption Body */}
          <div className="gallery-sidebar-body">
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
        {dialog}
      </div>
    );
  }

  return (
    <div
      className="gallery-modal-backdrop"
      onClick={onClose}
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
      {dialog}
    </div>
  );
}

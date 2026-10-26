import { UpRightArrowIcon, RightArrowIcon } from "../components/Icons";
// src/components/GalleryPostModal.jsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import ShareLinkBox from "./ShareLinkBox";
import SocialPostEmbed from "./SocialPostEmbed";
import { absoluteUrl, DEFAULT_SOURCE } from "../data/credits";
import { formatGalleryDate } from "../utils/dateFormatter";

function isVideoSrc(src, slideObj, post) {
  if (slideObj?.isVideo || slideObj?.slideType === "video" || slideObj?.assetType === "VIDEO") {
    return true;
  }
  if (!slideObj && (post?.isVideo || post?.type === "video" || post?.assetType === "VIDEO")) {
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
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext) {
        onNext();
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

  // Normalize slides whether they are strings or slide objects ({ asset, src, slideType })
  const rawSlides = Array.isArray(post.slides) ? post.slides : [];
  const normalizedSlides = rawSlides
    .map((s) => {
      if (typeof s === "string") return { src: s, slideType: isVideoSrc(s, null, null) ? "video" : "image" };
      const url = s?.src || s?.asset || "";
      return { ...s, src: url };
    })
    .filter((s) => Boolean(s.src));

  const primaryMediaUrl =
    post.src || post.asset || post.videoSrc || normalizedSlides[0]?.src || "";
  const effectiveSlides =
    normalizedSlides.length > 0
      ? normalizedSlides
      : primaryMediaUrl
      ? [{ src: primaryMediaUrl, slideType: post.type === "video" ? "video" : "image", isVideo: post.isVideo }]
      : [];

  const isCarousel =
    (post.type === "carousel" || effectiveSlides.length > 1) &&
    effectiveSlides.length > 1;
  const activeSlideObj = isCarousel
    ? effectiveSlides[activeSlide] || effectiveSlides[0]
    : effectiveSlides[0] || { src: primaryMediaUrl };
  const currentSlideSrc = activeSlideObj?.src || primaryMediaUrl;
  const currentIsVideo =
    isVideoSrc(currentSlideSrc, activeSlideObj, post) ||
    post.slideTypes?.[activeSlide] === "video";

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
            MEDIA VIEWER AREA (Req #17 & #18)
            =============================================== */}
        <div className="gallery-modal-media">
          {isCarousel ? (
            <div className="gallery-carousel-wrapper">
              {currentIsVideo ? (
                <video
                  key={currentSlideSrc}
                  src={currentSlideSrc}
                  controls
                  autoPlay
                  playsInline
                  loop
                  className="gallery-modal-video"
                />
              ) : (
                <img
                  key={currentSlideSrc}
                  src={currentSlideSrc}
                  alt={`${post.title || "Gallery post"} slide ${activeSlide + 1}`}
                  className="gallery-modal-image"
                />
              )}

              {/* Carousel Navigation Arrows */}
              <button
                type="button"
                className="carousel-slide-btn carousel-prev"
                onClick={() =>
                  setActiveSlide((prev) =>
                    prev > 0 ? prev - 1 : effectiveSlides.length - 1
                  )
                }
                aria-label="Previous slide"
              >
                ‹
              </button>

              <button
                type="button"
                className="carousel-slide-btn carousel-next"
                onClick={() =>
                  setActiveSlide((prev) =>
                    prev < effectiveSlides.length - 1 ? prev + 1 : 0
                  )
                }
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
                    onClick={() => setActiveSlide(idx)}
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
              <video
                src={currentSlideSrc}
                controls
                autoPlay
                playsInline
                loop
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
    return <div className="gallery-embedded-shell">{dialog}</div>;
  }

  return (
    <div
      className="gallery-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {dialog}
    </div>
  );
}

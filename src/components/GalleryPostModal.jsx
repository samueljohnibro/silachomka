// src/components/GalleryPostModal.jsx

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ShareLinkBox from "./ShareLinkBox";
import { absoluteUrl, DEFAULT_SOURCE } from "../data/credits";

function isVideoSrc(src) {
  if (!src || typeof src !== "string") return false;
  if (src.startsWith("data:video/")) return true;
  const ext = src.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov", "m4v"].includes(ext);
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

  if (post?.id !== prevPostId) {
    setPrevPostId(post?.id);
    setActiveSlide(0);
  }

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

  const slides = post.slides || [post.src || post.videoSrc];
  const isCarousel = (post.type === "carousel" || slides.length > 1) && slides.length > 1;
  const currentSlideSrc = isCarousel ? slides[activeSlide] : (post.videoSrc || post.src);
  const currentIsVideo =
    post.type === "video" ||
    Boolean(post.videoSrc) ||
    isVideoSrc(currentSlideSrc) ||
    post.slideTypes?.[activeSlide] === "video";

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
          ✕
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
              MEDIA VIEWER AREA
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
                    alt={`${post.title} slide ${activeSlide + 1}`}
                    className="gallery-modal-image"
                  />
                )}

                {/* Carousel Navigation Arrows */}
                <button
                  type="button"
                  className="carousel-slide-btn carousel-prev"
                  onClick={() =>
                    setActiveSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))
                  }
                  aria-label="Previous slide"
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="carousel-slide-btn carousel-next"
                  onClick={() =>
                    setActiveSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0))
                  }
                  aria-label="Next slide"
                >
                  ›
                </button>

                {/* Carousel Pagination Indicator & Dots */}
                <div className="carousel-dots">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`carousel-dot ${idx === activeSlide ? "is-active" : ""}`}
                      onClick={() => setActiveSlide(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="carousel-counter-badge">
                  {activeSlide + 1}/{slides.length}
                </div>
              </div>
            ) : currentIsVideo ? (
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
            )}
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
                    <span className="gallery-verified-badge" title="Official Archive">✓</span>
                  </div>
                  <span className="gallery-author-sub">
                    {post.category} · Source: {post.source || DEFAULT_SOURCE}
                  </span>
                </div>
              </div>
              <span className="gallery-modal-date">{post.displayDate || post.date}</span>
            </div>

            {/* Scrollable Caption Body */}
            <div className="gallery-sidebar-body">
              {post.title && <h3 className="gallery-modal-title">{post.title}</h3>}
              
              <div className="gallery-modal-caption">
                {post.caption?.split("\n\n").map((para, idx) => (
                  <p key={idx}>{para}</p>
                )) || <p>{post.caption}</p>}
              </div>

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
              {post.link ? (
                <Link to={post.link} className="gallery-modal-cta-btn" onClick={onClose}>
                  Open Release Project →
                </Link>
              ) : (
                <a
                  href="https://www.instagram.com/silachomka/?__pwa=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gallery-modal-cta-btn"
                >
                  Follow on Instagram ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return <div className="gallery-embedded-shell">{dialog}</div>;
  }

  return (
    <div className="gallery-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      {dialog}
    </div>
  );
}

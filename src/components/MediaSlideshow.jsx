// src/components/MediaSlideshow.jsx

import { useEffect, useMemo, useState, useRef } from "react";

const DEFAULT_DURATION = 6000;
const FADE_DURATION = 1200;

const PAN_CLASSES = [
  "pan-left-to-right",
  "pan-right-to-left",
  "pan-top-to-bottom",
  "pan-bottom-to-top",
  "pan-diagonal-1",
  "pan-diagonal-2",
];

const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov", "m4v"];

function isVideoMedia(item, src) {
  if (!item) return false;
  if (item.type === "video" || item.kind === "video") return true;
  if (typeof src === "string") {
    if (src.startsWith("data:video/")) return true;
    const ext = src.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
    if (ext && VIDEO_EXTENSIONS.includes(ext)) return true;
  }
  return false;
}

function getMediaSrc(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.src || item.cover || item.video || item.url || item.slides?.[0] || "";
}

function getMediaAlt(item, index) {
  if (!item || typeof item === "string") return `Visual archive ${index + 1}`;
  return item.title || item.alt || item.caption || `Visual archive ${index + 1}`;
}

export default function MediaSlideshow({
  media = [],
  interval = DEFAULT_DURATION,
  className = "",
  ariaLabel = "Visual archive",
}) {
  const safeMedia = useMemo(
    () => (Array.isArray(media) ? media.filter(Boolean) : []),
    [media]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [panIndex, setPanIndex] = useState(0);
  const transitionTimerRef = useRef(null);

  /* Preload images */
  useEffect(() => {
    safeMedia.forEach((item) => {
      const src = getMediaSrc(item);
      if (src && !isVideoMedia(item, src)) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [safeMedia]);

  /* Slide rotation timer */
  useEffect(() => {
    if (safeMedia.length <= 1) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((current) => {
        setPrevIndex(current);
        const next = (current + 1) % safeMedia.length;
        setPanIndex((p) => (p + 1) % PAN_CLASSES.length);

        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = setTimeout(() => {
          setPrevIndex(null);
        }, FADE_DURATION);

        return next;
      });
    }, interval);

    return () => {
      clearInterval(timer);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [safeMedia.length, interval]);

  if (safeMedia.length === 0) return null;

  const currentPanClass = PAN_CLASSES[panIndex % PAN_CLASSES.length];

  return (
    <div
      className={`hero-slideshow ${className}`}
      role="region"
      aria-label={ariaLabel}
      aria-live="off"
    >
      {safeMedia.map((item, idx) => {
        const isActive = idx === activeIndex;
        const isPrev = idx === prevIndex;
        if (!isActive && !isPrev) return null;

        const src = getMediaSrc(item);
        const alt = getMediaAlt(item, idx);
        const isVideo = isVideoMedia(item, src);

        const activeClasses = isActive ? `is-active ${currentPanClass}` : "";
        const visibleOpacity = isActive ? 1 : 0;
        const layerZIndex = isActive ? 2 : 1;

        return (
          <div
            key={item.id || src || idx}
            className="hero-slideshow-slide"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: visibleOpacity,
              zIndex: layerZIndex,
              transition: `opacity ${FADE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              pointerEvents: "none",
            }}
          >
            {isVideo ? (
              <video
                src={src}
                poster={item.beat?.image || item.poster || undefined}
                autoPlay
                muted
                loop
                playsInline
                className={`hero-slideshow-media ${activeClasses}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 1,
                  filter: "brightness(0.72) contrast(1.08)",
                }}
              />
            ) : (
              <img
                src={src}
                alt={alt}
                className={`hero-slideshow-media ${activeClasses}`}
                style={{
                  position: "absolute",
                  inset: "-10%",
                  width: "120%",
                  height: "120%",
                  objectFit: "cover",
                  opacity: 1,
                  filter: "brightness(0.75) contrast(1.08)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
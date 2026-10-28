// src/components/MediaSlideshow.jsx

import { useEffect, useMemo, useState, useRef, useCallback } from "react";

const DEFAULT_DURATION = 6500;
const FADE_DURATION = 1400;

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
  if (item.type === "video" || item.kind === "video" || item.assetType === "VIDEO") return true;
  if (item.mimeType && String(item.mimeType).toLowerCase().startsWith("video/")) return true;
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

const GUARANTEED_FALLBACK = {
  id: "fallback-default",
  src: "/covers/noisemaker.jpg",
  title: "silachomka",
  type: "image",
};

/**
 * Preload an image or video asset off-DOM.
 * Resolves only when confirmed ready to render.
 */
function preloadAsset(src, isVideo) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error("Empty src"));

    if (isVideo) {
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;

      let settled = false;
      const onReady = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(src);
        }
      };
      const onError = (e) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(e);
        }
      };

      const cleanup = () => {
        v.removeEventListener("canplay", onReady);
        v.removeEventListener("loadeddata", onReady);
        v.removeEventListener("error", onError);
      };

      v.addEventListener("canplay", onReady);
      v.addEventListener("loadeddata", onReady);
      v.addEventListener("error", onError);
      v.src = src;
      v.load();

      // Safe timeout: if video takes > 8s, reject to let pipeline try next asset
      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error("Video preload timeout"));
        }
      }, 8000);
    } else {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = (e) => reject(e);
      img.src = src;
    }
  });
}

/**
 * MediaSlideshow (Stage 36 — Req #2: Absolutely No Blank Hero States)
 *
 * Implements a loaded-media pipeline:
 * VISIBLE MEDIA -> PRELOAD NEXT -> CONFIRMED READY -> CROSSFADE -> NEW VISIBLE MEDIA
 *
 * Guaranteed invariants:
 * - Current media remains 100% visible while next media loads.
 * - Never switches to an unloaded, broken, or pending source.
 * - Failed media is excluded and pipeline smoothly tries the next candidate.
 */
export default function MediaSlideshow({
  media = [],
  interval = DEFAULT_DURATION,
  className = "",
  ariaLabel = "Visual archive",
}) {
  const safeMedia = useMemo(() => {
    const list = Array.isArray(media) ? media.filter(Boolean) : [];
    return list.length > 0 ? list : [GUARANTEED_FALLBACK];
  }, [media]);

  const [currentMedia, setCurrentMedia] = useState(() => safeMedia[0] || GUARANTEED_FALLBACK);
  const [prevMedia, setPrevMedia] = useState(null);
  const [panIndex, setPanIndex] = useState(0);

  const currentMediaRef = useRef(currentMedia);
  currentMediaRef.current = currentMedia;

  const preloadedPoolRef = useRef(new Set());
  const failedPoolRef = useRef(new Set());
  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef(null);

  // Preload initial item immediately
  useEffect(() => {
    const initialSrc = getMediaSrc(safeMedia[0]);
    if (initialSrc) {
      preloadAsset(initialSrc, isVideoMedia(safeMedia[0], initialSrc))
        .then(() => {
          preloadedPoolRef.current.add(initialSrc);
        })
        .catch(() => {});
    }
  }, [safeMedia]);

  // Main Pipeline Engine: Preload Next -> Await Ready -> Crossfade
  useEffect(() => {
    if (safeMedia.length <= 1) return undefined;

    let isMounted = true;
    let timerId = null;

    const prepareAndTransition = async () => {
      if (!isMounted) return;

      const current = currentMediaRef.current;
      const currentSrc = getMediaSrc(current);

      // Filter available candidates (excluding current and failed)
      const validCandidates = safeMedia.filter((m) => {
        const s = getMediaSrc(m);
        return s && s !== currentSrc && !failedPoolRef.current.has(s);
      });

      const candidatesPool = validCandidates.length > 0 ? validCandidates : safeMedia;
      let nextItem = candidatesPool[Math.floor(Math.random() * candidatesPool.length)];
      let nextSrc = getMediaSrc(nextItem);

      // Preload the next item in the background
      try {
        if (!preloadedPoolRef.current.has(nextSrc)) {
          await preloadAsset(nextSrc, isVideoMedia(nextItem, nextSrc));
          preloadedPoolRef.current.add(nextSrc);
        }
      } catch (err) {
        // Failed to load next candidate: mark it failed and NEVER switch to it
        failedPoolRef.current.add(nextSrc);
        // Reschedule next attempt without blanking current visible media
        if (isMounted) {
          timerId = setTimeout(prepareAndTransition, 2000);
        }
        return;
      }

      if (!isMounted) return;

      // Both media ready: perform smooth crossfade transition
      isTransitioningRef.current = true;
      setPrevMedia(current);
      setCurrentMedia(nextItem);
      setPanIndex((p) => (p + 1) % PAN_CLASSES.length);

      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        if (isMounted) {
          setPrevMedia(null);
          isTransitioningRef.current = false;
        }
      }, FADE_DURATION);

      // Schedule next rotation after interval
      if (isMounted) {
        timerId = setTimeout(prepareAndTransition, interval);
      }
    };

    timerId = setTimeout(prepareAndTransition, interval);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [safeMedia, interval]);

  const currentPanClass = PAN_CLASSES[panIndex % PAN_CLASSES.length];

  const renderSlide = (item, isIncoming) => {
    if (!item) return null;
    const src = getMediaSrc(item);
    const alt = getMediaAlt(item, 0);
    const isVideo = isVideoMedia(item, src);
    // Both previous and current media stay active to maintain unbroken visuals during crossfade
    const activeClasses = `is-active ${currentPanClass}`;

    return (
      <div
        key={item.id || src}
        className="hero-slideshow-slide"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 1,
          zIndex: isIncoming ? 2 : 1,
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
            ref={(el) => {
              if (el) {
                el.muted = true;
                el.play().catch(() => {});
              }
            }}
            onLoadedMetadata={(e) => {
              if (e.target && e.target.currentTime === 0) {
                try {
                  e.target.currentTime = 0.1;
                } catch {}
              }
            }}
            className={`hero-slideshow-media ${activeClasses}`}
            style={{
              objectFit: "cover",
              filter: "brightness(0.72) contrast(1.08)",
            }}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            className={`hero-slideshow-media ${activeClasses}`}
            style={{
              objectFit: "cover",
              filter: "brightness(0.75) contrast(1.08)",
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className={`hero-slideshow ${className}`}
      role="region"
      aria-label={ariaLabel}
      aria-live="off"
    >
      {/* Previous media remains visible during crossfade until incoming media is fully transitioned */}
      {prevMedia && renderSlide(prevMedia, false)}
      {/* Current confirmed ready media */}
      {currentMedia && renderSlide(currentMedia, true)}
    </div>
  );
}
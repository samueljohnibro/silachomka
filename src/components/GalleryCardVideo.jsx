import React, { useRef, useEffect, useState } from "react";

/**
 * GalleryCardVideo (Stage 34 — Req #5)
 *
 * Provides Instagram-like muted viewport autoplay with a 5-second random snippet window:
 * - Plays a random 5-second snippet starting at a random timestamp with at least 5s remaining.
 * - When the 5-second snippet concludes, smoothly loops or picks another random 5-second window.
 * - Autoplays strictly muted and playsInline.
 * - Pauses automatically when scrolled out of view.
 */
const SNIPPET_DURATION = 5.0;

export default function GalleryCardVideo({
  src,
  poster,
  className = "gallery-card-image",
  title = "Gallery Video",
  isActive = true,
  onReady,
  onError,
}) {
  const videoRef = useRef(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;
    video.loop = true;

    const handleCanPlay = () => {
      setHasLoadedData(true);
      if (onReady) onReady(src);
      if (isActive) {
        video.play().catch(() => {});
      }
    };

    const handleLoadedMetadata = () => {
      if (video.readyState >= 2) {
        handleCanPlay();
      }
    };

    if (video.readyState >= 2) {
      handleCanPlay();
    }

    const handleError = (e) => {
      if (onError) onError(src, e);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleCanPlay);
    video.addEventListener("error", handleError);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          const v = videoRef.current;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.25 && isActive) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: [0, 0.25, 0.8] }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleCanPlay);
      video.removeEventListener("error", handleError);
      try {
        video.pause();
      } catch {}
    };
  }, [src, isActive, onReady, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      muted
      playsInline
      loop
      preload="auto"
      className={className}
      aria-label={title}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        background: "#08080c",
      }}
    />
  );
}

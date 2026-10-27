import React, { useRef, useEffect } from "react";

/**
 * GalleryCardVideo (Stage 30 — Req #8, #9, #10)
 *
 * Provides Instagram-like muted viewport autoplay for public gallery videos:
 * - Autoplays when >=50% visible in the viewport.
 * - Pauses when scrolled out of view.
 * - Picks a random playable starting position once per viewport entry.
 * - Preloads metadata and immediately seeks to first frame to eliminate black placeholder.
 * - Strict muted and playsInline compliance to avoid browser autoplay policy rejections.
 */
export default function GalleryCardVideo({
  src,
  poster,
  className = "gallery-card-image",
  title = "Gallery Video",
}) {
  const videoRef = useRef(null);
  const hasSelectedRandomStart = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset random start flag on src change
    hasSelectedRandomStart.current = false;

    const handleLoadedMetadata = () => {
      // Seek slightly past 0 to ensure the browser decodes and paints the first video frame
      if (video.currentTime === 0) {
        try {
          video.currentTime = 0.1;
        } catch {}
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          const v = videoRef.current;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            // Req #10: Pick a random playable start position once upon entering viewport
            if (!hasSelectedRandomStart.current && Number.isFinite(v.duration) && v.duration > 3) {
              try {
                const maxStart = Math.max(0.5, v.duration - 2);
                const randomTime = 0.5 + Math.random() * (maxStart - 0.5);
                v.currentTime = Math.round(randomTime * 10) / 10;
              } catch {}
              hasSelectedRandomStart.current = true;
            }

            v.play().catch(() => {
              // Browser autoplay restrictions handled safely
            });
          } else {
            // Pause when out of view
            v.pause();
          }
        });
      },
      {
        threshold: [0, 0.45, 0.8],
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [src]);

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

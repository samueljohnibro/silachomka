import React, { useRef, useEffect } from "react";

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
}) {
  const videoRef = useRef(null);
  const snippetStartRef = useRef(0);
  const snippetEndRef = useRef(SNIPPET_DURATION);
  const isSettingTimeRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const setupRandomSnippet = () => {
      const dur = video.duration;
      if (Number.isFinite(dur) && dur > SNIPPET_DURATION + 0.2) {
        const maxStart = Math.max(0, dur - SNIPPET_DURATION);
        const randomStart = Math.random() * maxStart;
        snippetStartRef.current = randomStart;
        snippetEndRef.current = randomStart + SNIPPET_DURATION;
        try {
          isSettingTimeRef.current = true;
          video.currentTime = randomStart;
        } catch {}
      } else if (Number.isFinite(dur) && dur > 0) {
        snippetStartRef.current = 0;
        snippetEndRef.current = dur;
        try {
          isSettingTimeRef.current = true;
          video.currentTime = 0.1;
        } catch {}
      }
    };

    const handleLoadedMetadata = () => {
      setupRandomSnippet();
    };

    const handleTimeUpdate = () => {
      if (isSettingTimeRef.current) {
        isSettingTimeRef.current = false;
        return;
      }
      const dur = video.duration;
      if (!Number.isFinite(dur)) return;

      if (video.currentTime >= snippetEndRef.current) {
        // Pick next 5s snippet or loop
        if (dur > 5.2) {
          const maxStart = dur - 5.0;
          const nextStart = Math.random() * maxStart;
          snippetStartRef.current = nextStart;
          snippetEndRef.current = nextStart + 5.0;
          try {
            isSettingTimeRef.current = true;
            video.currentTime = nextStart;
          } catch {}
        } else {
          try {
            isSettingTimeRef.current = true;
            video.currentTime = 0;
          } catch {}
        }
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          const v = videoRef.current;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      {
        threshold: [0, 0.35, 0.8],
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      muted
      playsInline
      preload="metadata"
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

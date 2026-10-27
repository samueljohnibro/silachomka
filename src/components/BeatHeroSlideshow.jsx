import { useMemo } from "react";
import MediaSlideshow from "./MediaSlideshow";

/**
 * BeatHeroSlideshow (Stage 32 — Req #18 & #20)
 *
 * Strictly GIF-only hero slideshow for beats:
 * - Only beats with authentic animated GIFs are included in the hero rotation.
 * - Ordinary static JPG/PNG images are strictly excluded.
 * - Renders animated GIFs directly without static poster cover-ups so animations
 *   play continuously and vividly on both desktop and mobile.
 */
export default function BeatHeroSlideshow({ beats = [] }) {
  const media = useMemo(() => {
    if (!Array.isArray(beats)) {
      return [];
    }

    const seen = new Set();

    const mediaList = beats
      .map((beat) => {
        if (!beat || typeof beat !== "object") {
          return null;
        }

        // Req #18: Strictly GIF media only, never static JPG/PNG fallbacks
        const videoSrc = typeof beat.video === "string" ? beat.video.trim() : "";
        const isGif =
          Boolean(videoSrc) &&
          (/\.gif(\?.*)?$/i.test(videoSrc) || beat.videoMimeType === "image/gif");

        if (!isGif) {
          return null;
        }

        if (seen.has(videoSrc)) {
          return null;
        }

        seen.add(videoSrc);

        return {
          id: `beat-gif-${beat.id || beat.slug}`,
          type: "image",
          src: videoSrc,
          title: beat.title || "chomkaMUSIC™ Beat",
          poster: null, // Strictly no static poster overlay
          beat,
        };
      })
      .filter(Boolean);

    // If no GIF beats were found in the database, fall back to the authorized default GIF
    if (mediaList.length === 0) {
      mediaList.push({
        id: "beat-gif-default",
        type: "image",
        src: "/beats/shine.gif",
        title: "chomkaMUSIC™ Beats",
        poster: null,
      });
    }

    // Pseudorandom shuffle
    for (let i = mediaList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mediaList[i], mediaList[j]] = [mediaList[j], mediaList[i]];
    }

    return mediaList;
  }, [beats]);

  if (!media.length) {
    return null;
  }

  return (
    <MediaSlideshow
      media={media}
      className="hero-slideshow"
      mediaClassName="hero-slideshow-media"
      ariaLabel="Beat preview slideshow"
    />
  );
}

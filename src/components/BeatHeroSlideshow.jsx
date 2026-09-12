import { useMemo } from "react";
import MediaSlideshow from "./MediaSlideshow";

/**
 * BeatHeroSlideshow
 *
 * Specialized wrapper around the generic MediaSlideshow engine.
 *
 * Responsibilities:
 * - Receives the existing beat catalog.
 * - Extracts beat.video values.
 * - Removes invalid / missing video entries.
 * - Removes duplicate video sources.
 * - Preserves the relationship between the slideshow media
 *   and the originating beat where possible.
 *
 * The actual slideshow behavior remains inside MediaSlideshow.
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

        const video = beat.video;

        if (typeof video !== "string" || !video.trim()) {
          return null;
        }

        const src = video.trim();

        if (seen.has(src)) {
          return null;
        }

        seen.add(src);

        return {
          type: src.endsWith(".mp4") || src.endsWith(".webm") ? "video" : "image",
          src,
          beat,
        };
      })
      .filter(Boolean);

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
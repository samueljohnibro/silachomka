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

    return beats
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
          type: "video",
          src,
          beat,
        };
      })
      .filter(Boolean);
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
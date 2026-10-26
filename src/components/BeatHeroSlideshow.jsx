import { useMemo } from "react";
import MediaSlideshow from "./MediaSlideshow";

/**
 * BeatHeroSlideshow
 *
 * Specialized wrapper around the generic MediaSlideshow engine.
 * Preserves JPG poster + GIF progressive loading for beat hero visuals.
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

        const video = beat.video || beat.image;

        if (typeof video !== "string" || !video.trim()) {
          return null;
        }

        const src = video.trim();

        if (seen.has(src)) {
          return null;
        }

        seen.add(src);

        const isVid =
          (beat.videoMimeType && beat.videoMimeType.startsWith("video/")) ||
          /\.(mp4|webm|mov)(\?.*)?$/i.test(src);

        return {
          type: isVid ? "video" : "image",
          src,
          poster: beat.image || null,
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

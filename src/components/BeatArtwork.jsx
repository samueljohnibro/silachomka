import { useState, useRef, useEffect } from 'react';

/**
 * BeatArtwork (Stage 26 — Req #2, #6, #8)
 *
 * Reusable progressive Beat Artwork component:
 * 1. JPG is the fallback/poster and renders immediately.
 * 2. GIF loads when available (gated by IntersectionObserver when lazy=true to prevent
 *    decoding dozens of multi-MB GIFs simultaneously and causing STATUS_BREAKPOINT).
 * 3. Once GIF is loaded successfully, it visually takes over.
 * 4. If GIF fails, JPG remains visible without flashing broken-image icons.
 */
export default function BeatArtwork({
  image,
  video,
  videoMimeType,
  alt = '',
  className = '',
  style = {},
  lazy = true,
  onGifLoad,
}) {
  const containerRef = useRef(null);
  const gifImgRef = useRef(null);
  const isGif = Boolean(
    video && (/\.gif(\?.*)?$/i.test(video) || videoMimeType === 'image/gif')
  );
  const [gifLoaded, setGifLoaded] = useState(false);
  const [gifError, setGifError] = useState(false);
  const [inView, setInView] = useState(!lazy);

  // Reset state when source changes
  useEffect(() => {
    setGifLoaded(false);
    setGifError(false);
  }, [video]);

  // Immediate cache check: if the GIF is already complete in browser cache, take over immediately
  useEffect(() => {
    if (!inView || !isGif || gifError) return;
    const imgEl = gifImgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      setGifLoaded(true);
      onGifLoad?.();
    }
  }, [inView, isGif, video, gifError, onGifLoad]);

  // Viewport visibility observer to gate initial GIF request until near viewport
  useEffect(() => {
    if (!lazy) {
      setInView(true);
      return undefined;
    }
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '320px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, video]);

  if (!isGif) {
    // Non-GIF video (e.g. MP4/WebM) with JPG poster fallback
    if (video) {
      return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
          {image && (
            <img
              src={image}
              alt={alt}
              loading={lazy ? 'lazy' : undefined}
              decoding="async"
              className={className}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                ...style,
              }}
            />
          )}
          {inView && (
            <video
              src={video}
              poster={image || undefined}
              muted
              autoPlay
              playsInline
              loop
              preload="metadata"
              className={className}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                ...style,
              }}
              aria-hidden="true"
            />
          )}
        </div>
      );
    }

    // Static image only
    return image ? (
      <img
        ref={containerRef}
        src={image}
        alt={alt}
        loading={lazy ? 'lazy' : undefined}
        decoding="async"
        className={className}
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
      />
    ) : null;
  }

  // GIF path: JPG poster → GIF loads → GIF takes over
  return (
    <div
      ref={containerRef}
      className="beat-artwork-progressive"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {/* JPG Poster — visible while GIF loads or if GIF fails */}
      {image && (
        <img
          src={image}
          alt={alt}
          loading={lazy ? 'lazy' : undefined}
          decoding="async"
          className={className}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            pointerEvents: 'none',
            ...style,
          }}
        />
      )}

      {/* Animated GIF — mounts when in view and takes over immediately once loaded */}
      {inView && !gifError && (
        <img
          ref={gifImgRef}
          src={video}
          alt={alt}
          decoding="async"
          className={className}
          onLoad={() => {
            setGifLoaded(true);
            onGifLoad?.();
          }}
          onError={() => {
            setGifError(true);
            setGifLoaded(false);
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: gifLoaded ? 1 : 0,
            zIndex: gifLoaded ? 2 : 0,
            transition: 'opacity 0.25s ease',
            ...style,
          }}
        />
      )}
    </div>
  );
}

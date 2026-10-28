import { useCallback, useEffect, useRef, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  VolumeOnIcon,
  VolumeOffIcon,
  FullscreenIcon,
  LoadingSpinner,
} from "./Icons";

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function GalleryVideoPlayer({
  src,
  poster,
  isActive = true,
  className = "",
  style = {},
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const seekBarRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Pause video immediately when inactive
  useEffect(() => {
    if (!isActive) {
      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
          setIsPlaying(false);
        } catch {}
      }
    }
  }, [isActive]);

  // Clean pause on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {}
      }
    };
  }, []);

  // Reset player state when video source changes
  useEffect(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
        v.load();
      } catch {}
    }
  }, [src]);

  const togglePlay = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      const v = videoRef.current;
      if (!v || hasError) return;
      if (v.paused || v.ended) {
        if (v.ended) {
          try {
            v.currentTime = 0;
          } catch {}
        }
        setIsBuffering(true);
        v.play()
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
      } else {
        v.pause();
        setIsPlaying(false);
      }
    },
    [hasError]
  );

  const skipSeconds = useCallback((delta, e) => {
    if (e) e.stopPropagation();
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return;
    const nextTime = Math.max(0, Math.min(v.currentTime + delta, v.duration));
    try {
      v.currentTime = nextTime;
      setCurrentTime(nextTime);
    } catch {}
  }, []);

  const toggleMute = useCallback((e) => {
    if (e) e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const toggleFullscreen = useCallback((e) => {
    if (e) e.stopPropagation();
    const v = videoRef.current;
    const container = containerRef.current;
    if (!v && !container) return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else if (container?.requestFullscreen) {
        container.requestFullscreen();
      } else if (v?.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();
      }
    } catch {}
  }, []);

  const seekToClientX = useCallback((clientX) => {
    const bar = seekBarRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    if (!rect.width) return;
    const frac = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    if (dur > 0) {
      const nextTime = frac * dur;
      setCurrentTime(nextTime);
      try {
        v.currentTime = nextTime;
      } catch {}
    }
  }, []);

  const handleSeekPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
      if (typeof clientX === "number") {
        seekToClientX(clientX);
      }
      setIsDraggingSeek(true);
    },
    [seekToClientX]
  );

  useEffect(() => {
    if (!isDraggingSeek) return undefined;
    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
      if (typeof clientX === "number") {
        seekToClientX(clientX);
      }
    };
    const onUp = () => setIsDraggingSeek(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDraggingSeek, seekToClientX]);

  const progressPct =
    duration > 0 ? Math.max(0, Math.min((currentTime / duration) * 100, 100)) : 0;

  return (
    <div
      ref={containerRef}
      className={`gallery-video-player ${className}`.trim()}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050507",
        overflow: "hidden",
        ...style,
      }}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        playsInline
        preload="metadata"
        muted={isMuted}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
          setIsBuffering(false);
          try {
            if (e.currentTarget.currentTime === 0) {
              e.currentTarget.currentTime = 0.1;
            }
          } catch {}
        }}
        onTimeUpdate={(e) => {
          if (!isDraggingSeek) {
            setCurrentTime(e.currentTarget.currentTime || 0);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setIsBuffering(false);
        }}
        onError={() => {
          setHasError(true);
          setIsBuffering(false);
          setIsPlaying(false);
        }}
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "78vh",
          objectFit: "contain",
          display: "block",
          paddingBottom: "58px",
        }}
      />

      {/* Center Play / Loading Overlay */}
      {(!isPlaying || isBuffering) && !hasError && (
        <button
          type="button"
          className="gallery-video-center-play"
          onClick={togglePlay}
          aria-label={isBuffering ? "Buffering video" : "Play video"}
        >
          {isBuffering ? (
            <LoadingSpinner size={26} color="var(--gold)" />
          ) : (
            <PlayIcon size={28} color="var(--gold)" />
          )}
        </button>
      )}

      {hasError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "13px",
          }}
        >
          Unable to load video stream. Please try refreshing the page.
        </div>
      )}

      {/* Bottom Transport Controls Bar */}
      <div
        className="gallery-video-controls-bar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Interactive Seek Bar with Draggable Handle */}
        <div
          ref={seekBarRef}
          className={`reel-seek-scrubber gallery-video-seek ${
            isDraggingSeek ? "is-dragging" : ""
          }`}
          role="slider"
          tabIndex={0}
          aria-label="Seek video position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 100)}
          aria-valuenow={Math.round(currentTime)}
          onMouseDown={handleSeekPointerDown}
          onTouchStart={handleSeekPointerDown}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              skipSeconds(5);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              skipSeconds(-5);
            }
          }}
        >
          <div className="reel-seek-track">
            <div
              className="reel-seek-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div
            className="reel-seek-thumb"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        <div className="gallery-video-transport-row">
          <div className="gallery-video-transport-left">
            <button
              type="button"
              className="gallery-video-btn"
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isBuffering ? (
                <LoadingSpinner size={15} color="var(--gold)" />
              ) : isPlaying ? (
                <PauseIcon size={16} />
              ) : (
                <PlayIcon size={16} />
              )}
            </button>

            <button
              type="button"
              className="gallery-video-btn gallery-video-skip-btn"
              onClick={(e) => skipSeconds(-5, e)}
              title="Rewind 5 seconds"
              aria-label="Rewind 5 seconds"
            >
              <SkipBackIcon size={13} />
              <span>5s</span>
            </button>

            <button
              type="button"
              className="gallery-video-btn gallery-video-skip-btn"
              onClick={(e) => skipSeconds(5, e)}
              title="Forward 5 seconds"
              aria-label="Forward 5 seconds"
            >
              <span>5s</span>
              <SkipForwardIcon size={13} />
            </button>

            <span className="gallery-video-time">
              {formatClock(currentTime)} / {formatClock(duration)}
            </span>
          </div>

          <div className="gallery-video-transport-right">
            <button
              type="button"
              className="gallery-video-btn"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeOffIcon size={15} />
              ) : (
                <VolumeOnIcon size={15} />
              )}
            </button>

            <button
              type="button"
              className="gallery-video-btn"
              onClick={toggleFullscreen}
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <FullscreenIcon size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

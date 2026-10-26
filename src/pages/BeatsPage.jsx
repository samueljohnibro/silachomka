import {
  DownCaretIcon,
  PlayIcon,
  PauseIcon,
  RightArrowIcon,
  UpRightArrowIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  PreviousTrackIcon,
  NextTrackIcon,
  SkipBackIcon,
  SkipForwardIcon,
  GridIcon,
  ReelIcon,
  CameraIcon,
  LoadingSpinner,
  ShareIcon,
  CheckIcon,
} from "../components/Icons";
// src/pages/BeatsPage.jsx

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useChomkaStore } from "../data/store";
import { useCurrency } from "../data/CurrencyContext";
import BeatArtwork from "../components/BeatArtwork";
import BeatHeroSlideshow from "../components/BeatHeroSlideshow";
import ExclusiveBeatModal from "../components/ExclusiveBeatModal";
import SeoHead from "../components/SeoHead";
import { getBeatProducer, getBeatSource } from "../data/credits";

const PREVIEW_LENGTH = 60;

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/* =========================================================
   CIRCULAR PLAYBACK PROGRESS RING
   ========================================================= */

function ProgressRing({ progress, isPlaying }) {
  const radius = 19;
  const circumference = 2 * Math.PI * radius;

  const safeProgress = Math.max(0, Math.min(progress, 1));
  const offset = circumference - safeProgress * circumference;

  return (
    <svg
      className={`beat-progress-ring ${isPlaying ? "is-playing" : ""}`}
      viewBox="0 0 44 44"
      aria-hidden="true"
    >
      <circle className="beat-progress-track" cx="22" cy="22" r={radius} />
      <circle
        className="beat-progress-value"
        cx="22"
        cy="22"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

/* =========================================================
   BEAT CARD (Memoized to prevent 60fps grid re-renders)
   ========================================================= */

const BeatCard = memo(function BeatCard({
  beat,
  isPlaying,
  isLoading,
  progress,
  onPlay,
  startingPrice,
}) {
  const [copied, setCopied] = useState(false);

  const handleShareBeat = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const shareUrl = `https://silachomka.vercel.app/beats/${beat.id}`;
      try {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(
          navigator.userAgent || ""
        );
        if (isMobile && typeof navigator.share === "function") {
          await navigator.share({
            title: `${beat.title} | chomkaMUSIC™ Studio Beats`,
            text: `Listen to "${beat.title}" by silachomka`,
            url: shareUrl,
          });
          return;
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [beat.id, beat.title]
  );

  return (
    <article className={`beat-card ${isPlaying ? "is-playing" : ""}`}>
      {/* Visualizer Frame */}
      <div className={`beat-art ${isPlaying ? "is-playing" : ""}`}>
        <BeatArtwork
          image={beat.image}
          video={beat.video}
          videoMimeType={beat.videoMimeType}
          alt={beat.title || ""}
          className={`beat-video${beat.letterboxed ? " is-letterboxed" : ""}`}
        />

        <div className="beat-video-overlay" aria-hidden="true" />

        {/* Listen / Playing Badge */}
        <div className="beat-preview-label">
          {isPlaying ? "PLAYING" : "LISTEN"}
        </div>

        {/* Visual Title */}
        {beat.showVisualTitle && (
          <div className="beat-art-content">
            <h2>{beat.title}</h2>
            <p className="beat-genre">{beat.shortGenre || beat.genre}</p>
          </div>
        )}

        {/* Circular Audio Trigger */}
        <button
          type="button"
          className={`beat-play ${isPlaying ? "is-playing" : ""} ${isLoading ? "is-loading" : ""}`}
          onClick={() => onPlay(beat)}
          aria-label={
            isLoading
              ? `Loading ${beat.title}`
              : isPlaying
              ? `Pause ${beat.title}`
              : `Play ${beat.title}`
          }
          aria-pressed={isPlaying}
          aria-busy={isLoading}
        >
          <ProgressRing progress={progress} isPlaying={isPlaying} />
          {isLoading ? (
            <LoadingSpinner size={18} />
          ) : (
            <span className="beat-play-icon" aria-hidden="true">
              {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </span>
          )}
        </button>
      </div>

      {/* Beat Information */}
      <div className="beat-info">
        <div>
          <p className="beat-name">{beat.title}</p>
          <p className="beat-type">{beat.genre}</p>
          <p className="credit-line">
            prod. {getBeatProducer(beat)}
            <span className="credit-dot"> · </span>
            {getBeatSource(beat)}
          </p>
        </div>

        <p className="beat-price" data-currency-price={startingPrice || ""}>
          {startingPrice ? `From ${startingPrice}` : "From Selar"}
        </p>
      </div>

      <div className="beat-card-actions">
        <Link
          className="beat-link"
          to={`/beats/${beat.id}`}
          aria-label={`View details and Selar licensing for ${beat.title}`}
        >
          License Beat <RightArrowIcon />
        </Link>
        <button
          type="button"
          className={`beat-card-share-btn ${copied ? "is-copied" : ""}`}
          onClick={handleShareBeat}
          title={copied ? "Link Copied!" : `Share ${beat.title}`}
          aria-label={copied ? "Beat link copied" : `Share ${beat.title}`}
        >
          {copied ? <CheckIcon size={13} /> : <ShareIcon size={13} />}
          <span>{copied ? "Copied" : "Share"}</span>
        </button>
      </div>
    </article>
  );
});

/* =========================================================
   BEAT REEL PLAYER (PORTRAIT 9:16 EXPERIENCE)
   ========================================================= */

function BeatReelPlayer({
  beats,
  currentIndex,
  onNext,
  onPrev,
  isShuffle,
  onToggleShuffle,
  isPlaying,
  isLoading,
  progress,
  previewDuration,
  playbackMode,
  onChangePlaybackMode,
  onPlay,
  onExitReel,
  onSkip,
  onSeek,
  repeatMode,
  onCycleRepeat,
  getBeatStartingPrice,
}) {
  const currentBeat = beats[currentIndex];
  const seekBarRef = useRef(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);

  const computeSeekFraction = useCallback((clientX) => {
    const bar = seekBarRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    if (!rect.width) return null;
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
  }, []);

  const handleSeekPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const frac = computeSeekFraction(clientX);
      if (frac !== null && onSeek) {
        onSeek(frac);
      }
      setIsDraggingSeek(true);
    },
    [computeSeekFraction, onSeek]
  );

  useEffect(() => {
    if (!isDraggingSeek) return undefined;
    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
      if (typeof clientX !== "number") return;
      const frac = computeSeekFraction(clientX);
      if (frac !== null && onSeek) {
        onSeek(frac);
      }
    };
    const handleUp = () => setIsDraggingSeek(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDraggingSeek, computeSeekFraction, onSeek]);

  if (!currentBeat) return null;

  const effectiveDuration =
    Number.isFinite(previewDuration) && previewDuration > 0
      ? previewDuration
      : playbackMode === "1min"
      ? 60
      : 180;
  const elapsedSeconds = Math.min(
    effectiveDuration,
    Math.floor(progress * effectiveDuration)
  );
  const startingPrice = getBeatStartingPrice(currentBeat);
  const clampedPct = Math.max(0, Math.min(progress * 100, 100));

  return (
    <div
      className="beat-reel-wrapper"
      style={{ margin: "20px auto 40px", maxWidth: "440px", padding: "0 12px" }}
    >
      {/* 9:16 Portrait Reel Viewport */}
      <div
        className="beat-reel-viewport"
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "9 / 16",
          maxHeight: "82vh",
          margin: "0 auto",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#080808",
          boxShadow:
            "0 24px 60px rgba(0,0,0,0.8), 0 0 30px rgba(223, 194, 125, 0.15)",
          border: "1px solid rgba(223, 194, 125, 0.3)",
        }}
      >
        {/* Background Visualizer / GIF / Video */}
        <BeatArtwork
          image={currentBeat.image}
          video={currentBeat.video}
          videoMimeType={currentBeat.videoMimeType}
          alt={currentBeat.title || ""}
          lazy={false}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />

        {/* Cinematic Gradient Overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.12) 25%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.94) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Top Header Bar: Interactive Draggable Seek Bar & Mode Controls */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "16px 16px 8px",
            zIndex: 10,
          }}
        >
          {/* Interactive Seek Scrubber with Draggable Handle (Req #5) */}
          <div
            ref={seekBarRef}
            className={`reel-seek-scrubber ${isDraggingSeek ? "is-dragging" : ""}`}
            role="slider"
            tabIndex={0}
            aria-label="Seek beat playback position"
            aria-valuemin={0}
            aria-valuemax={Math.round(effectiveDuration)}
            aria-valuenow={elapsedSeconds}
            onMouseDown={handleSeekPointerDown}
            onTouchStart={handleSeekPointerDown}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                onSkip && onSkip(5);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                onSkip && onSkip(-5);
              }
            }}
          >
            <div className="reel-seek-track">
              <div
                className="reel-seek-fill"
                style={{ width: `${clampedPct}%` }}
              />
            </div>
            <div
              className="reel-seek-thumb"
              style={{ left: `${clampedPct}%` }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 500,
              gap: "8px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(0,0,0,0.55)",
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(223, 194, 125, 0.3)",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isPlaying ? "var(--gold)" : "#888",
                  boxShadow: isPlaying ? "0 0 6px var(--gold)" : "none",
                }}
              />
              {playbackMode === "full"
                ? `${formatClock(elapsedSeconds)} / ${formatClock(effectiveDuration)} Full`
                : `${formatClock(elapsedSeconds)} / 1:00 Preview`}
            </span>

            {/* 1 Min / Full Track Toggle inside Reel */}
            <div
              role="group"
              aria-label="Playback duration mode"
              style={{
                display: "inline-flex",
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(223,194,125,0.35)",
                borderRadius: "999px",
                padding: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => onChangePlaybackMode("1min")}
                aria-pressed={playbackMode === "1min"}
                style={{
                  border: "none",
                  background:
                    playbackMode === "1min" ? "var(--gold)" : "transparent",
                  color: playbackMode === "1min" ? "#050507" : "#d8d3c8",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
              >
                1 MIN
              </button>
              <button
                type="button"
                onClick={() => onChangePlaybackMode("full")}
                aria-pressed={playbackMode === "full"}
                style={{
                  border: "none",
                  background:
                    playbackMode === "full" ? "var(--gold)" : "transparent",
                  color: playbackMode === "full" ? "#050507" : "#d8d3c8",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
              >
                FULL
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>
                {currentIndex + 1}/{beats.length}
              </span>
              <button
                type="button"
                onClick={onExitReel}
                style={{
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
                title="Exit Reel Mode"
                aria-label="Exit Reel Mode"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Center Tap to Play/Pause Area */}
        <div
          onClick={() => onPlay(currentBeat)}
          style={{
            position: "absolute",
            inset: "80px 0 210px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 5,
          }}
        >
          {(!isPlaying || isLoading) && (
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                border: "2px solid var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--gold)",
                boxShadow: "0 0 24px rgba(0,0,0,0.8)",
                transition: "transform 0.2s ease",
              }}
            >
              {isLoading ? (
                <LoadingSpinner size={26} color="var(--gold)" />
              ) : (
                <PlayIcon size={28} />
              )}
            </div>
          )}
        </div>

        {/* Bottom Reel Content & Interactive Controls */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "20px 18px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Req #15: Genre stacked above Price, both centered */}
          <div
            className="reel-meta-centered"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "4px",
            }}
          >
            <div
              className="reel-genre-price-stack"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                marginBottom: "2px",
              }}
            >
              <span
                className="reel-genre-badge"
                style={{
                  fontSize: "10px",
                  color: "var(--gold)",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background: "rgba(223,194,125,0.16)",
                  border: "1px solid rgba(223,194,125,0.3)",
                  padding: "3px 10px",
                  borderRadius: "999px",
                }}
              >
                {currentBeat.genre || "Instrumental"}
              </span>
              <span
                className="reel-price-label"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#f5f3ef",
                  letterSpacing: "0.02em",
                }}
              >
                {startingPrice ? `From ${startingPrice}` : "From Selar"}
              </span>
            </div>

            <h2
              style={{
                margin: "2px 0 2px",
                fontSize: "20px",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {currentBeat.title}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "rgba(255,255,255,0.72)",
              }}
            >
              prod. {getBeatProducer(currentBeat)} · {getBeatSource(currentBeat)}
            </p>
          </div>

          {/* Prominent Button to Open Beat Detail Page & Selar Licensing */}
          <Link
            to={`/beats/${currentBeat.id}`}
            className="primary-button"
            style={{
              width: "100%",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            }}
          >
            <span>View Beat Details & Licensing</span>
            <RightArrowIcon size={16} />
          </Link>

          {/* Dedicated Playback & Navigation Controls Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "6px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Shuffle Toggle */}
            <button
              type="button"
              onClick={onToggleShuffle}
              title={isShuffle ? "Shuffle On" : "Shuffle Off"}
              aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
              aria-pressed={isShuffle}
              style={{
                background: isShuffle
                  ? "rgba(223, 194, 125, 0.25)"
                  : "transparent",
                border: isShuffle
                  ? "1px solid var(--gold)"
                  : "1px solid transparent",
                color: isShuffle ? "var(--gold)" : "rgba(255,255,255,0.6)",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "15px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <ShuffleIcon size={15} />
            </button>

            {/* Previous Beat */}
            <button
              type="button"
              onClick={onPrev}
              title="Previous Beat"
              aria-label="Previous Beat"
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "18px",
                cursor: "pointer",
                padding: "6px 10px",
              }}
            >
              <PreviousTrackIcon size={18} />
            </button>

            {/* Skip Back 5s */}
            <button
              type="button"
              onClick={() => onSkip && onSkip(-5)}
              title="Skip back 5 seconds"
              aria-label="Skip back 5 seconds"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.75)",
                fontSize: "14px",
                cursor: "pointer",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <SkipBackIcon size={14} />
              <span style={{ fontSize: "9px", fontWeight: 600 }}>5</span>
            </button>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={() => onPlay(currentBeat)}
              title={isPlaying ? "Pause" : "Play"}
              aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause" : "Play"}
              aria-busy={isLoading}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "var(--gold)",
                border: "none",
                color: "#050507",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 12px var(--gold-glow)",
              }}
            >
              {isLoading ? (
                <LoadingSpinner size={18} color="#050507" />
              ) : isPlaying ? (
                <PauseIcon size={20} color="#050507" />
              ) : (
                <PlayIcon size={20} color="#050507" />
              )}
            </button>

            {/* Skip Forward 5s */}
            <button
              type="button"
              onClick={() => onSkip && onSkip(5)}
              title="Skip forward 5 seconds"
              aria-label="Skip forward 5 seconds"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.75)",
                fontSize: "14px",
                cursor: "pointer",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <span style={{ fontSize: "9px", fontWeight: 600 }}>5</span>
              <SkipForwardIcon size={14} />
            </button>

            {/* Next Beat */}
            <button
              type="button"
              onClick={onNext}
              title="Next Beat"
              aria-label="Next Beat"
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "18px",
                cursor: "pointer",
                padding: "6px 10px",
              }}
            >
              <NextTrackIcon size={18} />
            </button>

            {/* Repeat Mode Toggle */}
            <button
              type="button"
              onClick={onCycleRepeat}
              title={
                repeatMode === "one"
                  ? "Repeat: One"
                  : repeatMode === "all"
                  ? "Repeat: All"
                  : "Repeat: Off"
              }
              aria-label={
                repeatMode === "one"
                  ? "Repeat mode: One"
                  : repeatMode === "all"
                  ? "Repeat mode: All"
                  : "Repeat mode: Off"
              }
              style={{
                background:
                  repeatMode !== "none"
                    ? "rgba(223, 194, 125, 0.2)"
                    : "transparent",
                border:
                  repeatMode !== "none"
                    ? "1px solid var(--gold)"
                    : "1px solid transparent",
                color:
                  repeatMode !== "none"
                    ? "var(--gold)"
                    : "rgba(255,255,255,0.5)",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {repeatMode === "one" ? (
                <RepeatOneIcon size={15} />
              ) : (
                <RepeatIcon size={15} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   BEATS PAGE
   ========================================================= */

export default function BeatsPage() {
  const { beats } = useChomkaStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    currency,
    setCurrency,
    supportedCurrencies,
    getBeatStartingPrice,
    playbackMode,
    setPlaybackMode,
  } = useCurrency();

  const audioRef = useRef(null);
  const audioCleanupRef = useRef(null);
  const autoAdvanceTimerRef = useRef(null);
  const activeBeatRef = useRef(null);
  const isPlayingRef = useRef(false);
  const previewStartRef = useRef(0);
  const previewDurationRef = useRef(0);
  const playbackModeRef = useRef(playbackMode);
  const prevPlaybackModeRef = useRef(playbackMode);
  const audioGenerationRef = useRef(0);
  const animationFrameRef = useRef(null);
  const lastProgressCommitRef = useRef(0);
  const updateProgressRef = useRef(null);
  const repeatModeRef = useRef("all");
  const handleNextReelRef = useRef(null);

  const [activeBeat, setActiveBeat] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activePreviewDuration, setActivePreviewDuration] = useState(60);
  const [audioError, setAudioError] = useState(false);
  const [loadingBeatId, setLoadingBeatId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isExclusiveModalOpen, setIsExclusiveModalOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isReelMode, setIsReelMode] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("all"); // 'none' | 'all' | 'one'

  useEffect(() => {
    activeBeatRef.current = activeBeat;
  }, [activeBeat]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  // Req #4: When switching between 1 MIN and FULL TRACK, stop current playback,
  // reset time to 0:00, apply the new playback mode, reset progress bar to 0,
  // and restart playback only if the beat was already playing (if paused, remain paused at 0:00).
  useEffect(() => {
    playbackModeRef.current = playbackMode;
    if (prevPlaybackModeRef.current === playbackMode) return;
    prevPlaybackModeRef.current = playbackMode;

    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      setProgress(0);
      return;
    }

    const wasPlaying = isPlayingRef.current;
    try {
      audio.pause();
    } catch {}

    previewStartRef.current = 0;
    const dur =
      playbackMode === "full"
        ? audio.duration
        : Math.min(PREVIEW_LENGTH, audio.duration);
    previewDurationRef.current = dur;
    setActivePreviewDuration(dur);

    try {
      audio.currentTime = 0;
    } catch {}
    setProgress(0);

    if (wasPlaying) {
      audio
        .play()
        .then(() => {
          if (audioRef.current !== audio) return;
          isPlayingRef.current = true;
          setIsPlaying(true);
        })
        .catch(() => {
          if (audioRef.current !== audio) return;
          isPlayingRef.current = false;
          setIsPlaying(false);
        });
    } else {
      isPlayingRef.current = false;
      setIsPlaying(false);
    }
  }, [playbackMode]);

  const filters = useMemo(
    () => [
      { id: "all", label: "All" },
      { id: "afro", label: "Afro" },
      { id: "rnb", label: "R&B" },
      { id: "trap", label: "Trap" },
    ],
    []
  );

  const filteredBeats = useMemo(() => {
    if (activeFilter === "all") {
      return beats;
    }
    return beats.filter((beat) => beat.categories?.includes(activeFilter));
  }, [activeFilter, beats]);

  const cancelProgressAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const resetAudioElement = useCallback((audio) => {
    if (audioCleanupRef.current) {
      try {
        audioCleanupRef.current();
      } catch {}
      audioCleanupRef.current = null;
    }
    if (!audio) return;
    try {
      audio.pause();
    } catch {}
    try {
      audio.currentTime = 0;
    } catch {}
    try {
      audio.removeAttribute("src");
      audio.load();
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      audioGenerationRef.current += 1;
      cancelProgressAnimation();
      clearAutoAdvanceTimer();
      resetAudioElement(audioRef.current);

      audioRef.current = null;
      activeBeatRef.current = null;
      isPlayingRef.current = false;
      previewStartRef.current = 0;
      previewDurationRef.current = 0;
    };
  }, [cancelProgressAnimation, clearAutoAdvanceTimer, resetAudioElement]);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || !activeBeatRef.current || !isPlayingRef.current) {
      animationFrameRef.current = null;
      return;
    }

    const previewStart = previewStartRef.current;
    const previewDuration = previewDurationRef.current;

    if (!Number.isFinite(previewDuration) || previewDuration <= 0) {
      if (updateProgressRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateProgressRef.current);
      }
      return;
    }

    const elapsed = Math.max(0, audio.currentTime - previewStart);
    const nextProgress = Math.max(0, Math.min(elapsed / previewDuration, 1));

    // Throttle React state updates to ~12fps (every 80ms) to avoid 60fps full-page re-renders
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastProgressCommitRef.current >= 80 || nextProgress >= 1) {
      lastProgressCommitRef.current = now;
      setProgress(nextProgress);
    }

    if (elapsed >= previewDuration || audio.ended || nextProgress >= 1) {
      audio.pause();
      setProgress(1);
      isPlayingRef.current = false;
      setIsPlaying(false);
      cancelProgressAnimation();
      clearAutoAdvanceTimer();

      const mode = repeatModeRef.current;
      if (mode === "one") {
        autoAdvanceTimerRef.current = setTimeout(() => {
          if (audioRef.current === audio && activeBeatRef.current) {
            try {
              audio.currentTime = previewStartRef.current;
            } catch {}
            setProgress(0);
            audio
              .play()
              .then(() => {
                isPlayingRef.current = true;
                setIsPlaying(true);
              })
              .catch(() => {});
          }
        }, 150);
      } else if (mode === "all" && handleNextReelRef.current) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          if (handleNextReelRef.current) {
            handleNextReelRef.current();
          }
        }, 250);
      }
      return;
    }

    if (updateProgressRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateProgressRef.current);
    }
  }, [cancelProgressAnimation, clearAutoAdvanceTimer]);

  useEffect(() => {
    updateProgressRef.current = updateProgress;
  }, [updateProgress]);

  useEffect(() => {
    cancelProgressAnimation();

    if (!isPlaying) {
      return undefined;
    }

    if (updateProgressRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateProgressRef.current);
    }

    return () => {
      cancelProgressAnimation();
    };
  }, [isPlaying, cancelProgressAnimation]);

  const replayCurrentBeat = useCallback(async (audio) => {
    if (!audio) return false;

    const previewStart = previewStartRef.current;

    try {
      audio.currentTime = previewStart;
    } catch {
      return false;
    }

    setProgress(0);

    try {
      await audio.play();
      if (audioRef.current !== audio || !activeBeatRef.current) return false;

      isPlayingRef.current = true;
      setIsPlaying(true);
      setAudioError(false);
      setProgress(0);
      return true;
    } catch {
      if (audioRef.current !== audio) return false;
      isPlayingRef.current = false;
      setIsPlaying(false);
      setAudioError(true);
      return false;
    }
  }, []);

  const handlePlay = useCallback(
    async (beat) => {
      if (!beat?.audio) return;
      clearAutoAdvanceTimer();

      const currentAudio = audioRef.current;
      const currentBeat = activeBeatRef.current;
      const currentlyPlaying = isPlayingRef.current;

      /* Pause active */
      if (currentBeat?.id === beat.id && currentAudio && currentlyPlaying) {
        currentAudio.pause();
        isPlayingRef.current = false;
        setIsPlaying(false);
        cancelProgressAnimation();
        return;
      }

      /* Resume or Replay active */
      if (currentBeat?.id === beat.id && currentAudio && !currentlyPlaying) {
        if (
          currentAudio.ended ||
          currentAudio.currentTime >=
            previewStartRef.current + previewDurationRef.current - 0.05
        ) {
          await replayCurrentBeat(currentAudio);
          return;
        }

        try {
          await currentAudio.play();
          if (audioRef.current !== currentAudio) return;
          isPlayingRef.current = true;
          setAudioError(false);
          setIsPlaying(true);
        } catch {
          if (audioRef.current !== currentAudio) return;
          isPlayingRef.current = false;
          setAudioError(true);
          setIsPlaying(false);
        }
        return;
      }

      /* Play new beat */
      audioGenerationRef.current += 1;
      const generation = audioGenerationRef.current;
      cancelProgressAnimation();

      if (currentAudio) {
        resetAudioElement(currentAudio);
      }

      isPlayingRef.current = false;
      activeBeatRef.current = beat;
      previewStartRef.current = 0;
      previewDurationRef.current = 0;

      setProgress(0);
      setAudioError(false);
      setActiveBeat(beat);
      setIsPlaying(false);
      setLoadingBeatId(beat.id);

      const audio = new Audio();
      audioRef.current = audio;
      audio.preload = "metadata";
      audio.src = beat.audio;

      if ("mediaSession" in navigator) {
        try {
          const artSrc = beat.image
            ? window.location.origin + beat.image
            : window.location.origin + "/og-image.png";
          navigator.mediaSession.metadata = new MediaMetadata({
            title: beat.title,
            artist: "chomkaMUSIC\u2122 Studio",
            album: "chomkaMUSIC\u2122 Studio Beats",
            artwork: [{ src: artSrc, sizes: "512x512", type: "image/jpeg" }],
          });
        } catch {}
      }

      const isCurrentAudio = () =>
        audioRef.current === audio &&
        audioGenerationRef.current === generation;

      let activeSeekHandler = null;

      const handleAudioError = () => {
        if (!isCurrentAudio()) return;
        isPlayingRef.current = false;
        setAudioError(true);
        setIsPlaying(false);
        setProgress(0);
        setLoadingBeatId(null);
        cancelProgressAnimation();
      };

      const handleEnded = () => {
        if (!isCurrentAudio()) return;
        isPlayingRef.current = false;
        setProgress(1);
        setIsPlaying(false);
        cancelProgressAnimation();
      };

      const startPreview = async () => {
        if (!isCurrentAudio()) return;

        const duration = audio.duration;
        if (!Number.isFinite(duration) || duration <= 0) {
          setAudioError(true);
          setLoadingBeatId(null);
          isPlayingRef.current = false;
          setIsPlaying(false);
          return;
        }

        const isFullMode = playbackModeRef.current === "full";
        const previewDuration = isFullMode
          ? duration
          : Math.min(PREVIEW_LENGTH, duration);
        const maxStart = isFullMode ? 0 : Math.max(0, duration - previewDuration);
        const previewStart = maxStart > 0 ? Math.random() * maxStart : 0;

        previewStartRef.current = previewStart;
        previewDurationRef.current = previewDuration;
        setActivePreviewDuration(previewDuration);

        const playPreview = async () => {
          if (!isCurrentAudio()) return;
          try {
            await audio.play();
            if (!isCurrentAudio()) return;
            isPlayingRef.current = true;
            setProgress(0);
            setIsPlaying(true);
            setAudioError(false);
            setLoadingBeatId(null);
          } catch {
            if (!isCurrentAudio()) return;
            isPlayingRef.current = false;
            setAudioError(true);
            setIsPlaying(false);
            setLoadingBeatId(null);
          }
        };

        if (previewStart <= 0.05) {
          await playPreview();
          return;
        }

        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          activeSeekHandler = null;
          playPreview();
        };
        activeSeekHandler = handleSeeked;

        audio.addEventListener("seeked", handleSeeked, { once: true });

        try {
          audio.currentTime = previewStart;
        } catch {
          audio.removeEventListener("seeked", handleSeeked);
          activeSeekHandler = null;
          await playPreview();
        }
      };

      audioCleanupRef.current = () => {
        audio.removeEventListener("loadedmetadata", startPreview);
        audio.removeEventListener("error", handleAudioError);
        audio.removeEventListener("ended", handleEnded);
        if (activeSeekHandler) {
          audio.removeEventListener("seeked", activeSeekHandler);
          activeSeekHandler = null;
        }
      };

      audio.addEventListener("loadedmetadata", startPreview, { once: true });
      audio.addEventListener("error", handleAudioError);
      audio.addEventListener("ended", handleEnded);
      audio.load();
    },
    [
      cancelProgressAnimation,
      clearAutoAdvanceTimer,
      replayCurrentBeat,
      resetAudioElement,
    ]
  );

  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // Synchronize reelIndex when activeBeat changes externally
  useEffect(() => {
    if (activeBeat && filteredBeats.length > 0) {
      const idx = filteredBeats.findIndex((b) => b.id === activeBeat.id);
      if (idx !== -1) {
        setReelIndex(idx);
      }
    }
  }, [activeBeat, filteredBeats]);

  const handleNextReel = useCallback(() => {
    if (filteredBeats.length === 0) return;
    let nextIdx;
    if (isShuffle && filteredBeats.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * filteredBeats.length);
      } while (nextIdx === reelIndex);
    } else {
      nextIdx = (reelIndex + 1) % filteredBeats.length;
    }
    setReelIndex(nextIdx);
    const nextBeat = filteredBeats[nextIdx];
    if (nextBeat) {
      handlePlay(nextBeat);
    }
  }, [filteredBeats, isShuffle, reelIndex, handlePlay]);

  const handlePrevReel = useCallback(() => {
    if (filteredBeats.length === 0) return;
    const prevIdx =
      (reelIndex - 1 + filteredBeats.length) % filteredBeats.length;
    setReelIndex(prevIdx);
    const prevBeat = filteredBeats[prevIdx];
    if (prevBeat) {
      handlePlay(prevBeat);
    }
  }, [filteredBeats, reelIndex, handlePlay]);

  useEffect(() => {
    handleNextReelRef.current = handleNextReel;
  }, [handleNextReel]);

  // Skip ±5 seconds within the current preview window
  const handleSkip = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio || !activeBeatRef.current) return;
    const previewStart = previewStartRef.current;
    const previewDuration = previewDurationRef.current;
    const previewEnd = previewStart + previewDuration;
    const newTime = Math.max(
      previewStart,
      Math.min(audio.currentTime + seconds, previewEnd - 0.1)
    );
    try {
      audio.currentTime = newTime;
      const elapsed = newTime - previewStart;
      setProgress(Math.max(0, Math.min(elapsed / previewDuration, 1)));
    } catch {}
  }, []);

  // Seek to exact fraction [0..1] within the current preview window (Req #5)
  const handleSeekFraction = useCallback((fraction) => {
    const clamped = Math.max(0, Math.min(Number(fraction) || 0, 1));
    setProgress(clamped);
    const audio = audioRef.current;
    if (!audio || !activeBeatRef.current) return;
    const previewStart = previewStartRef.current;
    const previewDuration = previewDurationRef.current;
    if (!Number.isFinite(previewDuration) || previewDuration <= 0) return;
    const targetTime = previewStart + clamped * previewDuration;
    try {
      audio.currentTime = Math.max(
        previewStart,
        Math.min(targetTime, previewStart + previewDuration - 0.05)
      );
    } catch {}
  }, []);

  // Open Reel Mode on specific beat when navigated via /beats?reel=<beatId> (Req #7)
  useEffect(() => {
    const reelTarget = searchParams.get("reel");
    if (!reelTarget || beats.length === 0) return;
    const idx = beats.findIndex((b) => b.id === reelTarget);
    if (idx !== -1) {
      setActiveFilter("all");
      setReelIndex(idx);
      setIsReelMode(true);
      if (activeBeatRef.current?.id !== beats[idx].id) {
        handlePlay(beats[idx]);
      }
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("reel");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, beats, handlePlay, setSearchParams]);

  // Cycle repeat mode: all → one → none → all
  const handleCycleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === "all") return "one";
      if (prev === "one") return "none";
      return "all";
    });
  }, []);

  useEffect(() => {
    if (!isReelMode) return undefined;
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNextReel();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevReel();
      } else if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        if (filteredBeats[reelIndex]) {
          handlePlay(filteredBeats[reelIndex]);
        }
      } else if (e.key === "Escape") {
        setIsReelMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isReelMode,
    handleNextReel,
    handlePrevReel,
    filteredBeats,
    reelIndex,
    handlePlay,
  ]);

  const enterReelOrGrid = (targetReel) => {
    setIsReelMode(targetReel);
    if (targetReel && filteredBeats.length > 0) {
      const idx = activeBeat
        ? filteredBeats.findIndex((b) => b.id === activeBeat.id)
        : 0;
      const targetIdx = idx !== -1 ? idx : 0;
      setReelIndex(targetIdx);
      if (!isPlaying && filteredBeats[targetIdx]) {
        handlePlay(filteredBeats[targetIdx]);
      }
    }
  };

  return (
    <main className="beats-page">
      <SeoHead
        title="chomkaMUSIC™ Studio Beats | silachomka"
        description="Explore original studio beats by silachomka. Listen, license on Selar, and craft your next release with chomkaMUSIC™ Studio."
        path="/beats"
        image="/beats-image.png"
        icon="/beats-image.png"
        imageAlt="chomkaMUSIC™ Studio Beats by silachomka"
      />

      {/* =================================================
          HERO (CONSTRAINED & ATMOSPHERIC)
          ================================================= */}
      <section
        className="beats-hero"
        aria-label="chomkaMUSIC™ Studio Beats Hero"
      >
        <BeatHeroSlideshow beats={beats} />

        <div className="hero-slideshow-overlay" aria-hidden="true" />

        <div className="beats-hero-content">
          <p className="eyebrow">chomkaMUSIC™ studio</p>
          <h1>BEATS</h1>
          <p className="beats-intro">
            Original studio production by silachomka.
            <br />
            Listen, license on Selar, and craft your next release.
          </p>

          <a
            href="https://www.instagram.com/chomkamusicstudio/?__pwa=1"
            target="_blank"
            rel="noopener noreferrer"
            className="beats-studio-ig-badge"
          >
            <CameraIcon size={14} /> @chomkamusicstudio on Instagram{" "}
            <UpRightArrowIcon size={14} />
          </a>
        </div>
      </section>

      {/* =================================================
          REDESIGNED STUDIO CATALOGUE HEADER (Req #13 & #14)
          Hierarchy: Primary | View & Playback Mode | Genre Filters | Commerce Currency
          ================================================= */}
      <section className="beats-toolbar" aria-label="Beat catalog controls">
        {/* 1. Primary: Catalogue Count */}
        <div className="beats-toolbar-primary">
          <span className="toolbar-label">CATALOG</span>
          <span className="toolbar-count">
            {filteredBeats.length}{" "}
            {filteredBeats.length === 1 ? "BEAT" : "BEATS"}
          </span>
        </div>

        {/* 2. View & Playback Mode Toggles */}
        <div className="beats-toolbar-modes">
          {/* Grid / Reel View Segmented Control */}
          <div
            className="beats-segmented-group"
            role="group"
            aria-label="Catalog view mode"
          >
            <button
              type="button"
              className={`beats-segment-btn ${!isReelMode ? "is-active" : ""}`}
              onClick={() => enterReelOrGrid(false)}
              aria-pressed={!isReelMode}
            >
              <GridIcon size={13} />
              <span>GRID</span>
            </button>
            <button
              type="button"
              className={`beats-segment-btn reel-mode-toggle-btn ${
                isReelMode ? "is-active" : ""
              }`}
              onClick={() => enterReelOrGrid(true)}
              aria-pressed={isReelMode}
            >
              <ReelIcon size={13} />
              <span>REEL</span>
            </button>
          </div>

          {/* 1-Minute / Full Track Playback Mode Segmented Control */}
          <div
            className="beats-segmented-group"
            role="group"
            aria-label="Audio playback length"
          >
            <button
              type="button"
              className={`beats-segment-btn ${
                playbackMode === "1min" ? "is-active" : ""
              }`}
              onClick={() => setPlaybackMode("1min")}
              aria-pressed={playbackMode === "1min"}
              title="Play 1-minute random preview"
            >
              <span>1 MIN</span>
            </button>
            <button
              type="button"
              className={`beats-segment-btn ${
                playbackMode === "full" ? "is-active" : ""
              }`}
              onClick={() => setPlaybackMode("full")}
              aria-pressed={playbackMode === "full"}
              title="Play full beat track"
            >
              <span>FULL TRACK</span>
            </button>
          </div>
        </div>

        {/* 3. Genre Filters + 4. Commerce Currency Selector */}
        <div
          className="filter-toolbar beats-filter-toolbar"
          role="group"
          aria-label="Filter beats by genre"
        >
          <div className="filter-hamburger">
            <button
              type="button"
              className="filter-toggle-btn"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              aria-expanded={isFilterMenuOpen}
            >
              {filters.find((f) => f.id === activeFilter)?.label}
              <span className="filter-icon">
                <DownCaretIcon />
              </span>
            </button>

            {isFilterMenuOpen && (
              <div className="filter-dropdown">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`filter-dropdown-item ${
                      activeFilter === filter.id ? "is-active" : ""
                    }`}
                    onClick={() => {
                      handleFilterChange(filter.id);
                      setIsFilterMenuOpen(false);
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="filter-desktop-list">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`filter-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => handleFilterChange(filter.id)}
                  aria-pressed={isActive}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Authoritative Selar Currency Switcher */}
          <div className="beats-toolbar-currency">
            <label
              htmlFor="beats-currency-select"
              className="beats-currency-label"
            >
              CURRENCY
            </label>
            <select
              id="beats-currency-select"
              className="beats-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Select currency for beat licensing"
            >
              {supportedCurrencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* =================================================
          BEAT CONTENT (REEL MODE OR GRID VIEW)
          ================================================= */}
      {isReelMode ? (
        <BeatReelPlayer
          beats={filteredBeats}
          currentIndex={reelIndex}
          onNext={handleNextReel}
          onPrev={handlePrevReel}
          isShuffle={isShuffle}
          onToggleShuffle={() => setIsShuffle((prev) => !prev)}
          isPlaying={isPlaying}
          isLoading={loadingBeatId === filteredBeats[reelIndex]?.id}
          progress={progress}
          previewDuration={activePreviewDuration}
          playbackMode={playbackMode}
          onChangePlaybackMode={setPlaybackMode}
          onPlay={handlePlay}
          onExitReel={() => setIsReelMode(false)}
          onSkip={handleSkip}
          onSeek={handleSeekFraction}
          repeatMode={repeatMode}
          onCycleRepeat={handleCycleRepeat}
          getBeatStartingPrice={getBeatStartingPrice}
        />
      ) : (
        <section className="beats-grid" aria-label="Beat catalog">
          {filteredBeats.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              isPlaying={activeBeat?.id === beat.id && isPlaying}
              isLoading={loadingBeatId === beat.id}
              progress={activeBeat?.id === beat.id ? progress : 0}
              onPlay={handlePlay}
              startingPrice={getBeatStartingPrice(beat)}
            />
          ))}
        </section>
      )}

      {/* =================================================
          EMPTY STATE
          ================================================= */}
      {filteredBeats.length === 0 && (
        <div className="beat-audio-error" role="status">
          No beats are currently available in this category.
        </div>
      )}

      {/* =================================================
          AUDIO ERROR
          ================================================= */}
      {audioError && (
        <div className="beat-audio-error" role="status">
          Unable to play this beat preview right now. Please try again.
        </div>
      )}

      {/* =================================================
          EXCLUSIVE LICENSING CTA (Upgraded Glass Card)
          ================================================= */}
      <div className="exclusive-wrapper">
        <section className="exclusive-section">
          <p className="eyebrow">Private licensing</p>
          <h2>Want exclusive rights?</h2>
          <p>
            Exclusive rights buyout and customized master licensing are
            negotiated privately. Select any beat to submit a direct acquisition
            offer to chomkaMUSIC™ Studio.
          </p>

          <button
            type="button"
            className="exclusive-link-btn"
            onClick={() => setIsExclusiveModalOpen(true)}
          >
            Make an Exclusive Offer <RightArrowIcon />
          </button>
        </section>
      </div>

      <ExclusiveBeatModal
        isOpen={isExclusiveModalOpen}
        onClose={() => setIsExclusiveModalOpen(false)}
        beats={beats}
      />
    </main>
  );
}

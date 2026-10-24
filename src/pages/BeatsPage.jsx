import { DownCaretIcon, PlayIcon, PauseIcon, RightArrowIcon, UpRightArrowIcon, ShuffleIcon, RepeatIcon, RepeatOneIcon, PreviousTrackIcon, NextTrackIcon, SkipBackIcon, SkipForwardIcon, GridIcon, ReelIcon, CameraIcon } from '../components/Icons';
// src/pages/BeatsPage.jsx

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

import { useChomkaStore } from "../data/store";
import BeatHeroSlideshow from "../components/BeatHeroSlideshow";
import ExclusiveBeatModal from "../components/ExclusiveBeatModal";
import SeoHead from "../components/SeoHead";
import ShareLinkBox from "../components/ShareLinkBox";
import { absoluteUrl, getBeatProducer, getBeatSource } from "../data/credits";

const PREVIEW_LENGTH = 60;

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
   BEAT CARD
   ========================================================= */

function BeatCard({ beat, isPlaying, isLoading, progress, onPlay }) {
  const videoRef = useRef(null);

  /* Visual Video Autoplay */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    const playVideo = () => {
      if (document.visibilityState === "hidden") return;
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        playVideo();
      } else {
        video.pause();
      }
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener("loadeddata", playVideo, { once: true });
      video.addEventListener("canplay", playVideo, { once: true });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      video.removeEventListener("loadeddata", playVideo);
      video.removeEventListener("canplay", playVideo);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      video.pause();
    };
  }, [beat.video]);

  return (
    <article className={`beat-card ${isPlaying ? "is-playing" : ""}`}>
      {/* Visualizer Frame */}
      <div className={`beat-art ${isPlaying ? "is-playing" : ""}`}>
        {beat.video?.endsWith(".gif") ? (
          <img
            src={beat.video}
            alt=""
            className={`beat-video${beat.letterboxed ? " is-letterboxed" : ""}`}
            style={{ objectFit: "cover" }}
            aria-hidden="true"
          />
        ) : (
          <video
            ref={videoRef}
            className={`beat-video${beat.letterboxed ? " is-letterboxed" : ""}`}
            src={beat.video}
            poster={beat.image}
            muted
            autoPlay
            playsInline
            loop
            preload="metadata"
            aria-hidden="true"
          />
        )}

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
          className={`beat-play ${isPlaying ? "is-playing" : ""}`}
          onClick={() => onPlay(beat)}
          aria-label={isLoading ? `Loading ${beat.title}` : isPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
          aria-pressed={isPlaying}
          aria-busy={isLoading}
        >
          <ProgressRing progress={progress} isPlaying={isPlaying} />
          {isLoading ? (
            <div className="beat-loading-spinner" aria-hidden="true" />
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
            prod. {getBeatProducer(beat)}<span className="credit-dot"> · </span>{getBeatSource(beat)}
          </p>
        </div>

        <p className="beat-price">
          From ₦15,000
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
      </div>
    </article>
  );
}

/* =========================================================
   BEAT REEL PLAYER (PORTRAIT 9:16 EXPERIENCE)
   ========================================================= */

function BeatReelPlayer({
  beats,
  currentIndex,
  onNext,
  onPrev,
  onReplay,
  isShuffle,
  onToggleShuffle,
  isPlaying,
  isLoading,
  progress,
  onPlay,
  onExitReel,
  onSkip,
  repeatMode,
  onCycleRepeat,
}) {
  const currentBeat = beats[currentIndex];
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  }, [currentBeat?.video]);

  if (!currentBeat) return null;

  const elapsedSeconds = Math.min(60, Math.floor(progress * 60));

  return (
    <div className="beat-reel-wrapper" style={{ margin: "20px auto 40px", maxWidth: "440px", padding: "0 12px" }}>
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
          boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 30px rgba(223, 194, 125, 0.15)",
          border: "1px solid rgba(223, 194, 125, 0.3)",
        }}
      >
        {/* Background Visualizer / Video */}
        {currentBeat.video?.endsWith(".gif") ? (
          <img
            src={currentBeat.video}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <video
            ref={videoRef}
            src={currentBeat.video}
            poster={currentBeat.image}
            muted
            autoPlay
            playsInline
            loop
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Cinematic Gradient Overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.92) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Top Header Bar: 60s Progress Bar & Controls */}
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
          {/* 60-Second Segment Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "2px",
              overflow: "hidden",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(progress * 100, 100))}%`,
                height: "100%",
                background: "var(--gold)",
                boxShadow: "0 0 8px var(--gold)",
                transition: "width 0.1s linear",
              }}
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
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(0,0,0,0.5)",
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(223, 194, 125, 0.3)",
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
              0:{String(elapsedSeconds).padStart(2, "0")} / 1:00 Preview
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
                {currentIndex + 1} of {beats.length}
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
                  fontSize: "14px",
                }}
                title="Exit Reel Mode"
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
            inset: "80px 0 190px 0",
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
                <div className="beat-loading-spinner" />
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
            gap: "10px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--gold)",
                  letterSpacing: "0.1em",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background: "rgba(223,194,125,0.15)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                {currentBeat.genre || "Instrumental"}
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                ₦15,000+
              </span>
            </div>
            <h2 style={{ margin: "2px 0 4px", fontSize: "20px", color: "#fff", fontWeight: 700 }}>
              {currentBeat.title}
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
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
              style={{
                background: isShuffle ? "rgba(223, 194, 125, 0.25)" : "transparent",
                border: isShuffle ? "1px solid var(--gold)" : "1px solid transparent",
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

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={() => onPlay(currentBeat)}
              title={isPlaying ? "Pause Preview" : "Play Preview"}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "var(--gold)",
                border: "none",
                color: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 0 12px var(--gold-glow)",
              }}
            >
              {isPlaying ? <PauseIcon size={20} color="#000" /> : <PlayIcon size={20} color="#000" />}
            </button>

            {/* Next Beat */}
            <button
              type="button"
              onClick={onNext}
              title="Next Beat"
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

            {/* Skip Back 5s */}
            <button
              type="button"
              onClick={() => onSkip && onSkip(-5)}
              title="Skip back 5 seconds"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.7)",
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

            {/* Repeat Mode Toggle */}
            <button
              type="button"
              onClick={onCycleRepeat}
              title={
                repeatMode === 'one' ? 'Repeat: One' :
                repeatMode === 'all' ? 'Repeat: All' : 'Repeat: Off'
              }
              style={{
                background: repeatMode !== 'none' ? "rgba(223, 194, 125, 0.2)" : "transparent",
                border: repeatMode !== 'none' ? "1px solid var(--gold)" : "1px solid transparent",
                color: repeatMode !== 'none' ? "var(--gold)" : "rgba(255,255,255,0.5)",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {repeatMode === 'one' ? <RepeatOneIcon size={15} /> : <RepeatIcon size={15} />}
            </button>

            {/* Skip Forward 5s */}
            <button
              type="button"
              onClick={() => onSkip && onSkip(5)}
              title="Skip forward 5 seconds"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.7)",
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
  const audioRef = useRef(null);
  const activeBeatRef = useRef(null);
  const isPlayingRef = useRef(false);
  const previewStartRef = useRef(0);
  const previewDurationRef = useRef(0);
  const audioGenerationRef = useRef(0);
  const animationFrameRef = useRef(null);
  const updateProgressRef = useRef(null);
  const repeatModeRef = useRef('all');
  const handleNextReelRef = useRef(null);

  const [activeBeat, setActiveBeat] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [loadingBeatId, setLoadingBeatId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isExclusiveModalOpen, setIsExclusiveModalOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isReelMode, setIsReelMode] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('all'); // 'none' | 'all' | 'one'

  useEffect(() => {
    activeBeatRef.current = activeBeat;
  }, [activeBeat]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

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

  const resetAudioElement = useCallback((audio) => {
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore
    }
    audio.removeAttribute("src");
    audio.load();
  }, []);

  useEffect(() => {
    return () => {
      audioGenerationRef.current += 1;
      cancelProgressAnimation();

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }

      audioRef.current = null;
      activeBeatRef.current = null;
      isPlayingRef.current = false;
      previewStartRef.current = 0;
      previewDurationRef.current = 0;
    };
  }, [cancelProgressAnimation]);

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

    setProgress(nextProgress);

    if (elapsed >= previewDuration || audio.ended || nextProgress >= 1) {
      audio.pause();
      setProgress(1);
      isPlayingRef.current = false;
      setIsPlaying(false);
      cancelProgressAnimation();

      // Repeat mode logic
      const mode = repeatModeRef.current;
      if (mode === 'one') {
        // Replay the same beat from preview start
        setTimeout(() => {
          if (audioRef.current === audio && activeBeatRef.current) {
            audio.currentTime = previewStartRef.current;
            setProgress(0);
            audio.play().then(() => {
              isPlayingRef.current = true;
              setIsPlaying(true);
            }).catch(() => {});
          }
        }, 150);
      } else if (mode === 'all' && handleNextReelRef.current) {
        // Auto-advance to next beat
        setTimeout(() => {
          if (handleNextReelRef.current) {
            handleNextReelRef.current();
          }
        }, 300);
      }
      return;
    }

    if (updateProgressRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateProgressRef.current);
    }
  }, [cancelProgressAnimation]);

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

    if (Math.abs(audio.currentTime - previewStart) > 0.05) {
      await new Promise((resolve) => {
        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          resolve();
        };
        audio.addEventListener("seeked", handleSeeked, { once: true });
      });
    }

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

      /* Replay active */
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

      /* Play new */
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
        const artSrc = beat.image
          ? window.location.origin + beat.image
          : window.location.origin + "/og-image.png";
        navigator.mediaSession.metadata = new MediaMetadata({
          title: beat.title,
          artist: "chomkaMUSIC\u2122 Studio",
          album: "chomkaMUSIC\u2122 Studio Beats",
          artwork: [{ src: artSrc, sizes: "512x512", type: "image/jpeg" }],
        });
      }

      const isCurrentAudio = () =>
        audioRef.current === audio &&
        audioGenerationRef.current === generation;

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

        const previewDuration = Math.min(PREVIEW_LENGTH, duration);
        const maxStart = Math.max(0, duration - previewDuration);
        const previewStart = maxStart > 0 ? Math.random() * maxStart : 0;

        previewStartRef.current = previewStart;
        previewDurationRef.current = previewDuration;

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

        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          playPreview();
        };

        audio.addEventListener("seeked", handleSeeked, { once: true });

        try {
          audio.currentTime = previewStart;
        } catch {
          audio.removeEventListener("seeked", handleSeeked);
          await playPreview();
        }
      };

      audio.addEventListener("loadedmetadata", startPreview, { once: true });
      audio.addEventListener("error", handleAudioError);
      audio.addEventListener("ended", handleEnded);
      audio.load();
    },
    [cancelProgressAnimation, replayCurrentBeat, resetAudioElement]
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
    const prevIdx = (reelIndex - 1 + filteredBeats.length) % filteredBeats.length;
    setReelIndex(prevIdx);
    const prevBeat = filteredBeats[prevIdx];
    if (prevBeat) {
      handlePlay(prevBeat);
    }
  }, [filteredBeats, reelIndex, handlePlay]);

  const handleReplayReel = useCallback(async () => {
    if (audioRef.current) {
      await replayCurrentBeat(audioRef.current);
    }
  }, [replayCurrentBeat]);

  // Sync ref for auto-advance from updateProgress
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
    const newTime = Math.max(previewStart, Math.min(audio.currentTime + seconds, previewEnd - 0.1));
    try {
      audio.currentTime = newTime;
      const elapsed = newTime - previewStart;
      setProgress(Math.max(0, Math.min(elapsed / previewDuration, 1)));
    } catch {
      // ignore seek errors
    }
  }, []);

  // Cycle repeat mode: all → one → none → all
  const handleCycleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'all') return 'one';
      if (prev === 'one') return 'none';
      return 'all';
    });
  }, []);

  useEffect(() => {
    if (!isReelMode) return undefined;
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
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
  }, [isReelMode, handleNextReel, handlePrevReel, filteredBeats, reelIndex, handlePlay]);

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
      <section className="beats-hero" aria-label="chomkaMUSIC™ Studio Beats Hero">
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
            <CameraIcon size={14} /> @chomkamusicstudio on Instagram <UpRightArrowIcon size={14} />
          </a>
        </div>
      </section>

      {/* =================================================
          CATALOG TOOLBAR
          ================================================= */}
      <section className="beats-toolbar" aria-label="Beat catalog filters">
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <span className="toolbar-label">Catalog</span>
            <span className="toolbar-count">
              {filteredBeats.length} {filteredBeats.length === 1 ? "Beat" : "Beats"}
            </span>
          </div>

          <button
            type="button"
            className="reel-mode-toggle-btn"
            onClick={() => {
              const nextMode = !isReelMode;
              setIsReelMode(nextMode);
              if (nextMode && filteredBeats.length > 0) {
                const idx = activeBeat ? filteredBeats.findIndex((b) => b.id === activeBeat.id) : 0;
                const targetIdx = idx !== -1 ? idx : 0;
                setReelIndex(targetIdx);
                if (!isPlaying && filteredBeats[targetIdx]) {
                  handlePlay(filteredBeats[targetIdx]);
                }
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "20px",
              background: isReelMode ? "var(--gold)" : "rgba(223, 194, 125, 0.12)",
              color: isReelMode ? "#000" : "var(--gold)",
              border: "1px solid var(--gold)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
            aria-pressed={isReelMode}
          >
            {isReelMode ? <><GridIcon size={14} /> Grid View</> : <><ReelIcon size={14} /> Reels Mode</>}
          </button>
        </div>

        <div className="filter-toolbar beats-filter-toolbar" role="group" aria-label="Filter beats by genre">
          <div className="filter-hamburger">
            <button
              className="filter-toggle-btn"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              aria-expanded={isFilterMenuOpen}
            >
              {filters.find(f => f.id === activeFilter)?.label} 
              <span className="filter-icon"><DownCaretIcon /></span>
            </button>
            
            {isFilterMenuOpen && (
              <div className="filter-dropdown">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`filter-dropdown-item ${activeFilter === filter.id ? "is-active" : ""}`}
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
          onReplay={handleReplayReel}
          isShuffle={isShuffle}
          onToggleShuffle={() => setIsShuffle((prev) => !prev)}
          isPlaying={isPlaying}
          isLoading={loadingBeatId === filteredBeats[reelIndex]?.id}
          progress={progress}
          onPlay={handlePlay}
          onExitReel={() => setIsReelMode(false)}
          onSkip={handleSkip}
          repeatMode={repeatMode}
          onCycleRepeat={handleCycleRepeat}
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
          Unable to play this beat. Verify that the MP3 asset exists in{" "}
          <strong>public/beats</strong>.
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
            Exclusive rights buyout and customized master licensing are negotiated privately. Select any beat to submit a direct acquisition offer to chomkaMUSIC™ Studio.
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
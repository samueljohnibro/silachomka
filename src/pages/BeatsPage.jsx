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
              {isPlaying ? "❚❚" : "▶"}
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
          License Beat →
        </Link>
      </div>
    </article>
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

  const [activeBeat, setActiveBeat] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [loadingBeatId, setLoadingBeatId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isExclusiveModalOpen, setIsExclusiveModalOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  useEffect(() => {
    activeBeatRef.current = activeBeat;
  }, [activeBeat]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

  return (
    <main className="beats-page">
      <SeoHead
        title="chomkaMUSIC™ Studio Beats | Silachomka"
        description="Explore original studio beats by silachomka. Listen, license on Selar, and craft your next release with chomkaMUSIC™ Studio."
        path="/beats"
        image={(beats.length > 0 && beats[0].image) ? beats[0].image : "/og-image.png"}
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
            📸 @chomkamusicstudio on Instagram ↗
          </a>
        </div>
      </section>

      {/* =================================================
          CATALOG TOOLBAR
          ================================================= */}
      <section className="beats-toolbar" aria-label="Beat catalog filters">
        <div>
          <span className="toolbar-label">Catalog</span>
          <span className="toolbar-count">
            {filteredBeats.length} {filteredBeats.length === 1 ? "Beat" : "Beats"}
          </span>
        </div>

        <div className="filter-toolbar beats-filter-toolbar" role="group" aria-label="Filter beats by genre">
          <div className="filter-hamburger">
            <button
              className="filter-toggle-btn"
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              aria-expanded={isFilterMenuOpen}
            >
              {filters.find(f => f.id === activeFilter)?.label} 
              <span className="filter-icon">▼</span>
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
          BEAT GRID
          ================================================= */}
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
            Make an Exclusive Offer →
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
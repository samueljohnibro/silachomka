import {
  PlayIcon,
  PauseIcon,
  LeftArrowIcon,
  RightArrowIcon,
  UpRightArrowIcon,
  LightningIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  PreviousTrackIcon,
  NextTrackIcon,
  SkipBackIcon,
  SkipForwardIcon,
  LoadingSpinner,
  CrownIcon,
  ReelIcon,
} from "../components/Icons";
// src/pages/BeatDetailPage.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import { normalizeBeat } from "../data/api";
import { useCurrency } from "../data/CurrencyContext";
import BeatArtwork from "../components/BeatArtwork";
import SeoHead from "../components/SeoHead";
import ShareLinkBox from "../components/ShareLinkBox";
import {
  absoluteUrl,
  getBeatProducer,
  getBeatSource,
} from "../data/credits";

const PREVIEW_LENGTH = 45;

export default function BeatDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const licenseParam = searchParams.get("license");
  const { beats, isLoading: isStoreLoading } = useChomkaStore();
  const {
    currency,
    setCurrency,
    supportedCurrencies,
    getBeatPrice,
    playbackMode,
    setPlaybackMode,
  } = useCurrency();

  const [fetchedBeat, setFetchedBeat] = useState(null);
  const [isFetchingBeat, setIsFetchingBeat] = useState(false);

  /* Locate the authoritative beat from store or direct API fetch for newly created beats */
  const storeBeat = useMemo(() => {
    if (!Array.isArray(beats)) return null;
    return beats.find((item) => item.id === id || item.slug === id) || null;
  }, [beats, id]);

  useEffect(() => {
    if (storeBeat) {
      setFetchedBeat(null);
      return;
    }
    if (!id) return;
    let cancelled = false;
    setIsFetchingBeat(true);
    fetch(`/api/beats/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && data.id) {
          setFetchedBeat(normalizeBeat({ ...data, showVisualTitle: true }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsFetchingBeat(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, storeBeat]);

  const beat = storeBeat || fetchedBeat;

  const currentBeatIndex = useMemo(() => {
    if (!beat || !Array.isArray(beats) || beats.length === 0) return -1;
    return beats.findIndex((b) => b.id === beat.id || b.slug === beat.id);
  }, [beats, beat]);

  /* Audio & Full Player Controls State (Req #13 & #16) */
  const audioRef = useRef(null);
  const audioCleanupRef = useRef(null);
  const previewStartRef = useRef(0);
  const previewDurationRef = useRef(0);
  const playbackModeRef = useRef(playbackMode);
  const repeatModeRef = useRef("all");
  const isShuffleRef = useRef(false);
  const autoPlayOnSwitchRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [durationTime, setDurationTime] = useState("0:00");
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("all"); // 'all' | 'one' | 'none'

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  /* Licensing State — defaults to exclusive if requested in URL */
  const [selectedLicense, setSelectedLicense] = useState(
    licenseParam === "exclusive" ? "exclusive" : "premium"
  );

  useEffect(() => {
    if (licenseParam === "exclusive") {
      const timer = setTimeout(() => {
        const offerEl = document.getElementById("offer-form");
        if (offerEl) {
          offerEl.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [licenseParam]);

  /* Offer form state */
  const [offerName, setOfferName] = useState("");
  const [offerEmail, setOfferEmail] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(false);
  const [offerError, setOfferError] = useState(null);

  /* Format seconds to M:SS */
  const formatTime = useCallback((seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }, []);

  const disposeAudio = useCallback(() => {
    if (audioCleanupRef.current) {
      try {
        audioCleanupRef.current();
      } catch {}
      audioCleanupRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch {}
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setProgress(0);
    setCurrentTime("0:00");
    setDurationTime("0:00");
  }, []);

  /* Cleanup audio on unmount */
  useEffect(() => {
    return () => {
      disposeAudio();
    };
  }, [disposeAudio]);

  /* Navigate to Previous or Next Beat */
  const handleNextBeat = useCallback(() => {
    if (!Array.isArray(beats) || beats.length === 0) return;
    let nextIdx = 0;
    if (isShuffleRef.current && beats.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * beats.length);
      } while (nextIdx === currentBeatIndex);
    } else if (currentBeatIndex >= 0) {
      nextIdx = (currentBeatIndex + 1) % beats.length;
    }
    const nextTarget = beats[nextIdx];
    if (nextTarget) {
      autoPlayOnSwitchRef.current = true;
      navigate(`/beats/${nextTarget.id}`);
    }
  }, [beats, currentBeatIndex, navigate]);

  const handlePrevBeat = useCallback(() => {
    if (!Array.isArray(beats) || beats.length === 0) return;
    const prevIdx =
      currentBeatIndex >= 0
        ? (currentBeatIndex - 1 + beats.length) % beats.length
        : 0;
    const prevTarget = beats[prevIdx];
    if (prevTarget) {
      autoPlayOnSwitchRef.current = true;
      navigate(`/beats/${prevTarget.id}`);
    }
  }, [beats, currentBeatIndex, navigate]);

  const handleNextBeatRef = useRef(handleNextBeat);
  useEffect(() => {
    handleNextBeatRef.current = handleNextBeat;
  }, [handleNextBeat]);

  /* Initialize & Play Current Beat Audio (Full Track Experience) */
  const startBeatPlayback = useCallback(
    (targetBeat) => {
      if (!targetBeat?.audio) return;
      disposeAudio();

      const audio = new Audio(targetBeat.audio);
      audio.preload = "metadata";
      audioRef.current = audio;

      if ("mediaSession" in navigator) {
        try {
          const artSrc = targetBeat.image
            ? window.location.origin + targetBeat.image
            : window.location.origin + "/og-image.png";
          navigator.mediaSession.metadata = new MediaMetadata({
            title: targetBeat.title,
            artist: "chomkaMUSIC\u2122 Studio",
            album: "chomkaMUSIC™ Studio Beats",
            artwork: [{ src: artSrc, sizes: "512x512", type: "image/jpeg" }],
          });
        } catch {}
      }

      setIsLoading(true);
      let completionHandled = false;

      const handleTrackFinish = () => {
        if (audioRef.current !== audio || completionHandled) return;
        completionHandled = true;
        audio.pause();
        const mode = repeatModeRef.current;
        if (mode === "one") {
          try {
            audio.currentTime = previewStartRef.current;
          } catch {}
          setProgress(0);
          setCurrentTime("0:00");
          completionHandled = false;
          audio
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        } else if (mode === "all" && handleNextBeatRef.current) {
          setIsPlaying(false);
          handleNextBeatRef.current();
        } else {
          // repeat-off ('none'): stop playback cleanly at end of track
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime("0:00");
        }
      };

      const onLoadedMetadata = () => {
        if (audioRef.current !== audio) return;
        const totalDur = audio.duration || 0;
        previewStartRef.current = 0;
        previewDurationRef.current = totalDur;
        setDurationTime(formatTime(totalDur));
        setCurrentTime("0:00");

        audio
          .play()
          .then(() => {
            if (audioRef.current !== audio) return;
            setIsLoading(false);
            setIsPlaying(true);
          })
          .catch(() => {
            if (audioRef.current !== audio) return;
            setIsLoading(false);
            setIsPlaying(false);
          });
      };

      const onSeeked = () => {
        if (audioRef.current !== audio || !audio.duration) return;
        if (audio.currentTime < (previewDurationRef.current || audio.duration) - 0.15) {
          completionHandled = false;
        }
      };

      const onTimeUpdate = () => {
        if (audioRef.current !== audio || !audio.duration) return;
        const start = previewStartRef.current;
        const winDur = previewDurationRef.current || audio.duration;
        const elapsed = Math.max(0, audio.currentTime - start);
        const nextProg = Math.max(0, Math.min(elapsed / winDur, 1));
        setProgress(nextProg);
        setCurrentTime(formatTime(Math.min(elapsed, winDur)));

        if (elapsed >= winDur || audio.ended) {
          handleTrackFinish();
        }
      };

      const onEnded = () => {
        handleTrackFinish();
      };

      const onError = () => {
        if (audioRef.current !== audio) return;
        setIsLoading(false);
        setIsPlaying(false);
      };

      audioCleanupRef.current = () => {
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("seeked", onSeeked);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
      };

      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("seeked", onSeeked);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
      audio.load();
    },
    [disposeAudio, formatTime]
  );

  /* Reset or auto-play when switching between beats */
  useEffect(() => {
    disposeAudio();
    if (beat && autoPlayOnSwitchRef.current) {
      autoPlayOnSwitchRef.current = false;
      startBeatPlayback(beat);
    }
  }, [beat?.id, disposeAudio, startBeatPlayback]);

  /* Audio play/pause toggle */
  const togglePlay = useCallback(() => {
    if (!beat?.audio) return;

    if (!audioRef.current) {
      startBeatPlayback(beat);
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const start = previewStartRef.current;
        const winDur = previewDurationRef.current || audioRef.current.duration || 0;
        if (
          audioRef.current.ended ||
          (winDur > 0 && audioRef.current.currentTime >= start + winDur - 0.1)
        ) {
          try {
            audioRef.current.currentTime = start;
          } catch {}
        }
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [beat, isPlaying, startBeatPlayback]);

  /* Interactive Draggable Seek Handler */
  const seekBarRef = useRef(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);

  const seekToClientX = useCallback((clientX) => {
    const bar = seekBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (!rect.width) return;
    const nextProgress = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    setProgress(nextProgress);
    if (audioRef.current && audioRef.current.duration) {
      const start = previewStartRef.current;
      const winDur = previewDurationRef.current || audioRef.current.duration;
      try {
        audioRef.current.currentTime = start + nextProgress * winDur;
      } catch {}
    }
  }, []);

  const handleSeekPointerDown = useCallback(
    (e) => {
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

  const seekBackward = () => {
    if (!audioRef.current) return;
    const start = previewStartRef.current;
    const ct = audioRef.current.currentTime;
    audioRef.current.currentTime = Math.max(start, ct - 5);
  };

  const seekForward = () => {
    if (!audioRef.current) return;
    const start = previewStartRef.current;
    const winDur = previewDurationRef.current || audioRef.current.duration || 0;
    const ct = audioRef.current.currentTime;
    audioRef.current.currentTime = Math.min(start + winDur, ct + 5);
  };

  const cycleRepeatMode = () => {
    setRepeatMode((prev) => {
      if (prev === "all") return "one";
      if (prev === "one") return "none";
      return "all";
    });
  };

  /* Authoritative Selar Licensing Framework Matrix */
  const selarBasic = getBeatPrice(beat, "basic");
  const selarPremium = getBeatPrice(beat, "premium");
  const selarUltimate = getBeatPrice(beat, "ultimate");

  const basicPriceFormatted =
    selarBasic?.formatted || (currency === "NGN" ? "₦15,000" : "From Selar");
  const premiumPriceFormatted =
    selarPremium?.formatted || (currency === "NGN" ? "₦30,000" : "From Selar");
  const ultimatePriceFormatted =
    selarUltimate?.formatted || (currency === "NGN" ? "₦60,000" : "From Selar");

  const LICENSES = {
    basic: {
      name: "Standard Lease",
      short: "Basic",
      price: basicPriceFormatted,
      priceStatus: (
        <>
          <LightningIcon size={16} style={{ color: "#FFD700" }} /> Instant Selar
          Checkout
        </>
      ),
      perks: [
        "✓ High-Quality MP3 Audio File",
        "✓ Non-Exclusive Commercial Distribution Rights",
        "✓ Credit: (Prod. silachomka)",
        "✓ Instant Delivery via Selar",
      ],
      btnText: `Purchase Standard Lease (${basicPriceFormatted}) on Selar`,
      url: selarBasic?.url || beat?.selar?.basic || beat?.selar_basic_url,
    },
    premium: {
      name: "Premium WAV",
      short: "Premium",
      price: premiumPriceFormatted,
      priceStatus: (
        <>
          <LightningIcon size={16} style={{ color: "#FFD700" }} /> Instant Selar
          Checkout
        </>
      ),
      perks: [
        "✓ 24-bit Studio Master WAV + MP3",
        "✓ Radio, Streaming & Performance Clearance",
        "✓ High-Definition Mix Delivery",
        "✓ Instant Delivery via Selar",
      ],
      btnText: `Purchase Premium WAV (${premiumPriceFormatted}) on Selar`,
      url: selarPremium?.url || beat?.selar?.premium || beat?.selar_premium_url,
    },
    ultimate: {
      name: "Trackout Stems",
      short: "Ultimate",
      price: ultimatePriceFormatted,
      priceStatus: (
        <>
          <LightningIcon size={16} style={{ color: "#FFD700" }} /> Instant Selar
          Checkout
        </>
      ),
      perks: [
        "✓ Full Multi-Track Audio Stems (WAV)",
        "✓ Complete Mix & Arrangement Control",
        "✓ Music Video & Sync Clearance",
        "✓ Instant Delivery via Selar",
      ],
      btnText: `Purchase Trackout Stems (${ultimatePriceFormatted}) on Selar`,
      url:
        selarUltimate?.url || beat?.selar?.ultimate || beat?.selar_ultimate_url,
    },
    exclusive: {
      name: "Exclusive Buyout",
      short: "Exclusive",
      price: "Private Studio Negotiation",
      priceStatus: (
        <>
          <CrownIcon size={15} color="#FFD700" /> 100% Sole Ownership Buyout
        </>
      ),
      perks: [
        "✓ 100% Sole Ownership Buyout",
        "✓ Beat Permanently Removed from Market",
        "✓ Full Master & Publishing Rights",
        "✓ Direct Studio Consultation with silachomka",
      ],
      btnText: "Submit Exclusive Acquisition Offer",
      url: "#offer-form",
    },
  };

  const activeLicenseData = LICENSES[selectedLicense];

  if (!beat && (isStoreLoading || isFetchingBeat)) {
    return (
      <main className="beat-detail-view">
        <div
          style={{
            maxWidth: "600px",
            margin: "100px auto",
            textAlign: "center",
            color: "var(--gold)",
          }}
        >
          <LoadingSpinner size={28} />
          <p style={{ marginTop: "14px", color: "var(--muted)", fontSize: "13px" }}>
            Loading studio beat...
          </p>
        </div>
      </main>
    );
  }

  /* 404 Fallback if beat not found */
  if (!beat) {
    return (
      <main className="beat-detail-view">
        <div
          style={{
            maxWidth: "600px",
            margin: "80px auto",
            textAlign: "center",
          }}
        >
          <p className="eyebrow">silachomka / 404</p>
          <h1 className="beat-detail-title">Beat Not Found</h1>
          <p style={{ color: "var(--muted)", margin: "20px 0 35px" }}>
            The beat you requested does not exist in the official studio
            catalogue.
          </p>
          <Link className="primary-button" to="/beats">
            <LeftArrowIcon /> Back to All Beats
          </Link>
        </div>
      </main>
    );
  }

  const shareDescription = beat.description
    ? `${beat.title} (${[beat.genre, beat.bpm, beat.key].filter(Boolean).join(" • ")}) — ${beat.description}`
    : `${beat.title} is an original${
        beat.genre ? ` ${beat.genre}` : ""
      } instrumental by silachomka, available to listen to and license through chomkaMUSIC™ Studio.`;

  const shareImage =
    beat.image ||
    (beat.video && !/\.gif(\?.*)?$/i.test(beat.video)
      ? beat.video.replace(/\.(mp4|webm|mov)$/i, ".jpg")
      : null) ||
    beat.ogImage ||
    beat.cover ||
    "/beats-image.png";

  const ambientArtworkUrl =
    beat.image ||
    (beat.video && /\.gif(\?.*)?$/i.test(beat.video) ? beat.video : null) ||
    shareImage;

  return (
    <main className="beat-detail-view">
      <SeoHead
        title={`${beat.title} — Beat by ${getBeatProducer(beat)} | silachomka`}
        description={shareDescription}
        path={`/beats/${beat.id}`}
        image={shareImage}
        audio={beat.audio}
        type="music.song"
        icon="/beats-image.png"
        imageAlt={`${beat.title} beat by silachomka`}
      />

      {/* Req #7: Atmospheric Blurred Product Artwork Background */}
      {ambientArtworkUrl && (
        <div className="product-ambient-backdrop" aria-hidden="true">
          <div
            className="ambient-image-layer"
            style={{ backgroundImage: `url(${ambientArtworkUrl})` }}
          />
          <div className="ambient-gradient-overlay" />
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <Link className="release-breadcrumb" to="/beats">
        <LeftArrowIcon /> All Beats
      </Link>

      <div className="beat-detail-grid">
        {/* =================================================
            LEFT COLUMN: VIDEO VISUALIZER & FULL AUDIO CONTROLS
            ================================================= */}
        <div>
          <div className="beat-visualizer-card">
            {beat.video || beat.image ? (
              <BeatArtwork
                image={beat.image}
                video={beat.video}
                videoMimeType={beat.videoMimeType}
                alt={`${beat.title} visualizer`}
                className="beat-visualizer-video"
                lazy={false}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "var(--surface-2)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--gold)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {beat.title}
              </div>
            )}
          </div>

          {/* Upgraded Full Audio Playback Deck (Req #7) */}
          <div className="beat-detail-player-deck">
            {/* Top Row: Enter Reel Mode Link & Track Position */}
            <div className="beat-detail-player-top">
              <Link
                to={`/beats?reel=${encodeURIComponent(beat.id)}`}
                className="beat-enter-reel-btn"
                title="Open this beat in 9:16 Reel Mode"
              >
                <ReelIcon size={13} />
                <span>Enter Reel Mode</span>
              </Link>

              <div className="beat-detail-time-readout">
                <span>{currentTime}</span>
                <span style={{ opacity: 0.45, margin: "0 4px" }}>/</span>
                <span>{durationTime}</span>
              </div>
            </div>

            {/* Interactive Scrubber Progress Bar with Draggable Handle */}
            <div
              ref={seekBarRef}
              onMouseDown={handleSeekPointerDown}
              onTouchStart={handleSeekPointerDown}
              className={`beat-detail-scrubber ${isDraggingSeek ? "is-dragging" : ""}`}
              role="slider"
              tabIndex={0}
              aria-label="Seek beat playback position"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  seekForward();
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  seekBackward();
                }
              }}
            >
              <div
                className="beat-detail-scrubber-fill"
                style={{ width: `${Math.max(0, Math.min(progress * 100, 100))}%` }}
              />
              <div
                className="reel-seek-thumb"
                style={{ left: `${Math.max(0, Math.min(progress * 100, 100))}%` }}
              />
            </div>

            {/* Full Transport Controls: Shuffle | Prev | -5s | Play/Pause | +5s | Next | Repeat */}
            <div className="beat-detail-transport">
              <button
                type="button"
                className={`beat-transport-btn ${isShuffle ? "is-active" : ""}`}
                onClick={() => setIsShuffle((prev) => !prev)}
                aria-label={isShuffle ? "Disable shuffle" : "Enable shuffle"}
                aria-pressed={isShuffle}
                title={isShuffle ? "Shuffle On" : "Shuffle Off"}
              >
                <ShuffleIcon size={16} />
              </button>

              <button
                type="button"
                className="beat-transport-btn"
                onClick={handlePrevBeat}
                aria-label="Previous beat"
                title="Previous Beat"
              >
                <PreviousTrackIcon size={18} />
              </button>

              <button
                type="button"
                className="beat-skip-btn"
                onClick={seekBackward}
                aria-label="Skip backward 5 seconds"
                title="Skip backward 5 seconds"
              >
                <SkipBackIcon size={13} />
                <span>5s</span>
              </button>

              <button
                type="button"
                className="beat-detail-play-btn"
                onClick={togglePlay}
                aria-label={
                  isLoading
                    ? "Loading audio"
                    : isPlaying
                    ? "Pause audio"
                    : "Play audio"
                }
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <LoadingSpinner size={20} color="#050507" />
                ) : isPlaying ? (
                  <PauseIcon size={20} color="#050507" />
                ) : (
                  <PlayIcon size={20} color="#050507" />
                )}
              </button>

              <button
                type="button"
                className="beat-skip-btn"
                onClick={seekForward}
                aria-label="Skip forward 5 seconds"
                title="Skip forward 5 seconds"
              >
                <span>5s</span>
                <SkipForwardIcon size={13} />
              </button>

              <button
                type="button"
                className="beat-transport-btn"
                onClick={handleNextBeat}
                aria-label="Next beat"
                title="Next Beat"
              >
                <NextTrackIcon size={18} />
              </button>

              <button
                type="button"
                className={`beat-transport-btn ${
                  repeatMode !== "none" ? "is-active" : ""
                }`}
                onClick={cycleRepeatMode}
                aria-label={
                  repeatMode === "one"
                    ? "Repeat mode: One"
                    : repeatMode === "all"
                    ? "Repeat mode: All"
                    : "Repeat mode: Off"
                }
                title={
                  repeatMode === "one"
                    ? "Repeat: One"
                    : repeatMode === "all"
                    ? "Repeat: All (Auto-advance)"
                    : "Repeat: Off"
                }
              >
                {repeatMode === "one" ? (
                  <RepeatOneIcon size={16} />
                ) : (
                  <RepeatIcon size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Technical Production Specs */}
          <div className="beat-specs-bar">
            <span className="spec-badge">BPM: {beat.bpm || "125 BPM"}</span>
            <span className="spec-badge">Key: {beat.key || "C Minor"}</span>
            <span className="spec-badge">
              Genre: {beat.genre || "Afro-Fusion"}
            </span>
            <span className="spec-badge">Audio: 24-bit / 44.1kHz</span>
            <span className="spec-badge">Stems: Available on Request</span>
          </div>
        </div>

        {/* =================================================
            RIGHT COLUMN: BEAT DETAILS, LICENSING & INQUIRY
            ================================================= */}
        <div>
          <p className="eyebrow">chomkaMUSIC™ Studio Catalogue</p>

          <h1 className="beat-detail-title">{beat.title}</h1>

          <p className="credit-line beat-detail-credits">
            Produced by {getBeatProducer(beat)}
            <span className="credit-dot">·</span>
            Source: {getBeatSource(beat)}
          </p>

          <p
            style={{
              color: "var(--gold)",
              fontSize: "15px",
              fontWeight: 700,
              margin: "10px 0 20px",
            }}
          >
            Studio Production × Custom Licensing
          </p>

          <ShareLinkBox url={absoluteUrl(`/beats/${beat.id}`)} />

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: "1.7",
              marginBottom: "30px",
            }}
          >
            Original studio production composed and engineered by{" "}
            <strong>silachomka</strong> under chomkaMUSIC™. Suitable for
            commercial release, sync licensing, broadcast, and artist
            collaborations.
          </p>

          {/* ===============================================
              DYNAMIC LICENSING SELECTOR ENGINE (Req #5)
              =============================================== */}
          <div className="licensing-selector-container">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div className="platform-section-title" style={{ margin: 0 }}>
                Licensing Options
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Currency:
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--gold)",
                    padding: "4px 8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    outline: "none",
                  }}
                  aria-label="Select license currency"
                >
                  {supportedCurrencies.map((c) => (
                    <option
                      key={c.code}
                      value={c.code}
                      style={{ background: "#111", color: "#fff" }}
                    >
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Responsive 4-Tier License Selector Tabs */}
            <div className="license-tabs" role="tablist">
              {Object.keys(LICENSES).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selectedLicense === key}
                  className={`license-tab ${
                    selectedLicense === key ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedLicense(key)}
                >
                  <span className="license-tab-name">{LICENSES[key].short}</span>
                  {key !== "exclusive" && (
                    <span className="license-tab-price">
                      {LICENSES[key].price}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Dynamic Content */}
            <div
              className="license-details"
              key={selectedLicense}
              role="tabpanel"
            >
              <h3 className="license-type-name">{activeLicenseData.name}</h3>

              <div className="license-price-row">
                <span className="license-price-value">
                  {activeLicenseData.price}
                </span>
                <span className="license-status-badge">
                  {activeLicenseData.priceStatus}
                </span>
              </div>

              <ul className="license-perks-list">
                {activeLicenseData.perks.map((perk, index) => (
                  <li key={index}>{perk}</li>
                ))}
              </ul>

              {activeLicenseData.url &&
              activeLicenseData.url.startsWith("http") ? (
                <a
                  href={activeLicenseData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="license-buy-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{activeLicenseData.btnText}</span>
                  <UpRightArrowIcon size={16} />
                </a>
              ) : (
                <a href="#offer-form" className="license-buy-btn">
                  <span>{activeLicenseData.btnText}</span>
                  <RightArrowIcon />
                </a>
              )}
            </div>
          </div>

          {/* ===============================================
              STUDIO INQUIRY & EXCLUSIVE OFFER FORM
              =============================================== */}
          <div
            id="offer-form"
            style={{
              padding: "35px",
              background: "var(--surface)",
              border: "1px solid var(--line-gold)",
              borderRadius: "6px",
              boxShadow: "0 15px 45px rgba(0, 0, 0, 0.4)",
            }}
          >
            <p className="eyebrow">Exclusive Buyout Inquiry</p>
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: "26px",
                color: "var(--text)",
                fontFamily: "var(--font-display)",
              }}
            >
              Exclusive Acquisition
            </h2>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "13px",
                lineHeight: "1.6",
                marginBottom: "25px",
              }}
            >
              Standard, Premium, and Trackout licenses for{" "}
              <strong>{beat.title}</strong> can be purchased instantly above
              with direct delivery on Selar. Use this form exclusively to
              negotiate an{" "}
              <strong style={{ color: "var(--text)" }}>Exclusive Buyout</strong>{" "}
              — full ownership transfer, custom terms, and stem delivery.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setOfferSubmitting(true);
                setOfferError(null);
                try {
                  const res = await fetch("https://formspree.io/f/xljerwko", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                    },
                    body: JSON.stringify({
                      name: offerName,
                      email: offerEmail,
                      beat: beat.title,
                      beat_url: absoluteUrl(`/beats/${beat.id}`),
                      license: "Exclusive Buyout",
                      message: offerMessage,
                    }),
                  });
                  if (res.ok) {
                    setOfferSubmitted(true);
                  } else {
                    const data = await res.json().catch(() => ({}));
                    setOfferError(
                      data?.error || "Submission failed. Please try again."
                    );
                  }
                } catch {
                  setOfferError(
                    "Network error. Check your connection and try again."
                  );
                } finally {
                  setOfferSubmitting(false);
                }
              }}
              className="negotiation-form"
            >
              {offerSubmitted ? (
                <div
                  style={{
                    padding: "28px 24px",
                    background: "rgba(212, 175, 55, 0.08)",
                    border: "1px solid var(--line-gold)",
                    borderRadius: "6px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "22px",
                      margin: "0 0 8px",
                      color: "var(--gold)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Inquiry Sent
                  </p>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: "13px",
                      margin: 0,
                      lineHeight: "1.6",
                    }}
                  >
                    Your licensing inquiry for{" "}
                    <strong style={{ color: "var(--text)" }}>{beat.title}</strong>{" "}
                    has been received. chomkaMUSIC™ Studio will be in touch at{" "}
                    <strong style={{ color: "var(--text)" }}>{offerEmail}</strong>
                    .
                  </p>
                </div>
              ) : (
                <>
                  <div className="negotiation-form-row">
                    <input
                      type="text"
                      required
                      placeholder="Your Name / Artist Name"
                      value={offerName}
                      onChange={(e) => setOfferName(e.target.value)}
                      className="negotiation-input"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={offerEmail}
                      onChange={(e) => setOfferEmail(e.target.value)}
                      className="negotiation-input"
                    />
                  </div>

                  <textarea
                    placeholder="Project details, intended release date, or custom arrangement / stem requirements..."
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    className="negotiation-textarea"
                  />

                  {offerError && (
                    <p
                      style={{
                        color: "#e05c5c",
                        fontSize: "13px",
                        margin: "0 0 10px",
                        padding: "10px 14px",
                        background: "rgba(224, 92, 92, 0.08)",
                        border: "1px solid rgba(224, 92, 92, 0.3)",
                        borderRadius: "4px",
                      }}
                    >
                      {offerError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="primary-button"
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      opacity: offerSubmitting ? 0.6 : 1,
                    }}
                    disabled={offerSubmitting}
                  >
                    {offerSubmitting ? (
                      "Sending…"
                    ) : (
                      <>
                        <span>Draft Studio Licensing Inquiry</span>{" "}
                        <RightArrowIcon size={14} />
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { PlayIcon, PauseIcon, MusicNoteIcon, LoadingSpinner } from "./Icons";

/**
 * RandomPreviewPlayer (Stage 26 — Req #19 & #20)
 *
 * Plays a randomly selected 30-second window from a pool of pre-release preview audio
 * (supporting multi-track future releases where each track has its own preview audio).
 * - Randomly picks a track from `audioUrls` and a random 30s window `[0, duration - 30]`.
 * - Plays entire duration if audio is shorter than 30s.
 * - Stops automatically at the 30-second boundary.
 * - Shows a clear loading spinner while buffering/seeking.
 * - NEVER reveals individual track names; displays only the Project/Release title + PREVIEW.
 * - Strictly ZERO emojis; uses SVGs only.
 */
export default function RandomPreviewPlayer({
  audioUrl,
  audioUrls = [],
  projectTitle = "",
  title = "Pre-Release Audio Preview",
}) {
  const audioRef = useRef(null);
  const autoPlayPendingRef = useRef(false);

  const pool = useMemo(() => {
    const list = [];
    if (Array.isArray(audioUrls)) {
      for (const u of audioUrls) {
        if (typeof u === "string" && u.trim() && !list.includes(u.trim())) {
          list.push(u.trim());
        }
      }
    }
    if (typeof audioUrl === "string" && audioUrl.trim() && !list.includes(audioUrl.trim())) {
      list.push(audioUrl.trim());
    }
    return list;
  }, [audioUrl, audioUrls]);

  const [activePoolIndex, setActivePoolIndex] = useState(() =>
    pool.length > 0 ? Math.floor(Math.random() * pool.length) : 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snippetStart, setSnippetStart] = useState(0);
  const [snippetDuration, setSnippetDuration] = useState(30);
  const [currentTimeInSnippet, setCurrentTimeInSnippet] = useState(0);

  useEffect(() => {
    if (pool.length > 0 && activePoolIndex >= pool.length) {
      setActivePoolIndex(0);
    }
  }, [pool, activePoolIndex]);

  const currentSrc = pool[activePoolIndex] || pool[0] || null;

  // Pick a random 30-second window given total audio duration
  const pickRandomWindow = useCallback((totalDur) => {
    if (!totalDur || isNaN(totalDur) || totalDur <= 0) {
      return { start: 0, winDur: 30 };
    }
    if (totalDur <= 30) {
      return { start: 0, winDur: Math.max(1, Math.floor(totalDur)) };
    }
    const maxStart = Math.max(0, totalDur - 30);
    const start = Math.floor(Math.random() * maxStart);
    return { start, winDur: 30 };
  }, []);

  const applyWindowAndMaybePlay = useCallback(
    async (audio, shouldPlay) => {
      if (!audio) return;
      const dur = audio.duration;
      const { start, winDur } = pickRandomWindow(dur);
      setSnippetStart(start);
      setSnippetDuration(winDur);
      setCurrentTimeInSnippet(0);
      try {
        audio.currentTime = start;
      } catch {}

      if (shouldPlay) {
        try {
          setIsLoading(true);
          setError(null);
          await audio.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn("Preview playback error:", err);
          setError("Unable to play preview audio.");
          setIsPlaying(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    },
    [pickRandomWindow]
  );

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const shouldAutoPlay = autoPlayPendingRef.current;
    autoPlayPendingRef.current = false;
    applyWindowAndMaybePlay(audio, shouldAutoPlay);
  };

  const selectRandomTrackAndPlay = useCallback(() => {
    if (pool.length === 0) return;
    setError(null);
    setIsLoading(true);

    let nextIdx = activePoolIndex;
    if (pool.length > 1) {
      // Pick a random track from the release's preview pool
      nextIdx = Math.floor(Math.random() * pool.length);
      if (nextIdx === activePoolIndex && pool.length > 1 && Math.random() < 0.75) {
        nextIdx = (activePoolIndex + 1) % pool.length;
      }
    }

    if (nextIdx !== activePoolIndex) {
      autoPlayPendingRef.current = true;
      setIsPlaying(false);
      setActivePoolIndex(nextIdx);
    } else {
      const audio = audioRef.current;
      if (audio && audio.readyState >= 1 && audio.duration) {
        applyWindowAndMaybePlay(audio, true);
      } else if (audio) {
        autoPlayPendingRef.current = true;
        audio.load();
      }
    }
  }, [pool, activePoolIndex, applyWindowAndMaybePlay]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    const windowEnd = snippetStart + snippetDuration;
    const isAtEndOrFresh =
      currentTimeInSnippet === 0 ||
      audio.currentTime >= windowEnd - 0.15 ||
      audio.currentTime < snippetStart;

    if (isAtEndOrFresh) {
      selectRandomTrackAndPlay();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await audio.play();
      setIsPlaying(true);
    } catch {
      setError("Unable to play preview audio.");
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const cur = audio.currentTime;
    const windowEnd = snippetStart + snippetDuration;

    if (cur >= windowEnd) {
      audio.pause();
      try {
        audio.currentTime = snippetStart;
      } catch {}
      setCurrentTimeInSnippet(snippetDuration);
      setIsPlaying(false);
    } else {
      const elapsed = Math.max(0, Math.min(snippetDuration, cur - snippetStart));
      setCurrentTimeInSnippet(elapsed);
    }
  };

  const handleShuffle = (e) => {
    e.preventDefault();
    selectRandomTrackAndPlay();
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !snippetDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetOffset = clickRatio * snippetDuration;
    const targetTime = snippetStart + targetOffset;
    try {
      audio.currentTime = targetTime;
    } catch {}
    setCurrentTimeInSnippet(targetOffset);
  };

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, "0")}`;
  };

  const progressPercent =
    snippetDuration > 0
      ? Math.min(100, Math.max(0, (currentTimeInSnippet / snippetDuration) * 100))
      : 0;

  if (!currentSrc) return null;

  // Never reveal individual track titles — only display project title + PREVIEW
  const safeDisplayTitle = projectTitle
    ? `${projectTitle} — PREVIEW`
    : title;

  return (
    <div
      className="random-preview-player"
      role="region"
      aria-label="30-second pre-release audio preview"
    >
      <audio
        ref={audioRef}
        src={currentSrc}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTimeInSnippet(snippetDuration);
        }}
        onError={() => {
          setError("Audio stream currently unavailable.");
          setIsLoading(false);
          setIsPlaying(false);
        }}
      />

      <div className="rpp-header">
        <div className="rpp-tag">
          <MusicNoteIcon size={14} color="var(--gold)" />
          <span>30-SECOND PREVIEW</span>
        </div>
        <button
          type="button"
          onClick={handleShuffle}
          className="rpp-shuffle-btn"
          title="Shuffle to another random 30-second preview"
          aria-label="Shuffle preview section"
          disabled={isLoading}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          <span>Shuffle Preview</span>
        </button>
      </div>

      <div className="rpp-body">
        <button
          type="button"
          onClick={handlePlayPause}
          className="rpp-play-btn"
          aria-label={
            isLoading
              ? "Loading 30-second preview"
              : isPlaying
              ? "Pause 30-second preview"
              : "Play 30-second preview"
          }
          aria-busy={isLoading}
          disabled={isLoading}
        >
          {isLoading ? (
            <LoadingSpinner size={18} color="#050507" />
          ) : isPlaying ? (
            <PauseIcon size={18} color="#050507" />
          ) : (
            <PlayIcon size={18} color="#050507" />
          )}
        </button>

        <div className="rpp-track-info">
          <div className="rpp-title-row">
            <span className="rpp-title">{safeDisplayTitle}</span>
            <span className="rpp-time">
              {formatTime(currentTimeInSnippet)} / {formatTime(snippetDuration)}
            </span>
          </div>

          <div
            className="rpp-progress-track"
            onClick={handleProgressClick}
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Preview snippet progress"
          >
            <div
              className="rpp-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rpp-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

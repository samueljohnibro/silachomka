import React, { useState, useRef, useEffect, useCallback } from "react";
import { PlayIcon, PauseIcon, MusicNoteIcon } from "./Icons";

/**
 * RandomPreviewPlayer
 * Plays a randomly selected 30-second window of pre-release preview audio.
 * - Chooses random start point between 0 and (duration - 30).
 * - Plays entire duration if audio is shorter than 30s.
 * - Stops automatically at 30-second boundary.
 * - Allows re-rolling another random snippet.
 * - Strictly ZERO emojis; uses SVGs only.
 */
export default function RandomPreviewPlayer({ audioUrl, title = "Pre-Release Audio Snippet" }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);
  const [snippetStart, setSnippetStart] = useState(0);
  const [snippetDuration, setSnippetDuration] = useState(30);
  const [currentTimeInSnippet, setCurrentTimeInSnippet] = useState(0);

  // Pick a random window given the total audio duration
  const pickRandomWindow = useCallback((totalDur) => {
    if (!totalDur || isNaN(totalDur) || totalDur <= 0) return { start: 0, winDur: 30 };
    if (totalDur <= 30) {
      return { start: 0, winDur: Math.floor(totalDur) };
    }
    const maxStart = Math.max(0, totalDur - 30);
    const start = Math.floor(Math.random() * maxStart);
    return { start, winDur: 30 };
  }, []);

  const initOrReshuffle = useCallback((autoPlay = false) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    
    const { start, winDur } = pickRandomWindow(audio.duration);
    setSnippetStart(start);
    setSnippetDuration(winDur);
    setCurrentTimeInSnippet(0);
    audio.currentTime = start;

    if (autoPlay) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn("Autoplay blocked or playback error:", e);
        setIsPlaying(false);
      });
    }
  }, [pickRandomWindow]);

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration;
    if (dur && !isNaN(dur)) {
      setDuration(dur);
      const { start, winDur } = pickRandomWindow(dur);
      setSnippetStart(start);
      setSnippetDuration(winDur);
    }
    setIsLoading(false);
  };

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // If at end of snippet window or before start, reset to snippet start
      const windowEnd = snippetStart + snippetDuration;
      if (audio.currentTime >= windowEnd || audio.currentTime < snippetStart) {
        audio.currentTime = snippetStart;
        setCurrentTimeInSnippet(0);
      }
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Playback error:", err);
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
      audio.currentTime = snippetStart;
      setCurrentTimeInSnippet(snippetDuration);
      setIsPlaying(false);
    } else {
      const elapsed = Math.max(0, Math.min(snippetDuration, cur - snippetStart));
      setCurrentTimeInSnippet(elapsed);
    }
  };

  const handleShuffle = (e) => {
    e.preventDefault();
    initOrReshuffle(true);
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !snippetDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetOffset = clickRatio * snippetDuration;
    const targetTime = snippetStart + targetOffset;
    audio.currentTime = targetTime;
    setCurrentTimeInSnippet(targetOffset);
  };

  // Format seconds as M:SS
  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, "0")}`;
  };

  const progressPercent = snippetDuration > 0
    ? Math.min(100, Math.max(0, (currentTimeInSnippet / snippetDuration) * 100))
    : 0;

  if (!audioUrl) return null;

  return (
    <div className="random-preview-player" role="region" aria-label="30-second pre-release audio preview">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
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
          title="Shuffle to another random 30-second section"
          aria-label="Shuffle preview section"
          disabled={isLoading}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
            <line x1="4" y1="4" x2="9" y2="9" />
          </svg>
          <span>Shuffle Section</span>
        </button>
      </div>

      <div className="rpp-body">
        <button
          type="button"
          onClick={handlePlayPause}
          className="rpp-play-btn"
          aria-label={isPlaying ? "Pause 30-second preview" : "Play 30-second preview"}
          disabled={isLoading}
        >
          {isPlaying ? <PauseIcon size={18} color="#000" /> : <PlayIcon size={18} color="#000" />}
        </button>

        <div className="rpp-track-info">
          <div className="rpp-title-row">
            <span className="rpp-title">{title}</span>
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

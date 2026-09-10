const fs = require('fs');

let content = fs.readFileSync('c:/development/silachomka/src/pages/BeatDetailPage.jsx', 'utf8');

const seekLogic = `  const handleSeek = (e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const nextProgress = Math.max(0, Math.min(clickX / rect.width, 1));
    audioRef.current.currentTime = nextProgress * audioRef.current.duration;
    setProgress(nextProgress);
  };`;

const newSeekLogic = `  const handleSeek = (e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const nextProgress = Math.max(0, Math.min(clickX / rect.width, 1));
    audioRef.current.currentTime = nextProgress * audioRef.current.duration;
    setProgress(nextProgress);
  };

  const seekBackward = () => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    audioRef.current.currentTime = Math.max(0, ct - 5);
  };

  const seekForward = () => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 0;
    audioRef.current.currentTime = Math.min(duration, ct + 5);
  };`;

content = content.replace(seekLogic, newSeekLogic);

const oldAudioUI = `            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <button
                type="button"
                onClick={togglePlay}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "var(--gold)",
                  color: "var(--bg)",
                  border: "none",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 6px 20px var(--gold-glow)",
                  transition: "transform 180ms ease",
                }}
                aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio preview" : "Play audio preview"}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <div className="beat-detail-loading-spinner" aria-hidden="true" />
                ) : (
                  isPlaying ? "❚❚" : "▶"
                )}
              </button>

              <div style={{ flex: 1 }}>`;

const newAudioUI = `            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="beat-skip-btn"
                  onClick={seekBackward}
                  aria-label="Skip backward 5 seconds"
                >
                  -5s
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--gold)",
                    color: "var(--bg)",
                    border: "none",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 6px 20px var(--gold-glow)",
                    transition: "transform 180ms ease",
                  }}
                  aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio preview" : "Play audio preview"}
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <div className="beat-detail-loading-spinner" aria-hidden="true" />
                  ) : (
                    isPlaying ? "❚❚" : "▶"
                  )}
                </button>
                <button
                  type="button"
                  className="beat-skip-btn"
                  onClick={seekForward}
                  aria-label="Skip forward 5 seconds"
                >
                  +5s
                </button>
              </div>

              <div style={{ flex: 1 }}>`;

content = content.replace(oldAudioUI, newAudioUI);

fs.writeFileSync('c:/development/silachomka/src/pages/BeatDetailPage.jsx', content);

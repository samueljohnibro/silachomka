// src/components/ExclusiveBeatModal.jsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ExclusiveBeatModal({ isOpen, onClose, beats = [] }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectBeat = (beatId) => {
    onClose();
    navigate(`/beats/${beatId}?license=exclusive#offer-form`);
  };

  return (
    <div
      className="exclusive-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="exclusive-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="exclusive-modal-header">
          <div>
            <p className="eyebrow" style={{ color: "var(--gold)" }}>
              CHOMKA MUSIC™ STUDIO EXCLUSIVE RIGHTS
            </p>
            <h2 className="exclusive-modal-title">Select Beat for Buyout Acquisition</h2>
            <p className="exclusive-modal-sub">
              Choose the production you wish to purchase with 100% sole master & publishing buyout rights.
            </p>
          </div>

          <button
            type="button"
            className="exclusive-modal-close"
            onClick={onClose}
            aria-label="Close exclusive beat selector"
          >
            ✕
          </button>
        </div>

        <div className="exclusive-modal-list">
          {beats.map((beat) => (
            <div
              key={beat.id}
              className="exclusive-modal-item"
              onClick={() => handleSelectBeat(beat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectBeat(beat.id)}
            >
              <div className="exclusive-modal-thumb">
                {beat.video ? (
                  beat.video.endsWith(".gif") ? (
                    <img
                      src={beat.video}
                      alt=""
                      className="exclusive-modal-video"
                      style={{ objectFit: "cover" }}
                      aria-hidden="true"
                    />
                  ) : (
                    <video
                      src={beat.video}
                      poster={beat.image}
                      muted
                      playsInline
                      loop
                      autoPlay
                      className="exclusive-modal-video"
                      aria-hidden="true"
                    />
                  )
                ) : (
                  <div className="exclusive-modal-placeholder">🎹</div>
                )}
              </div>

              <div className="exclusive-modal-info">
                <strong className="exclusive-modal-title-text">{beat.title}</strong>
                <span className="exclusive-modal-genre-tag">{beat.genre}</span>
                <span className="exclusive-modal-meta">
                  {beat.bpm} • {beat.key}
                </span>
              </div>

              <button
                type="button"
                className="exclusive-modal-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBeat(beat.id);
                }}
              >
                Select Exclusive →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// src/components/CustomBeatPromptModal.jsx

import { useEffect } from "react";
import { RightArrowIcon, CrownIcon } from "./Icons";

export default function CustomBeatPromptModal({ isOpen, onClose, onProceed }) {
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

  return (
    <div
      className="custom-beat-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-beat-modal-title"
    >
      <div
        className="custom-beat-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="custom-beat-modal-header">
          <div className="custom-beat-modal-eyebrow">
            <span className="celestial-sparkle" aria-hidden="true">✦</span>
            <span>CHOMKA MUSIC™ STUDIO • BESPOKE BEATS</span>
          </div>

          <button
            type="button"
            className="custom-beat-modal-close"
            onClick={onClose}
            aria-label="Close custom beat prompt"
          >
            ✕
          </button>
        </div>

        <div className="custom-beat-modal-body">
          <div className="custom-beat-modal-icon-badge" aria-hidden="true">
            <CrownIcon size={24} color="var(--gold)" />
          </div>

          <h2 id="custom-beat-modal-title" className="custom-beat-modal-title">
            Want a Custom Beat Crafted Just for You?
          </h2>

          <p className="custom-beat-modal-desc">
            Can't find the exact vibe or tempo in our catalog? Work directly with{" "}
            <strong>silachomka</strong> to build an original, release-ready beat tailored
            to your voice, musical key, and creative direction.
          </p>

          <div className="custom-beat-modal-card">
            <div className="custom-beat-modal-card-top">
              <div>
                <span className="custom-beat-modal-card-service">SERVICE: BEAT PRODUCTION</span>
                <div className="custom-beat-modal-card-price">₦80,000</div>
              </div>
              <span className="custom-beat-modal-card-turnaround">~5 Days Delivery</span>
            </div>

            <ul className="custom-beat-modal-perks">
              <li>✦ 100% Original melody & drum arrangement</li>
              <li>✦ High-res WAV, MP3 & full trackout stems</li>
              <li>✦ Tailored to your BPM, key & vocal style</li>
              <li>✦ Full commercial licensing rights</li>
            </ul>
          </div>
        </div>

        <div className="custom-beat-modal-footer">
          <button
            type="button"
            className="custom-beat-modal-secondary-btn"
            onClick={onClose}
          >
            Keep Browsing Beats
          </button>

          <button
            type="button"
            className="custom-beat-modal-primary-btn"
            onClick={onProceed}
          >
            <span>Yes, Get a Custom Beat</span>
            <RightArrowIcon size={14} color="#050507" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { UpRightArrowIcon } from '../components/Icons';
// src/components/VideosSection.jsx

import { useState } from "react";
import { useChomkaStore } from "../data/store";

export default function VideosSection() {
  const { videos } = useChomkaStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const safeVideos = Array.isArray(videos) && videos.length > 0 ? videos : [];
  const selectedVideo = safeVideos[selectedIndex] || safeVideos[0];

  if (safeVideos.length === 0) return null;

  return (
    <section className="videos-section" id="videos">
      <div className="section-heading">
        <div>
          <p className="eyebrow">VISUAL CATALOGUE</p>
          <h2>Music Videos & Visuals</h2>
        </div>

        <span className="videos-count-badge">
          {safeVideos.length} Official Visuals
        </span>
      </div>

      <div className="videos-theater-container">
        {/* ===============================================
            MAIN CINEMA PLAYER
            =============================================== */}
        <div className="video-player-frame">
          <div
            className={`video-iframe-wrapper ${
              selectedVideo.aspectRatio === "9:16" ? "is-portrait" : "is-landscape"
            }`}
          >
            <iframe
              key={selectedVideo.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${selectedVideo.youtubeId}?rel=0&modestbranding=1`}
              title={selectedVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="video-embed-iframe"
            />
          </div>

          <div className="video-theater-info">
            <div className="video-info-main">
              <span className="video-category-tag">{selectedVideo.category}</span>
              <h3 className="video-theater-title">{selectedVideo.title}</h3>
              <p className="video-theater-subtitle">{selectedVideo.subtitle}</p>
            </div>

            {/* Direct External Links */}
            <div className="video-external-links">
              {selectedVideo.links?.youtube && (
                <a
                  href={selectedVideo.links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="video-action-btn btn-youtube"
                  aria-label="Open on YouTube"
                >
                  YouTube <UpRightArrowIcon size={14} />
                </a>
              )}
              {selectedVideo.links?.audiomack && (
                <a
                  href={selectedVideo.links.audiomack}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="video-action-btn btn-audiomack"
                  aria-label="Listen on Audiomack"
                >
                  Audiomack <UpRightArrowIcon size={14} />
                </a>
              )}
              {selectedVideo.links?.soundcloud && (
                <a
                  href={selectedVideo.links.soundcloud}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="video-action-btn btn-soundcloud"
                  aria-label="Listen on SoundCloud"
                >
                  SoundCloud <UpRightArrowIcon size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ===============================================
            PLAYLIST / SELECTOR LIST (NON-INTRUSIVE & INDEPENDENT)
            =============================================== */}
        <div className="videos-playlist-grid">
          {safeVideos.map((vid, idx) => {
            const isSelected = selectedIndex === idx;

            return (
              <button
                key={vid.id || idx}
                type="button"
                className={`video-card-btn ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSelectedIndex(idx)}
                aria-pressed={isSelected}
              >
                <div className="video-thumbnail-box">
                  <img
                    src={`https://img.youtube.com/vi/${vid.youtubeId}/mqdefault.jpg`}
                    alt={vid.title}
                    className="video-card-thumb"
                    loading="lazy"
                  />
                  <div className="video-thumb-overlay">
                    <span className="video-play-glyph">{isSelected ? "❚❚" : "▶"}</span>
                  </div>
                  {vid.aspectRatio === "9:16" && (
                    <span className="video-portrait-pill">Portrait</span>
                  )}
                </div>

                <div className="video-card-meta">
                  <span className="video-card-cat">{vid.category}</span>
                  <strong className="video-card-title">{vid.title}</strong>
                  <span className="video-card-sub">{vid.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

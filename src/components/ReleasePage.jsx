import { UpRightArrowIcon, RightArrowIcon } from '../components/Icons';
// src/components/ReleasePage.jsx

import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SeoHead from "./SeoHead";
import ShareLinkBox from "./ShareLinkBox";
import { useChomkaStore } from "../data/store";
import {
  absoluteUrl,
  getReleaseSourceString,
  getTrackProducerString,
} from "../data/credits";

/* =========================================================
   HELPERS & PLATFORM CONFIG
   ========================================================= */

function formatFeatures(featuring) {
  if (!Array.isArray(featuring) || featuring.length === 0) {
    return "";
  }
  return `with ${featuring.join(" & ")}`;
}

const PLATFORM_CONFIG = [
  { key: "spotify", name: "Spotify", fallbackUrl: "https://open.spotify.com" },
  { key: "appleMusic", name: "Apple Music", fallbackUrl: "https://music.apple.com" },
  { key: "youtubeMusic", name: "YouTube Music", fallbackUrl: "https://music.youtube.com" },
  { key: "audiomack", name: "Audiomack", fallbackUrl: "https://audiomack.com" },
  { key: "boomplay", name: "Boomplay", fallbackUrl: "https://www.boomplay.com" },
  { key: "deezer", name: "Deezer", fallbackUrl: "https://www.deezer.com" },
];

/* 
 * Utility to convert standard Spotify URLs to Embed URLs
 * e.g., https://open.spotify.com/album/55sd... -> https://open.spotify.com/embed/album/55sd...
 */
function getSpotifyEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (!url.includes("spotify.com")) return null;
  
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname.replace(/\/+/g, "/");
    if (pathname.startsWith("/embed/")) {
      pathname = pathname.replace(/^\/embed/, "");
    }
    pathname = pathname.replace(/\/$/, "");
    return `https://open.spotify.com/embed${pathname}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

/* =========================================================
   TRACK ROW COMPONENT (EXPANDABLE WITH PRODUCER CREDIT)
   ========================================================= */

export function TrackRow({ track, index, isExpanded, onToggle }) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const trackPlatforms = track.platforms || {};

  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setLocalExpanded((prev) => !prev);
  };

  // Check if track has any valid individual platform links
  const availablePlatforms = PLATFORM_CONFIG.filter((platform) => 
    Boolean(trackPlatforms[platform.key])
  );
  
  const hasLinks = availablePlatforms.length > 0;

  return (
    <div className={`track-item-row ${expanded ? "is-expanded" : ""}`}>
      <div 
        className="track-item-main"
        onClick={() => hasLinks && handleToggle()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && hasLinks && handleToggle()}
        aria-expanded={expanded}
        aria-label={`${track.title} stream links`}
      >
        <div className="track-title-left">
          <span className="track-idx">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="track-name-stack">
            <span className="track-name-text">{track.title}</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {track.featuring?.length > 0 && (
            <span className="track-feat-tag">
              {formatFeatures(track.featuring)}
            </span>
          )}
          
          {hasLinks && (
            <span className="track-dropdown-icon" aria-hidden="true">
              ▼
            </span>
          )}
        </div>
      </div>

      {/* Expanded Links Dropdown — includes producer credit beside platform buttons */}
      {hasLinks && (
        <div className="track-dropdown-content">
          <div className="track-dropdown-producer">
            Produced by <strong style={{ color: "var(--gold)" }}>{getTrackProducerString(track)}</strong>
          </div>
          <div className="track-platform-grid">
            {availablePlatforms.map((platform) => (
              <a
                key={platform.key}
                href={trackPlatforms[platform.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="track-platform-btn"
                onClick={(e) => e.stopPropagation()}
              >
                {platform.name} <UpRightArrowIcon size={14} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   RELEASE PAGE COMPONENT
   ========================================================= */

export default function ReleasePage({ release }) {
  const [searchParams] = useSearchParams();
  const activeFilter = searchParams.get("filter") || "all";

  /* Fallback for missing release */
  if (!release) {
    return (
      <main className="release-page-view">
        <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}>
          <p className="eyebrow">silachomka / 404</p>
          <h1 className="release-title">Release Not Found</h1>
          <p style={{ color: "var(--muted)", margin: "20px 0 35px" }}>
            The release you requested does not exist in the official discography.
          </p>
          <Link className="primary-button" to="/#music">
            ← Back to Music
          </Link>
        </div>
      </main>
    );
  }

  const platforms = release.platforms || {};
  const allTracks = release.tracks || [];
  const [expandedTrackIdx, setExpandedTrackIdx] = useState(null);

  // Filter tracks based on the active filter from Music section
  const tracks = useMemo(() => {
    if (activeFilter === "ft_silachomka") {
      return allTracks.filter((track) =>
        Array.isArray(track.featuring) && track.featuring.some(
          (f) => f.toLowerCase() === "silachomka"
        )
      );
    }
    if (activeFilter === "prod_by_silachomka") {
      return allTracks.filter((track) =>
        Array.isArray(track.producers) && track.producers.some(
          (p) => p.toLowerCase() === "silachomka"
        )
      );
    }
    return allTracks;
  }, [allTracks, activeFilter]);

  const { videos: storeVideos } = useChomkaStore();

  const associatedVideos = useMemo(() => {
    const directVideos = Array.isArray(release.videos) ? release.videos : [];
    if (directVideos.length > 0) return directVideos;

    if (!release.id || !Array.isArray(storeVideos)) return [];
    return storeVideos.filter(
      (v) => v.relatedReleaseId === release.id || v.related_release_id === release.id
    );
  }, [release.videos, release.id, storeVideos]);

  const trackCount = tracks.length;
  const releaseNumber = String(release.number ?? "").padStart(2, "0");
  const currentUrl = absoluteUrl(`/release/${release.slug}`);
  const source = getReleaseSourceString(release);
  const spotifyEmbedUrl = getSpotifyEmbedUrl(platforms.spotify);

  return (
    <main className="release-page-view">
      <SeoHead
        title={`${release.title} | silachomka`}
        description={release.description}
        path={`/release/${release.slug}`}
        image={release.cover || "/og-image.png"}
        imageAlt={`${release.title} official cover art`}
      />
      {/* Breadcrumb Navigation */}
      <Link className="release-breadcrumb" to={`/?${activeFilter !== "all" ? "filter=" + activeFilter + "#music" : "#music"}`}>
        ← All Music
      </Link>

      <div className="release-hero-grid">
        {/* =================================================
            LEFT COLUMN: FRAMED HIGH-RES ARTWORK
            ================================================= */}
        <div className="release-art-frame">
          {release.cover ? (
            <img
              src={release.cover}
              alt={`${release.title} official cover art`}
              loading="eager"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "var(--surface)",
                borderRadius: "3px",
              }}
            />
          )}
        </div>

        {/* =================================================
            RIGHT COLUMN: ALBUM METADATA & STREAMING HUB
            ================================================= */}
        <div className="release-content-panel">
          <p className="eyebrow">chomkaMUSIC™ Official Release</p>

          <h1 className="release-title">{release.title}</h1>

          <div className="release-meta-bar">
            <span>Release {releaseNumber}</span>
            <span>•</span>
            <span>{release.displayDate}</span>
            <span>•</span>
            <span>
              {trackCount} {trackCount === 1 ? "Track" : "Tracks"}
            </span>
          </div>

          <p className="release-description-text">
            {release.description}
          </p>
          
          {/* ===============================================
              EMBEDDED AUDIO PLAYER
              =============================================== */}
          {spotifyEmbedUrl && (
            <div className="spotify-embed-container">
              <iframe 
                src={spotifyEmbedUrl} 
                width="100%" 
                height={trackCount > 1 ? "352" : "152"} 
                style={{
                  borderRadius: "12px",
                  border: "none",
                  display: "block",
                  minHeight: trackCount > 1 ? "352px" : "152px",
                  width: "100%",
                }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                allowFullScreen
                title={`${release.title} Spotify Player`} 
              />
            </div>
          )}

          {/* Streaming Platforms Grid */}
          <div>
            <div className="platform-section-title">Stream / Listen On</div>
            <div className="platform-grid">
              {PLATFORM_CONFIG.map((platform) => {
                const targetUrl = platforms[platform.key];
                
                // Don't render button if we don't have a URL for it
                if (!targetUrl) return null;

                return (
                  <a
                    key={platform.key}
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="platform-btn"
                    aria-label={`Listen to ${release.title} on ${platform.name}`}
                  >
                    {platform.name} <RightArrowIcon size={14} />
                  </a>
                );
              })}
            </div>
          </div>

          <ShareLinkBox url={currentUrl} />

          {/* Tracklist Card (Interactive — click to expand platform links + producer) */}
          <div className="tracklist-card">
            <div className="platform-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <span>
                Tracklist ({trackCount}{trackCount < allTracks.length ? ` of ${allTracks.length}` : ""})
              </span>
              {trackCount < allTracks.length && (
                <Link
                  to={`/release/${release.slug}`}
                  style={{
                    fontSize: "8px",
                    color: "var(--gold)",
                    textDecoration: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: "700",
                    border: "1px solid var(--line-gold)",
                    padding: "5px 10px",
                    borderRadius: "3px",
                  }}
                >
                  Show all tracks
                </Link>
              )}
            </div>
            <div>
              {tracks.map((track, index) => (
                <TrackRow 
                  key={`${track.title}-${index}`} 
                  track={track} 
                  index={index}
                  isExpanded={expandedTrackIdx === index}
                  onToggle={() => setExpandedTrackIdx(expandedTrackIdx === index ? null : index)}
                />
              ))}
            </div>

            {/* Source credit — shown after the tracklist */}
            <div className="release-source-footer">
              Source: <strong>{source}</strong>
            </div>
          </div>

          {/* =========================================================
              ASSOCIATED MUSIC VIDEOS & VISUALIZERS SECTION
              ========================================================= */}
          {associatedVideos.length > 0 && (
            <div className="release-videos-section" style={{ marginTop: "32px" }}>
              <div className="platform-section-title" style={{ marginBottom: "16px" }}>
                Official Music Videos & Visualizers ({associatedVideos.length})
              </div>
              <div
                className="release-videos-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px",
                }}
              >
                {associatedVideos.map((video) => {
                  const yId = video.youtubeId || video.youtube_id;
                  const isPortrait =
                    video.aspectRatio === "9:16" || video.aspect_ratio === "9:16";
                  return (
                    <div
                      key={video.id || yId}
                      className="release-video-card"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          paddingTop: isPortrait ? "177.78%" : "56.25%",
                          background: "#000",
                        }}
                      >
                        {yId ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${yId}?rel=0&modestbranding=1`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              border: "none",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              color: "var(--muted)",
                            }}
                          >
                            Video Preview Unavailable
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          flexGrow: 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--gold)",
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              fontWeight: 700,
                            }}
                          >
                            {video.category || "Official Visual"}
                          </span>
                          {isPortrait && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 6px",
                                background: "rgba(223,194,125,0.15)",
                                borderRadius: "4px",
                                color: "var(--gold)",
                              }}
                            >
                              9:16 Reel
                            </span>
                          )}
                        </div>
                        <h4
                          style={{
                            margin: "2px 0 0",
                            fontSize: "15px",
                            color: "var(--text-h)",
                          }}
                        >
                          {video.title}
                        </h4>
                        {video.subtitle && (
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "var(--muted)",
                            }}
                          >
                            {video.subtitle}
                          </p>
                        )}
                        {video.youtubeUrl || video.youtube_url ? (
                          <a
                            href={video.youtubeUrl || video.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              marginTop: "auto",
                              paddingTop: "8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              color: "var(--gold)",
                              fontSize: "12px",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            Watch on YouTube <UpRightArrowIcon size={12} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
import { UpRightArrowIcon, RightArrowIcon, LoadingSpinner } from "../components/Icons";
// src/components/ReleasePage.jsx

import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import SeoHead from "./SeoHead";
import ShareLinkBox from "./ShareLinkBox";
import RandomPreviewPlayer from "./RandomPreviewPlayer";
import { useChomkaStore } from "../data/store";
import { useCookieConsent } from "../data/CookieConsentContext";
import { normalizeGalleryPost } from "../data/api";
import { formatGalleryDate } from "../utils/dateFormatter";
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

const KNOWN_PLATFORM_NAMES = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtubeMusic: "YouTube Music",
  youtube: "YouTube",
  audiomack: "Audiomack",
  boomplay: "Boomplay",
  deezer: "Deezer",
  tidal: "Tidal",
  amazonMusic: "Amazon Music",
  soundcloud: "SoundCloud",
  soundCloud: "SoundCloud",
  bandcamp: "Bandcamp",
  pandora: "Pandora",
  itunes: "iTunes",
  selar: "Selar",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export function getPlatformName(key) {
  if (KNOWN_PLATFORM_NAMES[key]) return KNOWN_PLATFORM_NAMES[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function getPlatformEntries(platformsObj) {
  if (!platformsObj || typeof platformsObj !== "object") return [];
  return Object.entries(platformsObj)
    .filter(([_, url]) =>
      Boolean(url && typeof url === "string" && url.trim().length > 0)
    )
    .map(([key, url]) => ({
      key,
      name: getPlatformName(key),
      url: url.trim(),
    }));
}

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

export function TrackRow({ track, release = null, index, isExpanded, onToggle, isUnreleased = false }) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const trackPlatforms = isUnreleased ? {} : track.platforms || {};

  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setLocalExpanded((prev) => !prev);
  };

  const availablePlatforms = getPlatformEntries(trackPlatforms);
  const hasLinks = !isUnreleased && availablePlatforms.length > 0;
  const displayTitle = isUnreleased
    ? `Track ${String(index + 1).padStart(2, "0")}`
    : track.title;

  return (
    <div className={`track-item-row ${expanded ? "is-expanded" : ""}`}>
      <div
        className="track-item-main"
        onClick={() => hasLinks && handleToggle()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && hasLinks && handleToggle()}
        aria-expanded={expanded}
        aria-label={`${displayTitle} stream links`}
      >
        <div className="track-title-left">
          <span className="track-idx">{String(index + 1).padStart(2, "0")}</span>
          <span className="track-name-stack">
            <span className="track-name-text">{displayTitle}</span>
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

      {hasLinks && (
        <div className="track-dropdown-content">
          <div className="track-dropdown-producer">
            Produced by{" "}
            <strong style={{ color: "var(--gold)" }}>
              {getTrackProducerString(track, release)}
            </strong>
          </div>
          <div className="track-platform-grid">
            {availablePlatforms.map((platform) => (
              <a
                key={platform.key}
                href={platform.url}
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

export default function ReleasePage({ release: propRelease }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeFilter = searchParams.get("filter") || "all";
  const viewMode = searchParams.get("view") || location.state?.fromView || (() => {
    try { return sessionStorage.getItem("silachomka_music_view") || "grid"; } catch { return "grid"; }
  })();
  const { preferences: cookiePrefs, saveCustomPreferences } = useCookieConsent();
  const {
    releases: storeReleases,
    videos: storeVideos,
    gallery: storeGallery,
    isLoading: isStoreLoading,
  } = useChomkaStore();

  const [fetchedRelease, setFetchedRelease] = useState(null);
  const [isFetchingRelease, setIsFetchingRelease] = useState(false);

  const routeSlug = params?.slug || propRelease?.slug;

  const storeMatchedRelease = useMemo(() => {
    if (propRelease) return propRelease;
    if (!routeSlug || !Array.isArray(storeReleases)) return null;
    return storeReleases.find((r) => r.slug === routeSlug) || null;
  }, [propRelease, routeSlug, storeReleases]);

  // Direct API fetch for newly created / scheduled releases or to enrich associatedGallery & track previews
  useEffect(() => {
    const targetSlug = routeSlug || propRelease?.slug;
    if (!targetSlug) return;
    let cancelled = false;
    setIsFetchingRelease(true);
    fetch(`/api/releases/${encodeURIComponent(targetSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && data.slug) {
          setFetchedRelease({
            ...data,
            type: data.type ? data.type.toLowerCase() : "ep",
            associatedGallery: Array.isArray(data.associatedGallery)
              ? data.associatedGallery.map(normalizeGalleryPost)
              : [],
          });
          if (params?.slug && data.slug !== params.slug) {
            navigate(`/release/${data.slug}`, { replace: true });
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsFetchingRelease(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeSlug, propRelease?.slug, params?.slug, navigate]);

  const release = fetchedRelease || storeMatchedRelease;

  const [expandedTrackIdx, setExpandedTrackIdx] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const rawReleaseDate = release?.release_date || release?.date;
  const releaseTimestamp = useMemo(() => {
    if (!rawReleaseDate) return 0;
    const t = new Date(rawReleaseDate).getTime();
    return isNaN(t) ? 0 : t;
  }, [rawReleaseDate]);

  useEffect(() => {
    if (!releaseTimestamp) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [releaseTimestamp]);

  const isFuture = releaseTimestamp > 0 && releaseTimestamp > now;
  const isRecentRelease =
    releaseTimestamp > 0 &&
    !isFuture &&
    now - releaseTimestamp <= 30 * 24 * 60 * 60 * 1000;

  // Stage 31 Part 23: Smooth, non-blocking entry animation ("COMING SOON" or "OUT NOW") on release entry
  const [showEntrySplash, setShowEntrySplash] = useState(false);

  useEffect(() => {
    if (!release?.slug) return;
    // Trigger cinematic entry animation on release navigation
    setShowEntrySplash(true);
    const timer = setTimeout(() => {
      setShowEntrySplash(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, [release?.slug]);

  // Session-based dismissal for the persistent "OUT NOW" badge bar
  const [showOutNowCelebration, setShowOutNowCelebration] = useState(false);

  useEffect(() => {
    if (!release?.slug || !isRecentRelease) {
      setShowOutNowCelebration(false);
      return;
    }
    try {
      const key = `chomka_outnow_${release.slug || release.id}`;
      setShowOutNowCelebration(sessionStorage.getItem(key) !== "dismissed");
    } catch {
      setShowOutNowCelebration(true);
    }
  }, [release?.slug, release?.id, isRecentRelease]);

  const handleDismissOutNow = () => {
    setShowOutNowCelebration(false);
    try {
      const key = `chomka_outnow_${release?.slug || release?.id}`;
      sessionStorage.setItem(key, "dismissed");
    } catch {}
  };

  if (!release && (isStoreLoading || isFetchingRelease)) {
    return (
      <main className="release-page-view">
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
            Loading release...
          </p>
        </div>
      </main>
    );
  }

  /* Fallback for missing release */
  if (!release) {
    return (
      <main className="release-page-view">
        <div
          style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}
        >
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

  // Collect all valid track-level preview audio URLs (Stage 31 Part 9)
  const previewAudioPool = useMemo(() => {
    const pool = [];
    if (Array.isArray(allTracks) && allTracks.length > 0) {
      for (const t of allTracks) {
        if (t?.preview_audio_url && typeof t.preview_audio_url === 'string' && t.preview_audio_url.trim() && !pool.includes(t.preview_audio_url.trim())) {
          pool.push(t.preview_audio_url.trim());
        }
      }
    } else if (Array.isArray(release.preview_audio_urls)) {
      for (const u of release.preview_audio_urls) {
        if (u && typeof u === 'string' && u.trim() && !pool.includes(u.trim())) {
          pool.push(u.trim());
        }
      }
    }
    return pool;
  }, [allTracks, release.preview_audio_urls]);

  // Filter tracks based on the active filter from Music section
  const tracks = allTracks.filter((track) => {
    if (activeFilter === "ft_silachomka") {
      return (
        Array.isArray(track.featuring) &&
        track.featuring.some((f) => f.toLowerCase() === "silachomka")
      );
    }
    if (activeFilter === "prod_by_silachomka") {
      return (
        Array.isArray(track.producers) &&
        track.producers.some((p) => p.toLowerCase() === "silachomka")
      );
    }
    return true;
  });

  const associatedVideos =
    Array.isArray(release.videos) && release.videos.length > 0
      ? release.videos
      : Array.isArray(storeVideos) && release.id
      ? storeVideos.filter(
          (v) =>
            v.relatedReleaseId === release.id ||
            v.related_release_id === release.id
        )
      : [];

  const associatedGallery =
    Array.isArray(release.associatedGallery) &&
    release.associatedGallery.length > 0
      ? release.associatedGallery
      : Array.isArray(storeGallery) && release.id
      ? storeGallery.filter(
          (g) =>
            g.relatedReleaseId === release.id ||
            g.related_release_id === release.id
        )
      : [];

  const trackCount = tracks.length;
  const releaseNumber = String(release.number ?? "").padStart(2, "0");
  const currentUrl = absoluteUrl(`/release/${release.slug}`);
  const source = getReleaseSourceString(release);
  const spotifyEmbedUrl = getSpotifyEmbedUrl(platforms.spotify);

  const canonicalDateLabel =
    release.displayDate || formatGalleryDate(rawReleaseDate);

  // Req #11: Dynamic social share description for Future vs Active releases
  const statusLeadDescription = isFuture
    ? `${release.title} — Coming soon${
        canonicalDateLabel ? ` on ${canonicalDateLabel}` : ""
      }.`
    : `${release.title} — Out now.`;

  const socialShareDescription =
    release.description &&
    !release.description.toLowerCase().includes("coming soon") &&
    !release.description.toLowerCase().includes("out now")
      ? `${statusLeadDescription} ${release.description}`
      : statusLeadDescription;

  const timeDiff = Math.max(0, releaseTimestamp - now);
  const countdownDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const countdownHours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
  const countdownMinutes = Math.floor((timeDiff / 1000 / 60) % 60);
  const countdownSeconds = Math.floor((timeDiff / 1000) % 60);

  const albumJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: release.title,
    description: socialShareDescription,
    url: currentUrl,
    image: release.cover?.startsWith("http")
      ? release.cover
      : `https://silachomka.vercel.app${release.cover || "/og-image.png"}`,
    datePublished: release.date,
    byArtist: {
      "@type": "Person",
      name: "silachomka",
      url: "https://silachomka.vercel.app",
    },
    publisher: {
      "@type": "Organization",
      name: "chomkaMUSIC™",
      url: "https://silachomka.vercel.app",
    },
    numTracks: tracks.length,
    track: tracks.map((t, idx) => ({
      "@type": "MusicRecording",
      position: idx + 1,
      name: t.title,
      duration: t.duration,
      byArtist: {
        "@type": "Person",
        name: "silachomka",
      },
      producer: {
        "@type": "Person",
        name: getTrackProducerString(t, release),
      },
    })),
  };

  return (
    <main className="release-page-view">
      <SeoHead
        title={`${release.title} | silachomka`}
        description={socialShareDescription}
        path={`/release/${release.slug}`}
        image={release.cover || "/og-image.png"}
        type="music.album"
        imageAlt={`${release.title} official cover art`}
        jsonLd={albumJsonLd}
      />

      {/* Req #12: Smooth, Non-Blocking Entry Animation ("COMING SOON" or "OUT NOW") */}
      {showEntrySplash && (
        <div
          className="release-entry-splash"
          aria-hidden="true"
          style={{ pointerEvents: "none" }}
        >
          <div className="release-entry-splash-card">
            <span className="release-entry-splash-badge">
              {isFuture ? "COMING SOON" : "OUT NOW"}
            </span>
            <span className="release-entry-splash-title">{release.title}</span>
          </div>
        </div>
      )}

      {/* Req #7: Atmospheric Product-Themed Ambient Backdrop */}
      {release.cover && (
        <div className="product-ambient-backdrop" aria-hidden="true">
          <div
            className="ambient-artwork ambient-image-layer"
            style={{ backgroundImage: `url(${release.cover})` }}
          />
          <div className="ambient-gradient-overlay" />
        </div>
      )}

      {/* Breadcrumb Navigation (Stage 35 — Preserves List/Grid View State) */}
      <Link
        className="release-breadcrumb"
        to={{
          pathname: "/",
          search: `?${new URLSearchParams({
            ...(activeFilter !== "all" ? { filter: activeFilter } : {}),
            ...(viewMode === "list" ? { view: "list" } : {}),
          }).toString()}`,
          hash: "#music",
        }}
      >
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
              onError={(e) => {
                if (!e.target.dataset.triedFallback) {
                  e.target.dataset.triedFallback = "true";
                  e.target.src = "/og-image.png";
                }
              }}
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
          {showOutNowCelebration && isRecentRelease && (
            <div className="out-now-celebration-banner">
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span className="out-now-badge">OUT NOW</span>
                <span className="out-now-tagline">
                  Official Release · Available Worldwide
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissOutNow}
                className="out-now-close-btn"
                aria-label="Dismiss celebration"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}

          <p className="eyebrow">
            {isFuture
              ? "chomkaMUSIC™ Upcoming Release"
              : "chomkaMUSIC™ Official Release"}
          </p>

          <h1 className="release-title">{release.title}</h1>

          {/* Req #15: Status indicator row with deliberate breathing room, no bullet points */}
          <div className="release-status-row release-coming-soon-subline" style={{ margin: "14px 0 16px", display: "flex", alignItems: "center" }}>
            {isFuture ? (
              <span className="coming-soon-pill" style={{ margin: 0 }}>COMING SOON</span>
            ) : (
              <span className="out-now-pill" style={{ margin: 0 }}>OUT NOW</span>
            )}
          </div>

          <p className="release-description-text" style={{ marginTop: 0, marginBottom: "18px" }}>
            {release.description || statusLeadDescription}
          </p>

          {/* ===============================================
              FUTURE RELEASE COUNTDOWN OR STREAMING HUB
              =============================================== */}
          {isFuture ? (
            <div className="coming-soon-card">
              <div className="coming-soon-header">
                <span className="coming-soon-badge-label">COMING SOON</span>
                <span className="coming-soon-canonical-date">
                  Official Launch: {canonicalDateLabel}
                </span>
              </div>

              <div className="countdown-timer-grid">
                <div className="countdown-timer-box">
                  <span className="countdown-timer-num">
                    {String(countdownDays).padStart(2, "0")}
                  </span>
                  <span className="countdown-timer-unit">Days</span>
                </div>
                <div className="countdown-timer-colon">:</div>
                <div className="countdown-timer-box">
                  <span className="countdown-timer-num">
                    {String(countdownHours).padStart(2, "0")}
                  </span>
                  <span className="countdown-timer-unit">Hours</span>
                </div>
                <div className="countdown-timer-colon">:</div>
                <div className="countdown-timer-box">
                  <span className="countdown-timer-num">
                    {String(countdownMinutes).padStart(2, "0")}
                  </span>
                  <span className="countdown-timer-unit">Minutes</span>
                </div>
                <div className="countdown-timer-colon">:</div>
                <div className="countdown-timer-box">
                  <span className="countdown-timer-num">
                    {String(countdownSeconds).padStart(2, "0")}
                  </span>
                  <span className="countdown-timer-unit">Seconds</span>
                </div>
              </div>

              {/* 30-Second Pre-Release Preview Player (Track-level & Release-level pool, Req #19) */}
              {previewAudioPool.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <RandomPreviewPlayer
                    audioUrl={previewAudioPool[0]}
                    audioUrls={previewAudioPool}
                    projectTitle={release.title}
                    title={`${release.title} — PREVIEW`}
                  />
                </div>
              )}

              {getPlatformEntries(platforms).length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <div className="platform-section-title">
                    Pre-Save / Pre-Order
                  </div>
                  <div className="platform-grid">
                    {getPlatformEntries(platforms).map((platform) => (
                      <a
                        key={platform.key}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="platform-btn"
                        aria-label={`Pre-save ${release.title} on ${platform.name}`}
                      >
                        {platform.name} <RightArrowIcon size={14} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* EMBEDDED AUDIO PLAYER */}
              {spotifyEmbedUrl && (
                <div className="spotify-embed-container">
                  {cookiePrefs?.embeddedMedia !== false ? (
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
                  ) : (
                    <div
                      style={{
                        padding: "20px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        fontSize: "13px",
                        color: "var(--muted)",
                      }}
                    >
                      <span>
                        Third-party Spotify embed is paused by your cookie preferences.
                      </span>
                      <button
                        type="button"
                        className="cookie-btn cookie-btn-accept"
                        onClick={() =>
                          saveCustomPreferences({
                            ...cookiePrefs,
                            embeddedMedia: true,
                          })
                        }
                      >
                        Enable Embedded Media
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Streaming Platforms Grid */}
              <div>
                <div className="platform-section-title">Stream / Listen On</div>
                <div className="platform-grid">
                  {getPlatformEntries(platforms).map((platform) => (
                    <a
                      key={platform.key}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="platform-btn"
                      aria-label={`Listen to ${release.title} on ${platform.name}`}
                    >
                      {platform.name} <RightArrowIcon size={14} />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          <ShareLinkBox url={currentUrl} />

          {/* Tracklist Card */}
          <div className="tracklist-card">
            <div
              className="platform-section-title"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>
                Tracklist ({trackCount}
                {trackCount < allTracks.length ? ` of ${allTracks.length}` : ""})
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
                  release={release}
                  index={index}
                  isUnreleased={isFuture}
                  isExpanded={expandedTrackIdx === index}
                  onToggle={() =>
                    setExpandedTrackIdx(
                      expandedTrackIdx === index ? null : index
                    )
                  }
                />
              ))}
            </div>

            <div className="release-source-footer">
              Source: <strong>{source}</strong>
            </div>
          </div>

          {/* =========================================================
              ASSOCIATED MUSIC VIDEOS & VISUALIZERS SECTION
              ========================================================= */}
          {associatedVideos.length > 0 && (
            <div
              className="release-videos-section"
              style={{ marginTop: "32px" }}
            >
              <div
                className="platform-section-title"
                style={{ marginBottom: "16px" }}
              >
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
                    video.aspectRatio === "9:16" ||
                    video.aspect_ratio === "9:16";
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

          {/* =========================================================
              ASSOCIATED GALLERY, VISUALS & REELS SECTION
              ========================================================= */}
          {associatedGallery.length > 0 && (
            <div
              className="release-gallery-section"
              style={{ marginTop: "32px" }}
            >
              <div
                className="platform-section-title"
                style={{ marginBottom: "16px" }}
              >
                Associated Gallery & Visuals ({associatedGallery.length})
              </div>
              <div
                className="release-gallery-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "20px",
                }}
              >
                {associatedGallery.map((item) => {
                  const mediaSrc =
                    item.src ||
                    item.asset ||
                    (Array.isArray(item.slides) &&
                      (typeof item.slides[0] === "string"
                        ? item.slides[0]
                        : item.slides[0]?.asset || item.slides[0]?.src)) ||
                    null;
                  const isVid =
                    item.isVideo ||
                    item.type === "video" ||
                    item.post_type === "video" ||
                    item.assetType === "VIDEO" ||
                    /\.(mp4|webm|mov)(\?.*)?$/i.test(mediaSrc || "");
                  const isReel =
                    item.type === "reel" || item.post_type === "reel";
                  const itemTitle =
                    item.title || item.caption || "Studio Visual";

                  return (
                    <div
                      key={item.id || item.slug}
                      className="release-gallery-card"
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
                          paddingTop: isReel ? "125%" : "75%",
                          background: "#0d0d11",
                          overflow: "hidden",
                        }}
                      >
                        {mediaSrc ? (
                          isVid ? (
                            <video
                              src={mediaSrc}
                              muted
                              playsInline
                              loop
                              autoPlay
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
                            <img
                              src={mediaSrc}
                              alt={itemTitle}
                              loading="lazy"
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          )
                        ) : (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--muted)",
                              fontSize: "12px",
                            }}
                          >
                            Visual Media
                          </div>
                        )}
                        {item.type && (
                          <span
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              background: "rgba(0,0,0,0.75)",
                              color: "var(--gold)",
                              border: "1px solid rgba(223,194,125,0.4)",
                            }}
                          >
                            {item.type}
                          </span>
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
                            {item.category || "Gallery"}
                          </span>
                          <span
                            style={{ fontSize: "11px", color: "var(--muted)" }}
                          >
                            {formatGalleryDate(item.displayDate || item.date)}
                          </span>
                        </div>
                        <h4
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            margin: 0,
                            color: "var(--text-h)",
                          }}
                        >
                          {itemTitle}
                        </h4>
                        {item.caption && item.title && (
                          <p
                            style={{
                              fontSize: "13px",
                              margin: 0,
                              lineHeight: 1.4,
                              color: "var(--muted)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {item.caption}
                          </p>
                        )}
                        {item.externalSocialUrl || item.link ? (
                          <a
                            href={item.externalSocialUrl || item.link}
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
                            View Post <UpRightArrowIcon size={12} />
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

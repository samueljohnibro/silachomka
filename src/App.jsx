// src/App.jsx

import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { useChomkaStore } from "./data/store";
import { ARTIST_SOCIALS, ECOSYSTEM_SOCIALS } from "./data/socials";


import MediaSlideshow from "./components/MediaSlideshow";
import StarrySpaceBackground from "./components/StarrySpaceBackground";
import ReleasePage, { TrackRow } from "./components/ReleasePage";
import GalleryPostModal from "./components/GalleryPostModal";
import VideosSection from "./components/VideosSection";
import BeatsPage from "./pages/BeatsPage";
import BeatDetailPage from "./pages/BeatDetailPage";
import StudioPublisherPage from "./pages/StudioPublisherPage";
import GalleryPostPage from "./pages/GalleryPostPage";
import SeoHead from "./components/SeoHead";

import "./App.css";

/* =========================================================
   SCROLL TO HASH ENGINE (CROSS-PAGE ANCHOR SCROLLING)
   ========================================================= */

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace("#", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 60);

      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname, hash]);

  return null;
}

/* =========================================================
   RELEASE SORTING
   ========================================================= */

function sortReleasesByDate(releaseList) {
  return [...releaseList].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatFeatures(featuring) {
  if (!Array.isArray(featuring) || featuring.length === 0) {
    return "";
  }

  return `with ${featuring.join(" & ")}`;
}

function getTrackCount(release) {
  return release?.tracks?.length ?? 0;
}

/* =========================================================
   SITE HEADER (WITH MOBILE HAMBURGER & HASH INTEGRATION)
   ========================================================= */

function SiteHeader({
  beatsPage = false,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (beatsPage) {
    return (
      <>
        <header className="site-header">
          <Link
            className="wordmark"
            to="/"
            aria-label="Return to silachomka home"
            onClick={closeMobileMenu}
          >
            silachomka
          </Link>

          <nav aria-label="Beats desktop navigation">
            <Link to="/#music">
              Music
            </Link>

            <Link to="/#videos">
              Videos
            </Link>

            <Link to="/#gallery">
              Gallery
            </Link>

            <Link to="/#about">
              About
            </Link>

            <Link to="/#world">
              The World
            </Link>

            <Link to="/#connect">
              Connect
            </Link>

            <Link
              to="/beats"
              className="is-active"
              aria-current="page"
            >
              Beats
            </Link>
          </nav>

          <Link
            className="header-label"
            to="/"
            aria-label="Return to silachomka"
          >
            chomkaMUSIC™
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className={`nav-toggle ${isMobileMenuOpen ? "is-open" : ""}`}
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
            <span className="nav-toggle-bar" />
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        <div
          className={`mobile-nav-drawer ${isMobileMenuOpen ? "is-open" : ""}`}
          aria-hidden={!isMobileMenuOpen}
        >
          <div className="mobile-nav-links">
            <Link to="/#music" onClick={closeMobileMenu}>
              Music
            </Link>

            <Link to="/#videos" onClick={closeMobileMenu}>
              Videos
            </Link>

            <Link to="/#gallery" onClick={closeMobileMenu}>
              Gallery
            </Link>

            <Link to="/#about" onClick={closeMobileMenu}>
              About
            </Link>

            <Link to="/#world" onClick={closeMobileMenu}>
              The World
            </Link>

            <Link to="/#connect" onClick={closeMobileMenu}>
              Connect
            </Link>

            <Link to="/beats" onClick={closeMobileMenu} className="active">
              Beats
            </Link>
          </div>

          <div className="mobile-nav-footer">
            <span>chomkaMUSIC™</span>
            <span>Chomka Nation</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="site-header">
        <a
          className="wordmark"
          href="#top"
          aria-label="silachomka home"
          onClick={closeMobileMenu}
        >
          silachomka
        </a>

        <nav aria-label="Main desktop navigation">
          <a href="#music">
            Music
          </a>

          <a href="#videos">
            Videos
          </a>

          <a href="#gallery">
            Gallery
          </a>

          <a href="#about">
            About
          </a>

          <a href="#world">
            The World
          </a>

          <a href="#connect">
            Connect
          </a>

          <Link to="/beats">
            Beats
          </Link>
        </nav>

        <a
          className="header-label"
          href="#top"
          aria-label="silachomka"
        >
          chomkaMUSIC™
        </a>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className={`nav-toggle ${isMobileMenuOpen ? "is-open" : ""}`}
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
        >
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
          <span className="nav-toggle-bar" />
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`mobile-nav-drawer ${isMobileMenuOpen ? "is-open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-nav-links">
          <a href="#music" onClick={closeMobileMenu}>
            Music
          </a>

          <a href="#videos" onClick={closeMobileMenu}>
            Videos
          </a>

          <a href="#gallery" onClick={closeMobileMenu}>
            Gallery
          </a>

          <a href="#about" onClick={closeMobileMenu}>
            About
          </a>

          <a href="#world" onClick={closeMobileMenu}>
            The World
          </a>

          <a href="#connect" onClick={closeMobileMenu}>
            Connect
          </a>

          <Link to="/beats" onClick={closeMobileMenu}>
            Beats
          </Link>
        </div>

        <div className="mobile-nav-footer">
          <span>chomkaMUSIC™</span>
          <span>Chomka Nation</span>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   SITE FOOTER
   ========================================================= */

function SiteFooter() {
  const navigate = useNavigate();
  const [clickCount, setClickCount] = useState(0);

  const handleSecretClick = () => {
    const next = clickCount + 1;
    if (next >= 3) {
      setClickCount(0);
      navigate("/studio");
    } else {
      setClickCount(next);
      setTimeout(() => setClickCount(0), 1200);
    }
  };

  return (
    <footer id="label" className="site-footer">
      <div className="footer-meta">
        <strong className="footer-brand" onClick={handleSecretClick} title="Chomka Nation">
          silachomka
        </strong>
        <span>Official Artist & Media Hub</span>
        <span>A chomkaMUSIC™ artist</span>
        <span>Part of Chomka Nation</span>
        <span
          className="footer-secret-link"
          onClick={handleSecretClick}
          title="Chomka Nation"
        >
          © {new Date().getFullYear()} Chomka Nation
        </span>
        <span>All rights reserved</span>
      </div>

      <nav className="footer-social-links" aria-label="Artist social links">
        {ARTIST_SOCIALS.slice(0, 5).map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-social-tag"
          >
            {s.name}
          </a>
        ))}
      </nav>
    </footer>
  );
}

/* =========================================================
   RELEASE CARD
   ========================================================= */

function ReleaseCard({
  release,
  isLatest = false,
  activeFilter = "all",
}) {
  const trackCount = getTrackCount(release);

  return (
    <article className="release-card">
      <Link
        className="release-art"
        to={`/release/${release.slug}${activeFilter !== 'all' ? '?filter=' + activeFilter : ''}`}
        aria-label={`Open ${release.title}`}
      >
        {release.cover && (
          <img
            src={release.cover}
            alt={`${release.title} cover art`}
            className="release-cover-image"
            loading={
              isLatest
                ? "eager"
                : "lazy"
              }
            decoding="async"
          />
        )}

        <span
          className="release-cover-overlay"
          aria-hidden="true"
        />

        <div className="release-number">
          {String(
            release.number ?? ""
          ).padStart(2, "0")}
        </div>

        <div className="release-art-meta">
          {trackCount}{" "}
          {trackCount === 1
            ? "track"
            : "tracks"}
        </div>
      </Link>

      <div className="release-info">
        <div>
          <p className="release-label">
            {isLatest
              ? "LATEST RELEASE"
              : "RELEASE"}
          </p>

          <h3>
            {release.title}
          </h3>
          {release.artist && release.artist !== "silachomka" && (
            <p className="release-artist">{release.artist}</p>
          )}

          <p>
            {release.displayDate}
          </p>

        </div>

        <Link
          className="text-button"
          to={`/release/${release.slug}${activeFilter !== 'all' ? '?filter=' + activeFilter : ''}`}
        >
          View release →
        </Link>
      </div>
    </article>
  );
}

/* =========================================================
   HERO SLIDESHOW
   ========================================================= */

function HeroSlideshow() {
  const { releases, gallery } = useChomkaStore();

  const heroMedia = useMemo(() => {
    // 1. Music project cover arts
    const releaseMedia = (releases || [])
      .filter((r) => Boolean(r.cover))
      .map((r) => ({
        id: `release-${r.slug || r.title}`,
        src: r.cover,
        title: r.title,
        type: "image",
      }));

    // 2. Gallery photos and videos (including carousel slides)
    const galleryMedia = (gallery || []).flatMap((g) => {
      if (Array.isArray(g.slides) && g.slides.length > 0) {
        return g.slides.map((slideSrc, sIdx) => ({
          id: `gallery-${g.id}-${sIdx}`,
          src: slideSrc,
          title: g.title,
          type: g.slideTypes?.[sIdx] || (typeof slideSrc === "string" && (slideSrc.startsWith("data:video") || slideSrc.endsWith(".mp4") || slideSrc.endsWith(".webm") || slideSrc.endsWith(".mov")) ? "video" : "image"),
        }));
      }
      const primary = g.src || g.videoSrc;
      if (!primary) return [];
      return [
        {
          id: `gallery-${g.id}`,
          src: primary,
          title: g.title,
          type: g.type || (typeof primary === "string" && (primary.startsWith("data:video") || primary.endsWith(".mp4") || primary.endsWith(".webm") || primary.endsWith(".mov")) ? "video" : "image"),
        },
      ];
    });

    const combined = [...releaseMedia, ...galleryMedia];

    // Fallbacks if nothing is found
    if (combined.length === 0) {
      return [
        { id: "fallback-noisemaker", src: "/covers/noisemaker.png", title: "NOISEMAKER", type: "image" },
        { id: "fallback-item5", src: "/covers/item5.jpg", title: "ITEM5", type: "image" },
        { id: "fallback-love-language", src: "/covers/love-language.png", title: "LOVE LANGUAGE", type: "image" },
      ];
    }

    // Pure pseudorandom shuffle across all cover arts and gallery posts
    const shuffled = [...combined];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const code = (shuffled[i]?.id || shuffled[i]?.src || "").charCodeAt(0) || 17;
      const j = (i * 31 + code * 13) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [releases, gallery]);

  return (
    <MediaSlideshow
      media={heroMedia}
      className="hero-slideshow"
      ariaLabel="silachomka music and gallery visual archive"
    />
  );
}

/* =========================================================
   HOME HERO
   ========================================================= */

function HomeHero() {
  return (
    <section className="hero">
      <HeroSlideshow />

      <div className="hero-slideshow-overlay">
        <span
          className="hero-slideshow-overlay-inner"
          aria-hidden="true"
        />
      </div>

      <div className="hero-content">
        <p className="eyebrow">
          ARTIST / SONGWRITER / CREATOR
        </p>

        <h1>
          silachomka
        </h1>

        <p className="hero-copy">
          Music, visuals and everything in
          between.
          <br />
          This is the official home of
          silachomka.
        </p>

        <div className="hero-actions">
          <a
            href="#music"
            className="primary-button"
          >
            Explore music
          </a>

          <Link
            to="/beats"
            className="secondary-button"
          >
            Explore beats
          </Link>
        </div>
      </div>

      <div
        className="hero-mark"
        aria-hidden="true"
      >
        <span>
          SC
        </span>
      </div>
    </section>
  );
}

/* =========================================================
   LATEST RELEASE
   ========================================================= */

function LatestReleaseSection({
  release,
}) {
  if (!release) {
    return null;
  }

  const trackCount = getTrackCount(release);

  return (
    <section className="latest-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            LATEST RELEASE
          </p>

          <h2>
            {release.title}
          </h2>
          {release.artist && release.artist !== "silachomka" && (
            <p className="release-artist">{release.artist}</p>
          )}
        </div>

        <span>
          {release.displayDate}
        </span>
      </div>

      <div className="latest-release">
        <Link
          to={`/release/${release.slug}`}
          className="latest-art"
          aria-label={`Open ${release.title}`}
        >
          {release.cover && (
            <img
              src={release.cover}
              alt={`${release.title} cover art`}
              className="latest-cover-image"
              loading="eager"
              decoding="async"
            />
          )}

          <span
            className="latest-cover-overlay"
            aria-hidden="true"
          />

          <span className="latest-art-number">
            {String(
              release.number ?? ""
            ).padStart(2, "0")}
          </span>
        </Link>

        <div className="latest-details">
          <p>
            {trackCount}{" "}
            {trackCount === 1
              ? "track"
              : "tracks"}
          </p>

          <ol>
            {release.tracks?.map(
              (track, index) => (
                <li
                  key={`${track.title}-${index}`}
                >
                  <span>
                    {track.title}
                  </span>

                  {track.featuring?.length > 0 && (
                    <small>
                      {formatFeatures(
                        track.featuring
                      )}
                    </small>
                  )}
                </li>
              )
            )}
          </ol>

          <Link
            className="primary-button"
            to={`/release/${release.slug}`}
          >
            Open release
          </Link>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   MUSIC SECTION
   ========================================================= */

function MusicSection({ releases: sortedReleases, totalTracks }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("filter") || "all";
  const subFilter = searchParams.get("sub") || "";
  const viewMode = searchParams.get("view") || "grid";
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Type filters that can be conjoined with SILACHOMKA
  const TYPE_FILTERS = ["singles", "eps", "albums"];
  // Exclusive filters that clear everything
  const EXCLUSIVE_FILTERS = ["all", "ft_silachomka", "prod_by_silachomka"];

  const isSilachomkaActive = activeFilter === "silachomka";
  const isConjoined = isSilachomkaActive && TYPE_FILTERS.includes(subFilter);

  const updateParams = (filter, sub) => {
    const p = new URLSearchParams(searchParams);
    if (!filter || filter === "all") { p.delete("filter"); p.delete("sub"); }
    else { p.set("filter", filter); if (sub) p.set("sub", sub); else p.delete("sub"); }
    setSearchParams(p, { replace: true, preventScrollReset: true });
  };

  const handleFilterClick = (filterId) => {
    if (EXCLUSIVE_FILTERS.includes(filterId)) {
      // Exclusive: clear everything
      updateParams(filterId === "all" ? null : filterId, null);
    } else if (filterId === "silachomka") {
      if (isSilachomkaActive) {
        // Clicking silachomka when already active: deselect it
        if (subFilter) updateParams(subFilter, null); // keep the sub as main
        else updateParams(null, null); // go to all
      } else {
        updateParams("silachomka", null);
      }
    } else if (TYPE_FILTERS.includes(filterId)) {
      if (isSilachomkaActive) {
        // Conjoin with silachomka
        if (subFilter === filterId) {
          // Already conjoined with this type, deselect the type
          updateParams("silachomka", null);
        } else {
          updateParams("silachomka", filterId);
        }
      } else {
        // Standalone type filter
        if (activeFilter === filterId) updateParams(null, null);
        else updateParams(filterId, null);
      }
    }
  };

  const handleDeselectSilachomka = (e) => {
    e.stopPropagation();
    // Remove silachomka, keep the sub-filter as main
    updateParams(subFilter, null);
  };

  const handleDeselectSub = (e) => {
    e.stopPropagation();
    // Remove sub-filter, keep silachomka
    updateParams("silachomka", null);
  };

  const setViewMode = (mode) => {
    const p = new URLSearchParams(searchParams);
    if (mode === "grid") p.delete("view"); else p.set("view", mode);
    setSearchParams(p, { replace: true, preventScrollReset: true });
  };

  const hasAlbums = sortedReleases.some((r) => r.type === "album");

  const filteredReleases = useMemo(() => {
    let results = sortedReleases;
    const f = activeFilter;
    const s = subFilter;

    if (f === "all") return results;

    if (f === "silachomka") {
      results = results.filter(r => r.artist === "silachomka");
      if (s === "singles") results = results.filter(r => r.type === "single");
      else if (s === "eps") results = results.filter(r => r.type === "ep");
      else if (s === "albums") results = results.filter(r => r.type === "album");
    } else if (f === "singles") results = results.filter(r => r.type === "single");
    else if (f === "eps") results = results.filter(r => r.type === "ep");
    else if (f === "albums") results = results.filter(r => r.type === "album");
    else if (f === "ft_silachomka") results = results.filter(r => r.featsSilachomka === true);
    else if (f === "prod_by_silachomka") results = results.filter(r => r.producedBySilachomka !== false);

    return results;
  }, [sortedReleases, activeFilter, subFilter]);

  const toggleFilterMenu = () => setFilterMenuOpen(!filterMenuOpen);

  // Build the filter button label and state for each filter
  const getFilterLabel = (filterId) => {
    const labels = { all: "ALL", silachomka: "SILACHOMKA", singles: "SINGLES", eps: "EPS", albums: "ALBUMS", ft_silachomka: "FT. SILACHOMKA", prod_by_silachomka: "PROD. BY SILACHOMKA" };
    const baseLabel = labels[filterId] || filterId;

    if (TYPE_FILTERS.includes(filterId)) {
      if (isSilachomkaActive && !isConjoined) return `+ ${baseLabel}`;
      if (isConjoined && subFilter === filterId) return baseLabel;
    }
    return baseLabel;
  };

  const isFilterActive = (filterId) => {
    if (filterId === activeFilter) return true;
    if (isConjoined && filterId === subFilter) return true;
    return false;
  };

  // For mobile hamburger label
  const getMobileLabel = () => {
    if (isConjoined) {
      const labels = { singles: "SINGLES", eps: "EPS", albums: "ALBUMS" };
      return `SILACHOMKA + ${labels[subFilter]}`;
    }
    const labels = { all: "ALL", silachomka: "SILACHOMKA", singles: "SINGLES", eps: "EPS", albums: "ALBUMS", ft_silachomka: "FT. SILACHOMKA", prod_by_silachomka: "PROD. BY SILACHOMKA" };
    return labels[activeFilter] || "ALL";
  };

  // Filters to render
  const visibleFilters = [
    "all", "silachomka", "singles", "eps",
    ...(hasAlbums ? ["albums"] : []),
    "ft_silachomka", "prod_by_silachomka",
  ];

  const filteredTracksCount = useMemo(() => {
    return filteredReleases.reduce((acc, release) => {
      let tracks = release.tracks || [];
      if (activeFilter === "ft_silachomka") {
        tracks = tracks.filter(t => Array.isArray(t.featuring) && t.featuring.some(f => f.toLowerCase() === "silachomka"));
      } else if (activeFilter === "prod_by_silachomka") {
        tracks = tracks.filter(t => Array.isArray(t.producers) && t.producers.some(p => p.toLowerCase() === "silachomka"));
      }
      return acc + tracks.length;
    }, 0);
  }, [filteredReleases, activeFilter]);

  return (
    <section className="music-section" id="music">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DISCOGRAPHY</p>
          <h2>Music</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "4px", border: "1px solid var(--line-gold)", borderRadius: "3px", padding: "2px" }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                background: viewMode === "grid" ? "rgba(223, 194, 125, 0.15)" : "transparent",
                color: viewMode === "grid" ? "var(--gold)" : "var(--text-secondary)",
                border: "none", padding: "5px 10px", cursor: "pointer", fontSize: "9px", fontWeight: "700", borderRadius: "2px", textTransform: "uppercase", letterSpacing: "0.08em",
              }}
            >Grid</button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                background: viewMode === "list" ? "rgba(223, 194, 125, 0.15)" : "transparent",
                color: viewMode === "list" ? "var(--gold)" : "var(--text-secondary)",
                border: "none", padding: "5px 10px", cursor: "pointer", fontSize: "9px", fontWeight: "700", borderRadius: "2px", textTransform: "uppercase", letterSpacing: "0.08em",
              }}
            >List</button>
          </div>
          <span style={{ fontSize: "11px", letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
            {filteredReleases.length} {filteredReleases.length === 1 ? "release" : "releases"} <span style={{ opacity: 0.5, margin: "0 4px" }}>|</span> {filteredTracksCount} {filteredTracksCount === 1 ? "track" : "tracks"}
          </span>
        </div>
      </div>

      <div className="filter-toolbar">
        <div className="filter-hamburger">
          <button
            className="filter-toggle-btn"
            onClick={toggleFilterMenu}
            aria-expanded={filterMenuOpen}
          >
            {getMobileLabel()}{" "}
            <span className="filter-icon">▼</span>
          </button>

          {filterMenuOpen && (
            <div className="filter-dropdown">
              {visibleFilters.map((filterId) => (
                <button
                  key={filterId}
                  className={`filter-dropdown-item ${isFilterActive(filterId) ? "is-active" : ""}`}
                  onClick={() => {
                    handleFilterClick(filterId);
                    setFilterMenuOpen(false);
                  }}
                >
                  {getFilterLabel(filterId)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="filter-desktop-list">
          {visibleFilters.map((filterId) => {
            const active = isFilterActive(filterId);
            const showX = isConjoined && (filterId === "silachomka" || filterId === subFilter);

            return (
              <button
                key={filterId}
                className={`filter-btn ${active ? "is-active" : ""}`}
                onClick={() => handleFilterClick(filterId)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {getFilterLabel(filterId)}
                {showX && (
                  <span
                    onClick={filterId === "silachomka" ? handleDeselectSilachomka : handleDeselectSub}
                    style={{ marginLeft: "2px", fontSize: "10px", lineHeight: 1, opacity: 0.8 }}
                    aria-label={`Remove ${filterId} filter`}
                  >×</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {filteredReleases.length > 0 ? (
        viewMode === "grid" ? (
          <div className="release-grid">
            {filteredReleases.map((release, index) => {
              const dynamicNumber = filteredReleases.length - index;
              return (
                <ReleaseCard
                  key={release.slug ?? release.id ?? release.title ?? index}
                  release={{ ...release, number: dynamicNumber }}
                  isLatest={activeFilter === "all" && index === 0}
                  activeFilter={activeFilter}
                />
              );
            })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginTop: "24px" }}>
            {filteredReleases.map((release, index) => {
              let tracksToShow = release.tracks || [];
              if (activeFilter === "ft_silachomka") {
                tracksToShow = tracksToShow.filter(t => Array.isArray(t.featuring) && t.featuring.some(f => f.toLowerCase() === "silachomka"));
              } else if (activeFilter === "prod_by_silachomka") {
                tracksToShow = tracksToShow.filter(t => Array.isArray(t.producers) && t.producers.some(p => p.toLowerCase() === "silachomka"));
              }
              const dynamicNumber = filteredReleases.length - index;
              return (
                <div key={release.slug ?? index} className="tracklist-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                      {release.cover && (
                        <div style={{ position: "relative", zIndex: 10, width: "40px", height: "40px" }}>
                          <img 
                            src={release.cover} 
                            alt={release.title} 
                            className="list-view-cover"
                            style={{ 
                              width: "40px", height: "40px", 
                              borderRadius: "4px", objectFit: "cover",
                              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                              transformOrigin: "left center",
                              position: "absolute",
                              top: 0, left: 0
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scale(6.25)";
                              e.currentTarget.style.boxShadow = "0 20px 48px rgba(0, 0, 0, 0.8), 0 0 25px var(--gold-glow)";
                              e.currentTarget.style.borderRadius = "2px";
                              e.currentTarget.style.zIndex = "50";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.borderRadius = "4px";
                              e.currentTarget.style.zIndex = "10";
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0, fontSize: "14px" }}>{release.title}</h3>
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--gold)", letterSpacing: "0.05em" }}>
                          Release {String(dynamicNumber).padStart(2, "0")} • {release.artist && release.artist !== "silachomka" ? release.artist : "silachomka"}
                        </p>
                      </div>
                    </div>
                    <Link to={`/release/${release.slug}${activeFilter !== "all" ? "?filter=" + activeFilter : ""}`} className="text-button" style={{ fontSize: "10px" }}>
                      View release →
                    </Link>
                  </div>
                  <div>
                    {tracksToShow.map((track, trackIndex) => (
                      <TrackRow key={`${release.slug}-track-${trackIndex}`} track={track} index={trackIndex} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="gallery-placeholder">
          <span>01</span>
          <h3>No releases found.</h3>
          <p>No music matches the selected filter.</p>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   GALLERY SECTION (INSTAGRAM-STYLE VISUAL ARCHIVE)
   ========================================================= */

function GallerySection() {
  const { gallery } = useChomkaStore();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activePost, setActivePost] = useState(null);

  const categories = useMemo(
    () => [
      { id: "all", label: "All Posts" },
      { id: "releases", label: "Releases" },
      { id: "freestyles", label: "Freestyles & Covers" },
      { id: "portraits", label: "Portraits & Style" },
      { id: "videos", label: "Videos" },
      { id: "bts", label: "Studio & BTS" },
    ],
    []
  );

  const filteredPosts = useMemo(() => {
    const list = Array.isArray(gallery) ? gallery : [];
    if (activeCategory === "all") return list;
    return list.filter((item) => item.category === activeCategory);
  }, [activeCategory, gallery]);

  const activeIndex = useMemo(() => {
    if (!activePost) return -1;
    return filteredPosts.findIndex((p) => p.id === activePost.id);
  }, [activePost, filteredPosts]);

  const handlePrevPost = () => {
    if (activeIndex > 0) {
      setActivePost(filteredPosts[activeIndex - 1]);
    }
  };

  const handleNextPost = () => {
    if (activeIndex < filteredPosts.length - 1) {
      setActivePost(filteredPosts[activeIndex + 1]);
    }
  };

  return (
    <section className="gallery-section" id="gallery">
      <div className="section-heading">
        <div>
          <p className="eyebrow">VISUAL ARCHIVE</p>
          <h2>Gallery</h2>
        </div>

        <span className="gallery-post-count">{filteredPosts.length} entries</span>
      </div>

      {/* Category Filter Pills */}
      <div className="gallery-category-bar" role="tablist">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={`gallery-category-pill ${activeCategory === cat.id ? "is-active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Instagram-Style Grid */}
      <div className="gallery-grid">
        {filteredPosts.map((post) => {
          const primarySrc = post.src || post.slides?.[0] || post.videoSrc;
          const isVideo =
            post.type === "video" ||
            Boolean(post.videoSrc) ||
            (typeof primarySrc === "string" &&
              (primarySrc.startsWith("data:video") ||
                primarySrc.endsWith(".mp4") ||
                primarySrc.endsWith(".webm") ||
                primarySrc.endsWith(".mov")));
          const isCarousel =
            (post.type === "carousel" || post.slides?.length > 1) && post.slides?.length > 1;

          return (
            <article
              key={post.id}
              className="gallery-card"
              onClick={() => setActivePost(post)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setActivePost(post)}
              aria-label={`Open ${post.title || "archive post"}`}
            >
              <div className="gallery-card-frame">
                {isVideo ? (
                  <video
                    src={primarySrc}
                    muted
                    playsInline
                    className="gallery-card-image"
                  />
                ) : (
                  <img
                    src={primarySrc}
                    alt={post.title || "Archive item"}
                    className="gallery-card-image"
                    loading="lazy"
                  />
                )}

                {/* Media Type Badges in Top-Right */}
                {isCarousel && (
                  <span className="gallery-card-badge" title="Multi-media Carousel">
                    ⧉
                  </span>
                )}

                {isVideo && !isCarousel && (
                  <span className="gallery-card-badge" title="Video Clip">
                    ▶
                  </span>
                )}

                {/* Hover Caption Overlay */}
                <div className="gallery-card-overlay">
                  <span className="gallery-overlay-cat">{post.category}</span>
                  <p className="gallery-overlay-title">{post.title}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activePost && (
        <GalleryPostModal
          post={activePost}
          onClose={() => setActivePost(null)}
          onPrev={handlePrevPost}
          onNext={handleNextPost}
          hasPrev={activeIndex > 0}
          hasNext={activeIndex < filteredPosts.length - 1}
        />
      )}
    </section>
  );
}

/* =========================================================
   ABOUT SECTION
   ========================================================= */

function AboutSection() {
  return (
    <section className="about-section" id="about">
      <div>
        <p className="eyebrow">ABOUT silachomka</p>
        <h2>More than the music.</h2>
      </div>

      <div className="about-copy">
        <p>
          silachomka is the artist identity of Samuel John-Ibro — a multidisciplinary creative working across music, technology and visual culture.
        </p>

        <p>
          The music lives under <strong>chomkaMUSIC™</strong>, while the wider creative, technology and sports ecosystem sits under <strong>Chomka Nation</strong>.
        </p>
      </div>
    </section>
  );
}

/* =========================================================
   WORLD SECTION (CHOMKA NATION ECOSYSTEM ARCHITECTURE)
   ========================================================= */

function WorldSection() {
  return (
    <section className="world-section" id="world">
      <div className="world-card">
        <p className="eyebrow">THE ECOSYSTEM ARCHITECTURE</p>

        <h2>CHOMKA NATION</h2>

        <p>
          The overarching parent ecosystem. Multiple creative, music, software and athletic divisions.
        </p>

        <div className="ecosystem">
          {/* Pillar 1: chomkaMUSIC */}
          <div className="ecosystem-card">
            <div className="ecosystem-card-header">
              <strong>chomkaMUSIC™</strong>
              <span className="ecosystem-role-tag">Music & Studio Ecosystem</span>
            </div>

            <div className="ecosystem-sublist">
              <div className="ecosystem-subitem">
                <span className="ecosystem-subitem-title">silachomka</span>
                <span className="ecosystem-subitem-desc">Primary Artist Identity & Creative Direction</span>
              </div>
              <div className="ecosystem-subitem">
                <span className="ecosystem-subitem-title">chomkaMUSIC Studio</span>
                <span className="ecosystem-subitem-desc">Audio Production, Master Licensing & Beat Catalogue</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: chomkaTECH */}
          <div className="ecosystem-card">
            <div className="ecosystem-card-header">
              <strong>chomkaTECH™</strong>
              <span className="ecosystem-role-tag">Technology & Software</span>
            </div>

            <div className="ecosystem-sublist">
              <div className="ecosystem-subitem">
                <span className="ecosystem-subitem-title">Software Engineering</span>
                <span className="ecosystem-subitem-desc">Digital platforms, web applications & creator tools</span>
              </div>
              <div className="ecosystem-subitem">
                <span className="ecosystem-subitem-title">Orbit</span>
                <span className="ecosystem-subitem-desc">Studio software, workflow automation & intelligent tools</span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Spartamonuel */}
          <div className="ecosystem-card">
            <div className="ecosystem-card-header">
              <strong>Spartamonuel</strong>
              <span className="ecosystem-role-tag">Sports & Performance</span>
            </div>

            <div className="ecosystem-sublist">
              <div className="ecosystem-subitem">
                <span className="ecosystem-subitem-title">Athletic Brand</span>
                <span className="ecosystem-subitem-desc">Sports, training, fitness & discipline</span>
              </div>
              <div className="ecosystem-subitem">
                <span className="ecosystem-subitem-title">Distinct Identity</span>
                <span className="ecosystem-subitem-desc">Co-created by Samuel & his brother</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   SOCIALS & CHANNELS SECTION
   ========================================================= */

function SocialsSection() {
  return (
    <section className="socials-section" id="connect">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OFFICIAL CHANNELS</p>
          <h2>Connect</h2>
        </div>

        <span>Direct Networks</span>
      </div>

      <div className="socials-container">
        {/* Personal / Artist Channels */}
        <div className="social-group">
          <h3 className="social-group-title">silachomka Official</h3>
          <div className="social-grid">
            {ARTIST_SOCIALS.map((soc) => (
              <a
                key={soc.id}
                href={soc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-card"
                aria-label={`Visit silachomka on ${soc.name}`}
              >
                <div className="social-card-inner">
                  <span className="social-name">{soc.name}</span>
                  <span className="social-handle">{soc.handle}</span>
                </div>
                <span className="social-arrow">↗</span>
              </a>
            ))}
          </div>
        </div>

        {/* Ecosystem Channels */}
        <div className="social-group" style={{ marginTop: "40px" }}>
          <h3 className="social-group-title">Ecosystem Brands</h3>
          <div className="social-grid">
            {ECOSYSTEM_SOCIALS.map((eco) => (
              <a
                key={eco.id}
                href={eco.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-card"
                aria-label={`Visit ${eco.name} on ${eco.platform}`}
              >
                <div className="social-card-inner">
                  <span className="social-name">{eco.name}</span>
                  <span className="social-handle">{eco.role}</span>
                </div>
                <span className="social-arrow">↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   HOME PAGE
   ========================================================= */

function HomePage() {
  const { releases } = useChomkaStore();

  const sortedReleases = useMemo(
    () =>
      sortReleasesByDate(
        Array.isArray(releases)
          ? releases
          : []
      ),
    [releases]
  );

  const latestRelease =
    sortedReleases[0] ?? null;

  const totalTracks = useMemo(
    () =>
      sortedReleases.reduce(
        (total, release) =>
          total +
          getTrackCount(release),
        0
      ),
    [sortedReleases]
  );

  return (
    <>
      <SeoHead
        title="silachomka — Official Home"
        description="Official artist website of silachomka. Music, visuals, beat store, and everything in between — part of chomkaMUSIC™ and Chomka Nation."
        path="/"
        image="/og-image.png"
        imageAlt="silachomka official logo"
      />
      <SiteHeader />

      <main id="top">
        <HomeHero />

        {latestRelease && (
          <LatestReleaseSection
            release={latestRelease}
          />
        )}

        <MusicSection
          releases={sortedReleases}
          totalTracks={totalTracks}
        />

        <VideosSection />

        <GallerySection />

        <AboutSection />

        <WorldSection />

        <SocialsSection />
      </main>

      <SiteFooter />
    </>
  );
}

/* =========================================================
   BEATS ROUTE
   ========================================================= */

function BeatsRoute() {
  return (
    <>
      <SiteHeader beatsPage />

      <BeatsPage />

      <SiteFooter />
    </>
  );
}

/* =========================================================
   BEAT DETAIL ROUTE (/beats/:id)
   ========================================================= */

function BeatDetailRoute() {
  return (
    <>
      <SiteHeader beatsPage />

      <BeatDetailPage />

      <SiteFooter />
    </>
  );
}

/* =========================================================
   STUDIO PUBLISHER ROUTE (/studio)
   ========================================================= */

function StudioRoute() {
  return (
    <>
      <SiteHeader beatsPage />

      <StudioPublisherPage />

      <SiteFooter />
    </>
  );
}

/* =========================================================
   GALLERY POST ROUTE (/gallery/:id)
   ========================================================= */

function GalleryPostRoute() {
  return (
    <>
      <SiteHeader beatsPage />
      <GalleryPostPage />
      <SiteFooter />
    </>
  );
}

/* =========================================================
   RELEASE ROUTE (/release/:slug)
   ========================================================= */

function ReleaseRoute() {
  const { slug } = useParams();
  const { releases } = useChomkaStore();

  const release = useMemo(
    () =>
      Array.isArray(releases)
        ? releases.find(
            (item) =>
              item.slug === slug
          )
        : undefined,
    [releases, slug]
  );

  return (
    <ReleasePage
      release={release}
    />
  );
}

/* =========================================================
   NOT FOUND
   ========================================================= */

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <SiteHeader />

      <main className="release-page-view">
        <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}>
          <p className="eyebrow">
            404 / NOT FOUND
          </p>

          <h1 className="release-title">
            Page Not Found
          </h1>

          <p style={{ color: "var(--muted)", margin: "20px 0 35px" }}>
            The release or beat you requested could not be located in the archive.
          </p>

          <button
            className="primary-button"
            type="button"
            onClick={() =>
              navigate("/")
            }
          >
            Back to Home
          </button>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/* =========================================================
   APP MAIN ROOT
   ========================================================= */

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        navigate("/studio");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <>
      {/* Dynamic Starry Space Atmosphere */}
      <StarrySpaceBackground />

      {/* Ambient Celestial Glow Layer */}
      <div className="ambient-glow-layer" aria-hidden="true" />

      {/* Cross-Page Hash Scroll Engine */}
      <ScrollToHash />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage />
          }
        />

        <Route
          path="/beats"
          element={
            <BeatsRoute />
          }
        />

        <Route
          path="/beats/:id"
          element={
            <BeatDetailRoute />
          }
        />

        <Route
          path="/studio"
          element={
            <StudioRoute />
          }
        />

        <Route
          path="/gallery/:id"
          element={
            <GalleryPostRoute />
          }
        />

        <Route
          path="/release/:slug"
          element={
            <ReleaseRoute />
          }
        />

        <Route
          path="*"
          element={
            <NotFoundPage />
          }
        />
      </Routes>
    </>
  );
}

export default App;

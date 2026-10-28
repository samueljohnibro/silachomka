import { DownCaretIcon , UpRightArrowIcon, RightArrowIcon } from './components/Icons';
// src/App.jsx

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { useChomkaStore } from "./data/store";
import { CurrencyProvider } from "./data/CurrencyContext";
import { CookieConsentProvider, useCookieConsent } from "./data/CookieConsentContext";
import CookieConsentBanner from "./components/CookieConsentBanner";
import ChomkaAiAssistantModal from "./components/ChomkaAiAssistantModal";
import { PrivacyPolicyPage, CookiePolicyPage, TermsOfUsePage } from "./pages/LegalPages";

// Admin CMS Imports
import { AdminAuthProvider } from "./pages/admin/AdminAuthProvider";
import { ProtectedRoute, GuestRoute } from "./pages/admin/AdminRoutes";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { 
  AdminMediaPlaceholder, 
  AdminLinksPlaceholder, 
  AdminSettingsPlaceholder 
} from "./pages/admin/AdminPlaceholders";

import AdminMusicPage from "./pages/admin/AdminMusicPage";
import AdminGalleryPage from "./pages/admin/AdminGalleryPage";
import AdminBeatsPage from "./pages/admin/AdminBeatsPage";
import AdminTracksPage from "./pages/admin/AdminTracksPage";
import AdminMediaPage from "./pages/admin/AdminMediaPage";
import AdminLinksPage from "./pages/admin/AdminLinksPage";
import AdminMerchandisePage from "./pages/admin/AdminMerchandisePage";
import AdminVideosPage from "./pages/admin/AdminVideosPage";
import AdminRecycleBinPage from "./pages/admin/AdminRecycleBinPage";
import AdminSubscribersPage from "./pages/admin/AdminSubscribersPage";
import AdminServicesPage from "./pages/admin/AdminServicesPage";
import AdminEventsPage from "./pages/admin/AdminEventsPage";
import SubscriberNewsletterBox from "./components/SubscriberNewsletterBox";

import MediaSlideshow from "./components/MediaSlideshow";
import GalleryCardVideo from "./components/GalleryCardVideo";
import StarrySpaceBackground from "./components/StarrySpaceBackground";
import ReleasePage, { TrackRow } from "./components/ReleasePage";
import GalleryPostModal from "./components/GalleryPostModal";
import RandomPreviewPlayer from "./components/RandomPreviewPlayer";
import VideosSection from "./components/VideosSection";
import BeatsPage from "./pages/BeatsPage";
import BeatDetailPage from "./pages/BeatDetailPage";
import StudioPublisherPage from "./pages/StudioPublisherPage";
import ServicesPage from "./pages/ServicesPage";
import ServiceOrderDetailPage from "./pages/ServiceOrderDetailPage";
import GalleryPostPage from "./pages/GalleryPostPage";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import CalendarPage from "./pages/CalendarPage";
import SeoHead from "./components/SeoHead";
import SharePageButton from "./components/SharePageButton";
import { formatGalleryDate } from "./utils/dateFormatter";
import { SITE_ORIGIN, canonicalUrl } from "./data/siteConfig";

import "./App.css";

/* =========================================================
   SCROLL TO HASH ENGINE (CROSS-PAGE ANCHOR SCROLLING)
   ========================================================= */

// Global flag: filter/view-mode clicks set this to suppress scroll-to-top
let _suppressNextScroll = false;
export function suppressScroll() { _suppressNextScroll = true; }

function ScrollToHash() {
  const location = useLocation();
  const prevRef = useRef({ pathname: location.pathname, search: location.search });

  useEffect(() => {
    const prev = prevRef.current;
    const pathnameChanged = prev.pathname !== location.pathname;
    prevRef.current = { pathname: location.pathname, search: location.search };

    // If suppression flag is set, consume it and do nothing
    if (_suppressNextScroll) {
      _suppressNextScroll = false;
      return;
    }

    if (location.hash) {
      const targetId = location.hash.replace("#", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 60);
      return () => clearTimeout(timer);
    }

    // Only scroll to top if the pathname actually changed (real navigation)
    if (pathnameChanged) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.pathname, location.search, location.hash]);

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
  const { events = [] } = useChomkaStore();
  const hasActiveEvents = useMemo(() => {
    return Array.isArray(events) && events.some(e => Boolean(e.is_published) && (e.status === 'UPCOMING' || e.status === 'RECENT' || e.isFuture));
  }, [events]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

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

            <Link to="/#world" className="nav-item-world">
              The World
            </Link>

            <Link to="/#connect">
              Connect
            </Link>

            <Link
              to="/beats"
              className={location.pathname.startsWith("/beats") ? "is-active" : ""}
            >
              Beats
            </Link>

            <Link
              to="/services"
              className={location.pathname.startsWith("/services") ? "is-active" : ""}
            >
              Services
            </Link>

            <Link
              to="/events"
              className={location.pathname.startsWith("/events") ? "is-active" : ""}
            >
              Events
            </Link>

            <Link
              to="/calendar"
              className={location.pathname.startsWith("/calendar") ? "is-active" : ""}
            >
              Calendar
            </Link>
          </nav>

          <span
            className="header-brand-badge"
            aria-label="chomkaMUSIC brand tag"
          >
            chomkaMUSIC™
          </span>

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

            <Link to="/beats" onClick={closeMobileMenu} className={location.pathname.startsWith("/beats") ? "active" : ""}>
              Beats
            </Link>

            <Link to="/services" onClick={closeMobileMenu} className={location.pathname.startsWith("/services") ? "active" : ""}>
              Services
            </Link>

            <Link to="/events" onClick={closeMobileMenu} className={location.pathname.startsWith("/events") ? "active" : ""}>
              Events
            </Link>

            <Link to="/calendar" onClick={closeMobileMenu} className={location.pathname.startsWith("/calendar") ? "active" : ""}>
              Calendar
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

          <a href="#world" className="nav-item-world">
            The World
          </a>

          <a href="#connect">
            Connect
          </a>

          <Link to="/beats">
            Beats
          </Link>

          <Link to="/services">
            Services
          </Link>

          <Link to="/events">
            Events
          </Link>

          <Link to="/calendar">
            Calendar
          </Link>
        </nav>

        <span
          className="header-brand-badge"
          aria-label="chomkaMUSIC brand tag"
        >
          chomkaMUSIC™
        </span>

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

          <Link to="/services" onClick={closeMobileMenu}>
            Services
          </Link>

          <Link to="/events" onClick={closeMobileMenu}>
            Events
          </Link>

          <Link to="/calendar" onClick={closeMobileMenu}>
            Calendar
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
  const { socials } = useChomkaStore();
  const { openCookieSettings } = useCookieConsent();
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
      <SubscriberNewsletterBox />
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
        {socials?.artist?.slice(0, 5).map((s) => (
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

      <nav className="footer-legal-links" aria-label="Legal and privacy links">
        <Link to="/privacy" className="footer-legal-link">
          Privacy Policy
        </Link>
        <Link to="/cookies" className="footer-legal-link">
          Cookie Policy
        </Link>
        <Link to="/terms" className="footer-legal-link">
          Terms of Use
        </Link>
        <button
          type="button"
          className="footer-legal-link"
          onClick={openCookieSettings}
        >
          Cookie Settings
        </button>
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
  viewMode = "grid",
}) {
  const trackCount = getTrackCount(release);
  const releaseHref = useMemo(() => {
    const p = new URLSearchParams();
    if (activeFilter !== "all") p.set("filter", activeFilter);
    if (viewMode === "list") p.set("view", "list");
    const qs = p.toString();
    return `/release/${release.slug}${qs ? "?" + qs : ""}`;
  }, [release.slug, activeFilter, viewMode]);

  return (
    <article className="release-card">
      <Link
        className="release-art"
        to={releaseHref}
        state={{ fromView: viewMode, fromFilter: activeFilter }}
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
          to={releaseHref}
          state={{ fromView: viewMode, fromFilter: activeFilter }}
        >
          View release <RightArrowIcon size={16} />
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

    // 2. Gallery photos and videos (ONLY explicitly approved for hero via is_hero toggle) (Req #6)
    const galleryMedia = (gallery || []).flatMap((g) => {
      const items = [];
      const postIsHero = Boolean(g.is_hero || g.isHero || g.tags?.is_hero || g.tags?.isHero);

      // Check carousel slides
      if (Array.isArray(g.slides) && g.slides.length > 0) {
        g.slides.forEach((slide, sIdx) => {
          // Slide-level hero selection only (NOT the whole post)
          const slideIsHero = Boolean(slide?.isHero || slide?.is_hero);
          if (!slideIsHero) return; // Only explicitly approved media appears in hero
          const slideSrc =
            typeof slide === "string" ? slide : slide?.src || slide?.asset || "";
          if (!slideSrc) return;
          const isVideo =
            slide?.slideType === "video" ||
            slide?.assetType === "VIDEO" ||
            Boolean(slide?.mimeType && String(slide.mimeType).startsWith("video/")) ||
            (typeof slideSrc === "string" &&
              (slideSrc.startsWith("data:video") ||
                /\.(mp4|webm|mov)(\?.*)?$/i.test(slideSrc)));

          items.push({
            id: `gallery-${g.id}-slide-${sIdx}`,
            src: slideSrc,
            title: g.title || "silachomka Archive",
            type: isVideo ? "video" : "image",
            poster: g.asset || g.src || null,
          });
        });
      } else if (postIsHero) {
        // Standalone non-carousel media item approved for hero
        const primary =
          g.src || g.asset || g.videoSrc || g.media_url || g.video_url || null;
        if (primary && typeof primary === "string") {
          const isVideo =
            g.type === "video" ||
            g.post_type === "video" ||
            g.assetType === "VIDEO" ||
            Boolean(g.mimeType && String(g.mimeType).startsWith("video/")) ||
            primary.startsWith("data:video") ||
            /\.(mp4|webm|mov)(\?.*)?$/i.test(primary);

          items.push({
            id: `gallery-${g.id}-primary`,
            src: primary,
            title: g.title || "silachomka Archive",
            type: isVideo ? "video" : "image",
            poster: !isVideo ? primary : null,
          });
        }
      }

      return items;
    });

    const combined = [...releaseMedia, ...galleryMedia];

    // Fallbacks if nothing is found
    if (combined.length === 0) {
      return [
        { id: "fallback-noisemaker", src: "/covers/noisemaker.jpg", title: "NOISEMAKER", type: "image" },
        { id: "fallback-item5", src: "/covers/item5.jpg", title: "ITEM5", type: "image" },
        { id: "fallback-baby", src: "/covers/baby.jpg", title: "BABY", type: "image" },
      ];
    }

    // Pure pseudorandom shuffle across all cover arts and gallery posts
    const shuffled = [...combined];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
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
  const { events = [] } = useChomkaStore();
  const hasActiveEvents = useMemo(() => {
    return Array.isArray(events) && events.some(e => Boolean(e.is_published) && (e.status === 'UPCOMING' || e.status === 'RECENT' || e.isFuture));
  }, [events]);

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

          <Link
            to="/services"
            className="secondary-button"
          >
            Explore services
          </Link>

          <Link
            to="/events"
            className="secondary-button"
          >
            Explore events
          </Link>

          <SharePageButton
            title="silachomka — Official Home"
            label="Share Page"
            className="secondary-button"
            style={{
              minHeight: "48px",
              height: "48px",
              padding: "0 24px",
              borderRadius: "3px",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          />
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
   UPCOMING RELEASES & GATHERINGS COUNTDOWN SHOWCASE
   ========================================================= */

function UpcomingCountdownCard({ item }) {
  const isEvent = item.itemType === 'event';
  const targetTime = useMemo(() => {
    return new Date(item.targetDate).getTime();
  }, [item.targetDate]);

  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, targetTime - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, targetTime - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  const upcomingPreviewPool = useMemo(() => {
    if (isEvent) return [];
    const list = [];
    if (Array.isArray(item.preview_audio_urls)) {
      for (const u of item.preview_audio_urls) {
        if (typeof u === 'string' && u.trim() && !list.includes(u.trim())) list.push(u.trim());
      }
    }
    if (Array.isArray(item.tracks)) {
      for (const t of item.tracks) {
        if (t?.preview_audio_url && typeof t.preview_audio_url === 'string' && t.preview_audio_url.trim() && !list.includes(t.preview_audio_url.trim())) {
          list.push(t.preview_audio_url.trim());
        }
      }
    }
    return list;
  }, [isEvent, item]);

  return (
    <div className="upcoming-release-card">
      <Link
        to={item.url}
        className="upcoming-art-frame"
        aria-label={`Open ${item.title}`}
      >
        {item.cover && (
          <img
            src={item.cover}
            alt={`${item.title} upcoming cover art`}
            className="upcoming-cover-image"
            loading="eager"
            decoding="async"
            onError={(e) => {
              if (!e.target.dataset.tried) {
                e.target.dataset.tried = "true";
                e.target.src = "/og-image.png";
              }
            }}
          />
        )}
        <span className="upcoming-cover-overlay" aria-hidden="true" />
        <span className="upcoming-art-badge">
          {isEvent ? "UPCOMING EVENT" : "COMING SOON"}
        </span>
      </Link>

      <div className="upcoming-details">
        <div className="upcoming-countdown-container">
          <span className="upcoming-countdown-label">
            {isEvent ? "COUNTDOWN TO LIVE GATHERING" : "COUNTDOWN TO OFFICIAL RELEASE"}
          </span>
          <div className="countdown-timer-grid">
            <div className="countdown-timer-box">
              <span className="countdown-timer-num">{String(days).padStart(2, "0")}</span>
              <span className="countdown-timer-unit">Days</span>
            </div>
            <div className="countdown-timer-colon">:</div>
            <div className="countdown-timer-box">
              <span className="countdown-timer-num">{String(hours).padStart(2, "0")}</span>
              <span className="countdown-timer-unit">Hours</span>
            </div>
            <div className="countdown-timer-colon">:</div>
            <div className="countdown-timer-box">
              <span className="countdown-timer-num">{String(minutes).padStart(2, "0")}</span>
              <span className="countdown-timer-unit">Minutes</span>
            </div>
            <div className="countdown-timer-colon">:</div>
            <div className="countdown-timer-box">
              <span className="countdown-timer-num">{String(seconds).padStart(2, "0")}</span>
              <span className="countdown-timer-unit">Seconds</span>
            </div>
          </div>
        </div>

        {upcomingPreviewPool.length > 0 && (
          <div className="upcoming-preview-wrap">
            <RandomPreviewPlayer
              audioUrl={upcomingPreviewPool[0]}
              audioUrls={upcomingPreviewPool}
              projectTitle={item.title}
              title={`${item.title} — PREVIEW`}
            />
          </div>
        )}

        {isEvent && item.venue && (
          <p style={{ fontSize: "14px", color: "var(--muted)", margin: "10px 0" }}>
            📍 {item.venue} {item.city ? `• ${item.city}` : ""}
          </p>
        )}

        <div className="upcoming-actions">
          <Link className="primary-button" to={item.url}>
            {isEvent ? "View Event Details & Passes" : "View Pre-Release Details"}
          </Link>
          {isEvent && item.ticket_url && (
            <a
              href={item.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button"
            >
              Get Tickets ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function UpcomingCountdownShowcase({ releases = [], events = [] }) {
  const upcomingItems = useMemo(() => {
    const items = [];
    const now = Date.now();

    // Future releases
    (releases || []).forEach((r) => {
      const d = new Date(r.release_date || r.date);
      if (!isNaN(d.getTime()) && d.getTime() > now) {
        items.push({
          id: `rel-${r.id || r.slug}`,
          title: r.title,
          subtitle: r.artist !== "silachomka" ? r.artist : null,
          targetDate: r.release_date || r.date,
          displayDate: r.displayDate || (r.release_date || r.date),
          cover: r.cover,
          url: `/release/${r.slug}`,
          itemType: "release",
          preview_audio_urls: r.preview_audio_urls,
          tracks: r.tracks,
        });
      }
    });

    // Future events
    (events || []).forEach((e) => {
      if (e.is_published && (e.status === "UPCOMING" || e.isFuture)) {
        const timePart = e.start_time ? `T${e.start_time}:00` : "T00:00:00";
        const d = new Date(`${e.event_date}${timePart}`);
        const dateVal = isNaN(d.getTime()) ? new Date(e.event_date).getTime() : d.getTime();
        if (dateVal >= now || e.status === "UPCOMING") {
          items.push({
            id: `evt-${e.id}`,
            title: e.title,
            subtitle: e.subtitle,
            venue: e.venue_name,
            city: e.city,
            ticket_url: e.ticket_url,
            targetDate: `${e.event_date}${timePart}`,
            displayDate: e.event_date,
            cover: e.primary_artwork_url || e.cover,
            url: `/events/${e.slug}`,
            itemType: "event",
          });
        }
      }
    });

    return items.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }, [releases, events]);

  if (upcomingItems.length === 0) return null;

  return (
    <section className="upcoming-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow upcoming-eyebrow">
            UPCOMING SHOWCASE & COUNTDOWNS
          </p>
          <h2>
            {upcomingItems.length === 1 ? upcomingItems[0].title : `Upcoming Releases & Gatherings (${upcomingItems.length})`}
          </h2>
          {upcomingItems.length === 1 && upcomingItems[0].subtitle && (
            <p className="release-artist">{upcomingItems[0].subtitle}</p>
          )}
        </div>

        {upcomingItems.length === 1 && (
          <span className="upcoming-launch-date">
            Target: {upcomingItems[0].displayDate}
          </span>
        )}
      </div>

      <div className="home-countdown-carousel">
        {upcomingItems.map((item) => (
          <UpcomingCountdownCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

const UpcomingReleaseSection = ({ release }) => {
  if (!release) return null;
  return <UpcomingCountdownShowcase releases={[release]} events={[]} />;
};

/* =========================================================
   HOMEPAGE EVENTS SECTION (DYNAMICALLY VISIBLE)
   ========================================================= */

function HomepageEventsSection() {
  const { events = [] } = useChomkaStore();

  const activeEvents = useMemo(() => {
    return (events || []).filter(
      (e) => Boolean(e.is_published) && (e.status === "UPCOMING" || e.status === "RECENT" || e.isFuture)
    );
  }, [events]);

  // If there are no active/recent events, this section completely disappears!
  if (activeEvents.length === 0) return null;

  const publishedEventsCount = Array.isArray(events)
    ? events.filter((e) => Boolean(e.is_published)).length
    : 0;

  return (
    <section id="events" className="home-events-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SANCTUARY & TOUR ARCHIVE</p>
          <h2>Live Gatherings & Tour Dates</h2>
        </div>
        <Link to="/events" className="section-link">
          Explore All Events ({publishedEventsCount}) →
        </Link>
      </div>

      <div className="events-cards-grid">
        {activeEvents.slice(0, 3).map((evt) => (
          <article key={evt.id} className="event-card is-upcoming">
            <Link to={`/events/${evt.slug}`} className="event-card-art-frame">
              <img
                src={evt.primary_artwork_url || evt.cover || "/og-image.png"}
                alt={evt.title}
                className="event-card-art"
                loading="lazy"
                onError={(e) => { e.target.src = "/og-image.png"; }}
              />
              <div className="event-card-badge">
                {evt.ticket_status || "UPCOMING"}
              </div>
            </Link>

            <div className="event-card-body">
              <div className="event-card-date">
                <span>{evt.event_date}</span>
                {evt.start_time && <span>• {evt.start_time}</span>}
              </div>

              <h3 className="event-card-title">
                <Link to={`/events/${evt.slug}`}>{evt.title}</Link>
              </h3>

              <div className="event-card-venue">
                <span>📍 {evt.venue_name || "Sanctuary"}</span>
                {evt.city && <span>, {evt.city}</span>}
              </div>

              <div className="event-card-actions">
                <Link to={`/events/${evt.slug}`} className="event-card-link">
                  View Gathering →
                </Link>
                {evt.ticket_url && (
                  <a
                    href={evt.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="event-card-ticket-btn"
                  >
                    Passes ↗
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
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
  
  // View mode preservation (Stage 35 — Req #1): URL param -> SessionStorage -> Default ("grid")
  const [viewMode, setViewModeState] = useState(() => {
    const urlView = searchParams.get("view");
    if (urlView === "list" || urlView === "grid") return urlView;
    try {
      const stored = sessionStorage.getItem("silachomka_music_view");
      if (stored === "list" || stored === "grid") return stored;
    } catch {}
    return "grid";
  });

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [expandedTrackKey, setExpandedTrackKey] = useState(null);

  // Synchronize view mode if URL searchParams change via history/navigation
  useEffect(() => {
    const urlView = searchParams.get("view");
    if (urlView === "list" || urlView === "grid") {
      setViewModeState(urlView);
      try {
        sessionStorage.setItem("silachomka_music_view", urlView);
      } catch {}
    } else {
      // If URL does not have view param, check if sessionStorage remembers "list"
      try {
        const stored = sessionStorage.getItem("silachomka_music_view");
        if (stored === "list") {
          setViewModeState("list");
          const p = new URLSearchParams(searchParams);
          p.set("view", "list");
          setSearchParams(p, { replace: true, preventScrollReset: true });
        }
      } catch {}
    }
  }, [searchParams, setSearchParams]);

  // Type filters that can be conjoined with SILACHOMKA
  const TYPE_FILTERS = ["singles", "eps", "albums"];
  // Exclusive filters that clear everything
  const EXCLUSIVE_FILTERS = ["all", "ft_silachomka", "prod_by_silachomka"];

  const issilachomkaActive = activeFilter === "silachomka";
  const isConjoined = issilachomkaActive && TYPE_FILTERS.includes(subFilter);

  const updateParams = (filter, sub) => {
    const scrollY = window.scrollY;
    suppressScroll();
    const p = new URLSearchParams(searchParams);
    if (!filter || filter === "all") { p.delete("filter"); p.delete("sub"); }
    else { p.set("filter", filter); if (sub) p.set("sub", sub); else p.delete("sub"); }
    if (viewMode === "list") p.set("view", "list");
    setSearchParams(p, { replace: true, preventScrollReset: true });
    // Aggressively restore scroll across multiple frames to beat any async scroll resets
    requestAnimationFrame(() => { window.scrollTo(0, scrollY); requestAnimationFrame(() => window.scrollTo(0, scrollY)); });
    setTimeout(() => window.scrollTo(0, scrollY), 0);
    setTimeout(() => window.scrollTo(0, scrollY), 50);
  };

  const handleFilterClick = (filterId) => {
    if (EXCLUSIVE_FILTERS.includes(filterId)) {
      // Exclusive: clear everything
      updateParams(filterId === "all" ? null : filterId, null);
    } else if (filterId === "silachomka") {
      if (issilachomkaActive) {
        // Clicking silachomka when already active: deselect it
        if (subFilter) updateParams(subFilter, null); // keep the sub as main
        else updateParams(null, null); // go to all
      } else {
        updateParams("silachomka", null);
      }
    } else if (TYPE_FILTERS.includes(filterId)) {
      if (issilachomkaActive) {
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

  const handleDeselectsilachomka = (e) => {
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
    const scrollY = window.scrollY;
    suppressScroll();
    setViewModeState(mode);
    try {
      sessionStorage.setItem("silachomka_music_view", mode);
    } catch {}
    const p = new URLSearchParams(searchParams);
    if (mode === "grid") p.delete("view"); else p.set("view", mode);
    setSearchParams(p, { replace: true, preventScrollReset: true });
    requestAnimationFrame(() => { window.scrollTo(0, scrollY); requestAnimationFrame(() => window.scrollTo(0, scrollY)); });
    setTimeout(() => window.scrollTo(0, scrollY), 0);
    setTimeout(() => window.scrollTo(0, scrollY), 50);
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
    else if (f === "ft_silachomka") results = results.filter(r => r.featssilachomka === true);
    else if (f === "prod_by_silachomka") results = results.filter(r => r.producedBysilachomka !== false);

    return results;
  }, [sortedReleases, activeFilter, subFilter]);

  const toggleFilterMenu = () => setFilterMenuOpen(!filterMenuOpen);

  // Build the filter button label and state for each filter
  const getFilterLabel = (filterId) => {
    const labels = { all: "ALL", silachomka: "SILACHOMKA", singles: "SINGLES", eps: "EPS", albums: "ALBUMS", ft_silachomka: "FT. SILACHOMKA", prod_by_silachomka: "PROD. BY SILACHOMKA" };
    const baseLabel = labels[filterId] || filterId;

    if (TYPE_FILTERS.includes(filterId)) {
      if (issilachomkaActive && !isConjoined) return `+ ${baseLabel}`;
      if (isConjoined && subFilter === filterId) return baseLabel;
    }
    return baseLabel;
  };

  const isFilterActive = (filterId) => {
    if (filterId === activeFilter) return true;
    if (isConjoined && filterId === subFilter) return true;
    return false;
  };

  const handleClearFilter = (e, filterId) => {
    e.stopPropagation();
    if (isConjoined) {
      if (filterId === "silachomka") handleDeselectsilachomka(e);
      else if (filterId === subFilter) handleDeselectSub(e);
    } else {
      updateParams(null, null); // Clear it
    }
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
            <span className="filter-icon"><DownCaretIcon /></span>
          </button>

          {filterMenuOpen && (
            <div className="filter-dropdown">
              {visibleFilters.map((filterId) => {
                const active = isFilterActive(filterId);
                const showX = isConjoined && (filterId === "silachomka" || filterId === subFilter);

                return (
                  <button
                    key={filterId}
                    className={`filter-dropdown-item ${active ? "is-active" : ""}`}
                    onClick={(e) => {
                      if (e.target.tagName === "SPAN" && e.target.className === "filter-clear-icon") {
                        handleClearFilter(e, filterId);
                      } else {
                        handleFilterClick(filterId);
                      }
                      setFilterMenuOpen(false);
                    }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>{getFilterLabel(filterId)}</span>
                    {showX && (
                      <span
                        className="filter-clear-icon"
                        style={{ fontSize: "14px", lineHeight: 1, opacity: 0.8, padding: "0 4px" }}
                        aria-label={`Remove ${filterId} filter`}
                      >×</span>
                    )}
                  </button>
                );
              })}
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
                    onClick={(e) => handleClearFilter(e, filterId)}
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
                  viewMode={viewMode}
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
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--gold)", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span>Release {String(dynamicNumber).padStart(2, "0")}</span>
                          <span>•</span>
                          <span>{release.artist && release.artist !== "silachomka" ? release.artist : "silachomka"}</span>
                          {(release.displayDate || release.date || release.release_date) && (
                            <>
                              <span>•</span>
                              <span className="music-list-date" style={{ color: "var(--muted)" }}>
                                {formatGalleryDate(release.date || release.release_date) || release.displayDate}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={{
                        pathname: `/release/${release.slug}`,
                        search: `?${new URLSearchParams({
                          ...(activeFilter !== "all" ? { filter: activeFilter } : {}),
                          view: "list",
                        }).toString()}`,
                      }}
                      state={{ fromView: "list", fromFilter: activeFilter }}
                      className="text-button"
                      style={{ fontSize: "10px" }}
                    >
                      View release <RightArrowIcon size={16} />
                    </Link>
                  </div>
                  <div>
                    {tracksToShow.map((track, trackIndex) => {
                      const key = `${release.slug}-${trackIndex}`;
                      const isUnreleased =
                        new Date(release.release_date || release.date || 0).getTime() > Date.now();
                      return (
                        <TrackRow
                          key={key}
                          track={track}
                          index={trackIndex}
                          isUnreleased={isUnreleased}
                          isExpanded={expandedTrackKey === key}
                          onToggle={() => setExpandedTrackKey(expandedTrackKey === key ? null : key)}
                        />
                      );
                    })}
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
   GALLERY CARD MEDIA (CINEMATIC CROSSFADE FOR CAROUSELS - REQ #8)
   ========================================================= */

function GalleryCardMedia({ post, primarySrc, isVideo, isCarousel }) {
  const slides = useMemo(() => {
    if (!Array.isArray(post.slides) || post.slides.length <= 1) return [];
    return post.slides
      .map((s, idx) => {
        const url = typeof s === "string" ? s : s?.src || s?.asset || "";
        if (!url) return null;
        const isVid =
          Boolean(s?.isVideo || s?.slideType === "video" || s?.assetType === "VIDEO") ||
          Boolean(s?.mimeType && String(s?.mimeType).startsWith("video/")) ||
          (typeof url === "string" &&
            (url.startsWith("data:video") || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)));
        return {
          id: s?.id || `slide-${idx}`,
          src: url,
          isVideo: isVid,
          poster: s?.poster || post?.asset || post?.src || null,
        };
      })
      .filter(Boolean);
  }, [post.slides, post.asset, post.src]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmedIndex, setConfirmedIndex] = useState(0);

  const cardRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [readyMap, setReadyMap] = useState({});

  // Pre-load images & videos in background so we never transition to unloaded media
  useEffect(() => {
    slides.forEach((slide) => {
      if (!slide.src) return;
      if (!slide.isVideo) {
        const img = new Image();
        img.src = slide.src;
        img.onload = () => {
          setReadyMap((prev) => ({ ...prev, [slide.src]: true }));
        };
      } else {
        const v = document.createElement("video");
        v.src = slide.src;
        v.preload = "auto";
        v.muted = true;
        v.playsInline = true;
        const markReady = () => {
          setReadyMap((prev) => ({ ...prev, [slide.src]: true }));
        };
        v.addEventListener("canplay", markReady, { once: true });
        v.addEventListener("loadeddata", markReady, { once: true });
        v.load();
      }
    });
  }, [slides]);

  // Independent non-synchronized schedule per card (Req #2):
  // 6500ms + random offset between 0 and 3000ms
  const rotationDuration = useRef(
    6500 + Math.floor(Math.random() * 3000)
  ).current;

  // Staggered initial delay (500-3000ms) prevents synchronized slide changes
  const initialDelay = useRef(
    500 + Math.floor(Math.random() * 2500)
  ).current;

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isCarousel || slides.length <= 1 || isPaused || !isInView) return;

    let intervalId;
    const advanceSlide = () => {
      setCurrentIndex((prev) => {
        // Collect all slides that are confirmed downloaded/ready
        const readyIndices = [];
        slides.forEach((s, idx) => {
          if (readyMap[s.src] || (!s.isVideo && idx === 0)) {
            readyIndices.push(idx);
          }
        });

        // If no ready slides or only 1, stay on current
        if (readyIndices.length <= 1) {
          return readyIndices[0] ?? prev;
        }

        // Pick a random NEXT ready slide (excluding current to ensure fresh crossfade)
        const otherReady = readyIndices.filter((idx) => idx !== prev);
        if (otherReady.length > 0) {
          const randomIndex = Math.floor(Math.random() * otherReady.length);
          return otherReady[randomIndex];
        }

        return (prev + 1) % slides.length;
      });
    };

    const timeoutId = setTimeout(() => {
      advanceSlide();
      intervalId = setInterval(advanceSlide, rotationDuration);
    }, initialDelay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCarousel, slides, isPaused, isInView, rotationDuration, initialDelay, readyMap]);

  // Smoothly promote currentIndex to confirmedIndex after crossfade completes
  useEffect(() => {
    if (currentIndex !== confirmedIndex) {
      const timer = setTimeout(() => {
        setConfirmedIndex(currentIndex);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, confirmedIndex]);

  if (isCarousel && slides.length > 1) {
    return (
      <div
        ref={cardRef}
        className="gallery-card-image"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        tabIndex={0}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: "#08080c",
        }}
      >
        {slides.map((slide, idx) => {
          const isCurrent = idx === currentIndex;
          const isConfirmed = idx === confirmedIndex;
          const isVisible = isCurrent || isConfirmed;

          return slide.isVideo ? (
            <div
              key={slide.id || slide.src}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: isCurrent ? 1 : 0,
                transition: "opacity 1.8s ease-in-out",
                zIndex: isCurrent ? 2 : isConfirmed ? 1 : 0,
                pointerEvents: "none",
                visibility: isVisible ? "visible" : "hidden",
              }}
            >
              <GalleryCardVideo
                src={slide.src}
                poster={slide.poster}
                title={post.title || "Archive video"}
                className="gallery-card-image"
                isActive={isCurrent && isInView}
                onReady={() => setReadyMap((prev) => ({ ...prev, [slide.src]: true }))}
              />
            </div>
          ) : (
            <img
              key={slide.id || slide.src}
              src={slide.src}
              alt={`${post.title || "Archive item"} slide ${idx + 1}`}
              className="gallery-card-image"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: isCurrent ? 1 : 0,
                transition: "opacity 1.8s ease-in-out",
                zIndex: isCurrent ? 2 : isConfirmed ? 1 : 0,
                visibility: isVisible ? "visible" : "hidden",
              }}
              loading="lazy"
            />
          );
        })}
      </div>
    );
  }

  const effectiveIsVideo =
    Boolean(
      isVideo ||
      post?.isVideo ||
      post?.type === "video" ||
      post?.post_type === "video" ||
      post?.assetType === "VIDEO" ||
      Boolean(post?.videoSrc) ||
      Boolean(post?.mimeType && String(post.mimeType).toLowerCase().startsWith("video/")) ||
      (typeof primarySrc === "string" &&
        (primarySrc.startsWith("data:video") || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(primarySrc)))
    );

  if (primarySrc) {
    return effectiveIsVideo ? (
      <GalleryCardVideo
        src={primarySrc}
        poster={post.asset || post.src || null}
        title={post.title || "Archive video"}
        className="gallery-card-image"
      />
    ) : (
      <img
        src={primarySrc}
        alt={post.title || "Archive item"}
        className="gallery-card-image"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className="gallery-card-image"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #121218 0%, #09090d 100%)",
        color: "var(--gold)",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {post.externalSocialPlatform || post.external_social_platform || "Social Archive"}
      </span>
      <span
        style={{
          fontSize: "13px",
          color: "var(--text)",
          marginTop: "6px",
          fontWeight: 600,
        }}
      >
        {post.title || "View Post"}
      </span>
    </div>
  );
}

/* =========================================================
   GALLERY SECTION (INSTAGRAM-STYLE VISUAL ARCHIVE)
   ========================================================= */

function GallerySection() {
  const { gallery } = useChomkaStore();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activePost, setActivePost] = useState(null);
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch('/api/gallery/categories')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setDbCategories(data.map((c) => ({ id: c.slug, label: c.label })));
        }
      })
      .catch(() => {});
  }, []);

  const normalizeCat = (c) => {
    if (!c) return "";
    const s = String(c).trim().toLowerCase();
    if (s === "portraits" || s === "portraits-style" || s.includes("portrait")) return "portraits-style";
    if (s === "freestyles" || s === "freestyles-covers" || s.includes("freestyle") || s.includes("cover")) return "freestyles-covers";
    if (s === "bts" || s === "studio" || s === "studio-bts" || s.includes("bts")) return "bts";
    if (s === "releases" || s.includes("release")) return "releases";
    if (s === "videos" || s.includes("video")) return "videos";
    return s.replace(/[^a-z0-9]+/g, "-");
  };

  const categories = useMemo(() => {
    const labelMap = new Map();
    const base = [
      { id: "all", label: "All Posts" },
      { id: "releases", label: "Releases" },
      { id: "freestyles-covers", label: "Freestyles & Covers" },
      { id: "portraits-style", label: "Portraits & Style" },
      { id: "videos", label: "Videos" },
      { id: "bts", label: "Studio & BTS" },
    ];
    for (const b of base) {
      labelMap.set(b.label.toLowerCase(), b);
    }
    for (const c of dbCategories) {
      if (!c || !c.label) continue;
      const key = c.label.trim().toLowerCase();
      if (!labelMap.has(key)) {
        labelMap.set(key, { id: c.id || c.slug, label: c.label.trim() });
      }
    }
    if (Array.isArray(gallery)) {
      for (const item of gallery) {
        if (!item.category) continue;
        const norm = normalizeCat(item.category);
        const label =
          norm === "portraits-style"
            ? "Portraits & Style"
            : norm === "freestyles-covers"
            ? "Freestyles & Covers"
            : norm === "bts"
            ? "Studio & BTS"
            : norm === "releases"
            ? "Releases"
            : norm === "videos"
            ? "Videos"
            : item.category.trim().charAt(0).toUpperCase() + item.category.trim().slice(1);
        const key = label.toLowerCase();
        if (!labelMap.has(key)) {
          labelMap.set(key, { id: norm, label });
        }
      }
    }
    return Array.from(labelMap.values());
  }, [dbCategories, gallery]);

  const filteredPosts = useMemo(() => {
    const list = Array.isArray(gallery) ? gallery : [];
    if (activeCategory === "all") return list;
    const targetNorm = normalizeCat(activeCategory);
    if (targetNorm === "videos") {
      const videoItems = [];
      list.forEach((item) => {
        const itemCat = normalizeCat(item.category);
        const itemIsVideoPost =
          itemCat === "videos" ||
          item.type === "video" ||
          item.post_type === "video" ||
          item.assetType === "VIDEO" ||
          item.isVideo ||
          Boolean(item.videoSrc) ||
          Boolean(item.mimeType && String(item.mimeType).toLowerCase().startsWith("video/")) ||
          (typeof item.src === "string" && (item.src.startsWith("data:video") || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(item.src)));

        const slides = Array.isArray(item.slides) ? item.slides : [];
        const hasVideoSlide = Array.isArray(item.slides) && item.slides.some((s) => {
          const sUrl = typeof s === "string" ? s : s?.src || s?.asset || "";
          return (
            Boolean(s?.isVideo || s?.slideType === "video" || s?.assetType === "VIDEO") ||
            Boolean(s?.mimeType && String(s?.mimeType).toLowerCase().startsWith("video/")) ||
            (typeof sUrl === "string" && (sUrl.startsWith("data:video") || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(sUrl)))
          );
        });
        const videoSlideIndices = [];

        slides.forEach((s, idx) => {
          const sUrl = typeof s === "string" ? s : s?.src || s?.asset || "";
          const isVid =
            Boolean(s?.isVideo || s?.slideType === "video" || s?.assetType === "VIDEO") ||
            Boolean(s?.mimeType && String(s?.mimeType).toLowerCase().startsWith("video/")) ||
            (typeof sUrl === "string" && (sUrl.startsWith("data:video") || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(sUrl)));
          if (isVid) {
            videoSlideIndices.push(idx);
          }
        });

        if (slides.length > 1 && videoSlideIndices.length > 0) {
          // Extract each video slide as an isolated video card item so it only plays the video (no cycling through photos)
          videoSlideIndices.forEach((sIdx) => {
            const slideObj = slides[sIdx];
            const slideSrc = typeof slideObj === "string" ? slideObj : slideObj?.src || slideObj?.asset || "";
            videoItems.push({
              ...item,
              id: `${item.id}-video-${sIdx}`,
              title: item.title ? `${item.title} (Video ${sIdx + 1})` : "Archive Video",
              isIsolatedVideo: true,
              parentPost: item,
              targetSlideIndex: sIdx,
              totalSlides: slides.length,
              src: slideSrc,
              asset: slideSrc,
              videoSrc: slideSrc,
              type: "video",
              post_type: "video",
              isVideo: true,
              slides: [
                typeof slideObj === "object"
                  ? { ...slideObj, isVideo: true, slideType: "video" }
                  : { src: slideSrc, isVideo: true, slideType: "video" }
              ],
            });
          });
        } else if (itemIsVideoPost) {
          videoItems.push(item);
        }
      });
      return videoItems;
    }
    return list.filter((item) => normalizeCat(item.category) === targetNorm);
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
          const isCarouselPost =
            (post.type === "carousel" || post.slides?.length > 1) && post.slides?.length > 1;

          // Stage 31 Part 13: Randomize carousel card preview thumbnail on public grid
          let carouselPreview = null;
          let pickedSlide = null;
          if (isCarouselPost && Array.isArray(post.slides) && post.slides.length > 0) {
            const randIdx = Math.floor(Math.random() * post.slides.length);
            pickedSlide = post.slides[randIdx];
            carouselPreview = typeof pickedSlide === "string" ? pickedSlide : (pickedSlide?.src || pickedSlide?.asset || null);
          }

          const firstSlideObj = Array.isArray(post.slides) && post.slides.length > 0 ? post.slides[0] : null;
          const firstSlide = firstSlideObj
            ? (typeof firstSlideObj === "string" ? firstSlideObj : firstSlideObj?.src || firstSlideObj?.asset)
            : null;
          const primarySrc = carouselPreview || post.src || post.asset || firstSlide || post.videoSrc;
          const activeSlideRef = pickedSlide || firstSlideObj;
          const isVideo =
            Boolean(post.isVideo) ||
            post.type === "video" ||
            post.assetType === "VIDEO" ||
            Boolean(post.videoSrc) ||
            Boolean(post.mimeType && String(post.mimeType).toLowerCase().startsWith("video/")) ||
            Boolean(activeSlideRef?.isVideo || activeSlideRef?.slideType === "video" || activeSlideRef?.assetType === "VIDEO" || (activeSlideRef?.mimeType && String(activeSlideRef.mimeType).toLowerCase().startsWith("video/"))) ||
            (typeof primarySrc === "string" &&
              (primarySrc.startsWith("data:video") ||
                /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(primarySrc)));
          const isCarousel =
            (post.type === "carousel" || post.slides?.length > 1) && post.slides?.length > 1;
          const hasSocialEmbed = Boolean(post.externalSocialUrl || post.external_social_url);

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
                <GalleryCardMedia
                  post={post}
                  primarySrc={primarySrc}
                  isVideo={isVideo}
                  isCarousel={isCarousel}
                />

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

                {hasSocialEmbed && !isCarousel && !isVideo && (
                  <span className="gallery-card-badge" title="Social Post" style={{ fontSize: "10px", padding: "2px 6px" }}>
                    {post.externalSocialPlatform || post.external_social_platform || "SOCIAL"}
                  </span>
                )}

                {/* Hover Caption Overlay */}
                <div className="gallery-card-overlay">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                    <span className="gallery-overlay-cat">{post.category}</span>
                    {post.location && (
                      <span style={{ fontSize: "10px", color: "var(--gold)", opacity: 0.9 }}>
                        📍 {post.location}
                      </span>
                    )}
                  </div>
                  <p className="gallery-overlay-title">{post.title || post.caption || "Archive Visual"}</p>
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
          onSelectPost={(p) => setActivePost(p)}
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
  const { socials } = useChomkaStore();
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
            {socials?.artist?.map((soc) => (
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
                <span className="social-arrow"><UpRightArrowIcon size={14} /></span>
              </a>
            ))}
          </div>
        </div>

        {/* Ecosystem Channels */}
        <div className="social-group" style={{ marginTop: "40px" }}>
          <h3 className="social-group-title">Ecosystem Brands</h3>
          <div className="social-grid">
            {socials?.ecosystem?.map((eco) => (
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
                <span className="social-arrow"><UpRightArrowIcon size={14} /></span>
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
  const { releases, events = [] } = useChomkaStore();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedReleases = useMemo(
    () =>
      sortReleasesByDate(
        Array.isArray(releases)
          ? releases
          : []
      ),
    [releases]
  );

  // Future / upcoming releases (release_date > now)
  // If multiple, show earliest chronologically
  const upcomingReleases = useMemo(() => {
    return sortedReleases
      .filter((r) => {
        const d = new Date(r.release_date || r.date);
        return !isNaN(d.getTime()) && d > now;
      })
      .sort((a, b) => new Date(a.release_date || a.date).getTime() - new Date(b.release_date || b.date).getTime());
  }, [sortedReleases, now]);

  const upcomingRelease = upcomingReleases[0] ?? null;

  // Published releases (release_date <= now)
  const publishedReleases = useMemo(() => {
    return sortedReleases.filter((r) => {
      const d = new Date(r.release_date || r.date);
      return isNaN(d.getTime()) || d <= now;
    });
  }, [sortedReleases, now]);

  const latestRelease = publishedReleases[0] ?? null;

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

  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": canonicalUrl("/#person"),
        name: "silachomka",
        alternateName: [
          "Samuel John-Ibro",
          "Samuel Silachomka John-Ibro",
          "Silachomka",
          "Sila"
        ],
        url: canonicalUrl("/"),
        image: canonicalUrl("/og-image.png"),
        sameAs: [
          "https://www.instagram.com/silachomka/?__pwa=1",
          "https://x.com/silachomka",
          "https://www.threads.net/@silachomka",
          "https://www.tiktok.com/@silachomka",
          "https://www.youtube.com/@silachomka",
        ],
        jobTitle: "Recording Artist, Music Producer & Audio Engineer",
        nationality: "Nigerian",
        memberOf: {
          "@type": "Organization",
          "name": "chomkaMUSIC™",
          "parentOrganization": {
            "@type": "Organization",
            "name": "Chomka Nation"
          }
        }
      },
      {
        "@type": "MusicGroup",
        "@id": canonicalUrl("/#musicgroup"),
        name: "chomkaMUSIC™",
        url: canonicalUrl("/"),
        logo: canonicalUrl("/silachomka.com-logo.png"),
        parentOrganization: {
          "@type": "Organization",
          "name": "Chomka Nation"
        }
      },
      {
        "@type": "WebSite",
        "@id": canonicalUrl("/#website"),
        url: canonicalUrl("/"),
        name: "silachomka",
        description:
          "Official artist website of silachomka (Samuel Silachomka John-Ibro) under chomkaMUSIC™ and Chomka Nation. Music releases, original studio beats, visual archive, and chomkaMUSIC™ Studio audio engineering services.",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: canonicalUrl("/"),
          },
        ],
      },
    ],
  };

  return (
    <>
      <SeoHead
        title="silachomka — Official Home"
        description="Official artist website of silachomka. Music, visuals, beat store, and everything in between — part of chomkaMUSIC™ and Chomka Nation."
        path="/"
        image="/og-image.png"
        imageAlt="silachomka official logo"
        jsonLd={homeJsonLd}
      />
      <SiteHeader />

      <main id="top">
        <HomeHero />

        <UpcomingCountdownShowcase
          releases={sortedReleases}
          events={events}
        />

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

        <HomepageEventsSection />

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
   SERVICES ROUTE (/services)
   ========================================================= */

function ServicesRoute() {
  return (
    <>
      <SiteHeader beatsPage />

      <ServicesPage />

      <SiteFooter />
    </>
  );
}

/* =========================================================
   SERVICE ORDER DETAIL ROUTE (/services/order/:orderNumber)
   ========================================================= */

function ServiceOrderDetailRoute() {
  return (
    <>
      <SiteHeader beatsPage />

      <ServiceOrderDetailPage />

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
   DEDICATED CORE CONTENT ROUTES (/music, /gallery, /about)
   ========================================================= */

function MusicRoute() {
  const { releases, totalTracks } = useChomkaStore();
  return (
    <>
      <SiteHeader beatsPage />
      <main style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "100px" }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 clamp(16px, 4vw, 32px)" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: "20px" }}>
            <ol style={{ display: "flex", gap: "8px", listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "var(--muted)" }}>
              <li><Link to="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link></li>
              <li>/</li>
              <li aria-current="page" style={{ color: "var(--text-h)" }}>Music & Discography</li>
            </ol>
          </nav>
          <MusicSection releases={releases} totalTracks={totalTracks} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function GalleryRoute() {
  return (
    <>
      <SiteHeader beatsPage />
      <main style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "100px" }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 clamp(16px, 4vw, 32px)" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: "20px" }}>
            <ol style={{ display: "flex", gap: "8px", listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "var(--muted)" }}>
              <li><Link to="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link></li>
              <li>/</li>
              <li aria-current="page" style={{ color: "var(--text-h)" }}>Visual Archive & Gallery</li>
            </ol>
          </nav>
          <GallerySection />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function AboutRoute() {
  return (
    <>
      <SiteHeader beatsPage />
      <main style={{ minHeight: "100vh", paddingTop: "80px", paddingBottom: "100px" }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 clamp(16px, 4vw, 32px)" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: "20px" }}>
            <ol style={{ display: "flex", gap: "8px", listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "var(--muted)" }}>
              <li><Link to="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link></li>
              <li>/</li>
              <li aria-current="page" style={{ color: "var(--text-h)" }}>About & Ecosystem</li>
            </ol>
          </nav>
          <AboutSection />
          <WorldSection />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function EventsRoute() {
  return (
    <>
      <SiteHeader beatsPage />
      <EventsPage />
      <SiteFooter />
    </>
  );
}

function EventDetailRoute() {
  return (
    <>
      <SiteHeader beatsPage />
      <EventDetailPage />
      <SiteFooter />
    </>
  );
}

function CalendarRoute() {
  return (
    <>
      <SiteHeader beatsPage />
      <CalendarPage />
      <SiteFooter />
    </>
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
   APP MAIN ROOT & ERROR BOUNDARY
   ========================================================= */

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[silachomka RootErrorBoundary] Caught unexpected UI exception:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#050505",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "var(--font-sans, system-ui, sans-serif)",
          textAlign: "center"
        }}>
          <div style={{
            maxWidth: "480px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "36px 28px",
            backdropFilter: "blur(20px)"
          }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-gold, #c5a059)", marginBottom: "6px", fontWeight: 700 }}>
              silachomka
            </div>
            <div style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255, 255, 255, 0.5)", marginBottom: "16px", fontWeight: 600 }}>
              chomkaMUSIC™ · Chomka Nation
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 12px 0", letterSpacing: "-0.01em" }}>
              Display Refresh Required
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.6, margin: "0 0 24px 0" }}>
              An unexpected display error occurred while rendering the page. Refreshing will restore your session.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "linear-gradient(135deg, #c5a059 0%, #dfba73 100%)",
                  color: "#050505",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase"
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase"
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const navigate = useNavigate();
  const { isLoading, error } = useChomkaStore();

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

  


  if (isLoading) {
    return (
      <>
        <StarrySpaceBackground />
        <div className="ambient-glow-layer" aria-hidden="true" />
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
          <p className="eyebrow" style={{ animation: "pulse 1.5s infinite" }}>LOADING ARCHIVE...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <StarrySpaceBackground />
        <div className="ambient-glow-layer" aria-hidden="true" />
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <p className="eyebrow">CONNECTION ERROR</p>
          <h2 style={{ fontSize: "24px", color: "var(--foreground)" }}>Failed to load catalogue</h2>
          <p style={{ color: "var(--muted)", maxWidth: "400px", textAlign: "center" }}>{error}</p>
          <button className="primary-button" style={{ marginTop: "20px" }} onClick={() => window.location.reload()}>RETRY</button>
        </div>
      </>
    );
  }




  return (
    <RootErrorBoundary>
      <AdminAuthProvider>
        <CookieConsentProvider>
        <CurrencyProvider>
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
            path="/beat/:id"
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
            path="/services"
            element={
              <ServicesRoute />
            }
          />

          <Route
            path="/services/order/:orderNumber"
            element={
              <ServiceOrderDetailRoute />
            }
          />

          <Route
            path="/services/:slug"
            element={
              <ServicesRoute />
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

          {/* Dedicated Core Content Routes (Stage 38 Technical SEO) */}
          <Route path="/music" element={<MusicRoute />} />
          <Route path="/gallery" element={<GalleryRoute />} />
          <Route path="/about" element={<AboutRoute />} />
          <Route path="/events" element={<EventsRoute />} />
          <Route path="/events/:slug" element={<EventDetailRoute />} />
          <Route path="/calendar" element={<CalendarRoute />} />

          <Route
            path="/privacy"
            element={
              <>
                <SiteHeader beatsPage />
                <PrivacyPolicyPage />
                <SiteFooter />
              </>
            }
          />

          <Route
            path="/cookies"
            element={
              <>
                <SiteHeader beatsPage />
                <CookiePolicyPage />
                <SiteFooter />
              </>
            }
          />

          <Route
            path="/terms"
            element={
              <>
                <SiteHeader beatsPage />
                <TermsOfUsePage />
                <SiteFooter />
              </>
            }
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin/login" 
            element={
              <GuestRoute>
                <AdminLoginPage />
              </GuestRoute>
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="events" element={<AdminEventsPage />} />
            <Route path="gallery" element={<AdminGalleryPage />} />
            <Route path="music" element={<AdminMusicPage />} />
            <Route path="tracks" element={<AdminTracksPage />} />
            <Route path="beats" element={<AdminBeatsPage />} />
            <Route path="videos" element={<AdminVideosPage />} />
            <Route path="media" element={<AdminMediaPage />} />
            <Route path="links" element={<AdminLinksPage />} />
            <Route path="merchandise" element={<AdminMerchandisePage />} />
            <Route path="subscribers" element={<AdminSubscribersPage />} />
            <Route path="recycle-bin" element={<AdminRecycleBinPage />} />
            <Route path="settings" element={<AdminSettingsPlaceholder />} />
          </Route>
  
          <Route
            path="*"
            element={
              <NotFoundPage />
            }
          />
        </Routes>

        <CookieConsentBanner />
        <ChomkaAiAssistantModal />
      </>
      </CurrencyProvider>
      </CookieConsentProvider>
    </AdminAuthProvider>
    </RootErrorBoundary>
  );
}

export default App;

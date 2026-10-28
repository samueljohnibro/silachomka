import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import { fetchEventBySlug } from "../data/api";
import SeoHead from "../components/SeoHead";
import SharePageButton from "../components/SharePageButton";
import SubscriberNewsletterBox from "../components/SubscriberNewsletterBox";
import EventsAmbientBackground from "../components/EventsAmbientBackground";
import { canonicalUrl } from "../data/siteConfig";
import { getCalendarReturnUrl } from "../utils/calendarNavigation";

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function EventDetailCountdown({ targetDate, startTime }) {
  const targetTime = useMemo(() => {
    if (!targetDate) return 0;
    const timePart = startTime ? `T${startTime}:00` : "T00:00:00";
    const parsed = new Date(`${targetDate}${timePart}`);
    return isNaN(parsed.getTime()) ? new Date(targetDate).getTime() : parsed.getTime();
  }, [targetDate, startTime]);

  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, targetTime - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, targetTime - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (timeLeft <= 0) {
    return (
      <div className="event-detail-countdown concluded">
        <span className="event-detail-countdown-status">STATUS</span>
        <span className="event-detail-countdown-val">GATHERING CONCLUDED / ARCHIVED</span>
      </div>
    );
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="event-detail-countdown active">
      <div className="event-detail-countdown-header">
        <span className="events-pulse-dot" />
        <span>COUNTDOWN TO GATHERING</span>
      </div>
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
  );
}

export default function EventDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const calendarReturnUrl = useMemo(() => {
    return getCalendarReturnUrl(location, searchParams);
  }, [location, searchParams]);
  const { events, releases, beats, gallery } = useChomkaStore();

  const [eventData, setEventData] = useState(() => {
    return (events || []).find(
      (e) => String(e.slug || "").toLowerCase() === String(slug || "").toLowerCase()
    ) || null;
  });
  const [loading, setLoading] = useState(!eventData);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const fetched = await fetchEventBySlug(slug);
        if (mounted && fetched) {
          setEventData(fetched);
        }
      } catch {
        if (mounted && !eventData) {
          setError("Gathering not found or inactive.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [slug]);

  // Resolve tagged gallery posts
  const taggedGalleryPosts = useMemo(() => {
    if (!eventData?.tagged_gallery_post_ids || !Array.isArray(eventData.tagged_gallery_post_ids)) {
      return eventData?.associatedGallery || [];
    }
    const ids = eventData.tagged_gallery_post_ids.map(String);
    return (gallery || []).filter((g) => ids.includes(String(g.id)));
  }, [eventData, gallery]);

  // Resolve tagged releases
  const taggedReleasesList = useMemo(() => {
    if (!eventData?.tagged_release_ids || !Array.isArray(eventData.tagged_release_ids)) {
      return eventData?.associatedReleases || [];
    }
    const ids = eventData.tagged_release_ids.map(String);
    return (releases || []).filter((r) => ids.includes(String(r.id)));
  }, [eventData, releases]);

  // Resolve tagged beats
  const taggedBeatsList = useMemo(() => {
    if (!eventData?.tagged_beat_ids || !Array.isArray(eventData.tagged_beat_ids)) {
      return eventData?.associatedBeats || [];
    }
    const ids = eventData.tagged_beat_ids.map(String);
    return (beats || []).filter((b) => ids.includes(String(b.id)));
  }, [eventData, beats]);

  if (loading) {
    return (
      <div className="event-detail-loading">
        <div className="beat-loading-spinner" />
        <p>Opening sanctuary event...</p>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="events-empty-state" style={{ margin: "100px auto", maxWidth: "600px", textAlign: "center" }}>
        <div className="events-empty-icon">🏛️</div>
        <h2>Gathering Not Found</h2>
        <p style={{ margin: "20px 0 30px" }}>The requested event date or sanctuary session could not be located.</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          {calendarReturnUrl && (
            <Link className="primary-button" to={calendarReturnUrl}>
              ← Back to Calendar
            </Link>
          )}
          <button type="button" className="primary-button" onClick={() => navigate("/events")}>
            Return to Events
          </button>
        </div>
      </div>
    );
  }

  const isUpcoming = eventData.status === "UPCOMING" || eventData.isFuture;
  const flyerUrl = eventData.primary_artwork_url || eventData.cover || "/og-image.png";

  const googleMapsUrl = eventData.venue_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${eventData.venue_name || ""} ${eventData.venue_address} ${eventData.city || ""}`.trim())}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: eventData.title,
    startDate: eventData.event_date,
    endDate: eventData.event_date,
    description: eventData.description || eventData.subtitle || `Live performance by silachomka at ${eventData.venue_name || "Sanctuary"}.`,
    image: flyerUrl.startsWith("http") ? flyerUrl : canonicalUrl(flyerUrl),
    url: canonicalUrl(`/events/${eventData.slug}`),
    location: {
      "@type": "Place",
      name: eventData.venue_name || "Concert Venue",
      address: {
        "@type": "PostalAddress",
        streetAddress: eventData.venue_address || "",
        addressLocality: eventData.city || "",
        addressCountry: eventData.country || "Nigeria"
      }
    },
    performer: {
      "@type": "Person",
      name: "silachomka"
    },
    offers: eventData.ticket_url ? {
      "@type": "Offer",
      url: eventData.ticket_url,
      price: eventData.ticket_price || "0",
      priceCurrency: "NGN",
      availability: eventData.ticket_status === "SOLD OUT" 
        ? "https://schema.org/SoldOut" 
        : "https://schema.org/InStock"
    } : undefined
  };

  return (
    <div className="event-detail-view">
      <SeoHead
        title={`${eventData.title} — Live at ${eventData.venue_name || "Sanctuary"} | silachomka`}
        description={eventData.subtitle || eventData.description || `Live appearance and acoustic sanctuary session by silachomka at ${eventData.venue_name || "Sanctuary"}.`}
        path={`/events/${eventData.slug}`}
        image={flyerUrl}
        imageAlt={`${eventData.title} event flyer`}
        jsonLd={jsonLd}
      />

      {/* Atmospheric Stage Sanctuary & Volumetric Concert Spotlights */}
      <EventsAmbientBackground image={flyerUrl} />

      <main className="event-detail-container">
        {/* Breadcrumb navigation */}
        <nav aria-label="Breadcrumb" className="events-breadcrumb">
          <ol>
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            {calendarReturnUrl && (
              <>
                <li>
                  <Link
                    to={calendarReturnUrl}
                    style={{ color: "var(--gold)", fontWeight: 700 }}
                  >
                    Calendar
                  </Link>
                </li>
                <li>/</li>
              </>
            )}
            <li><Link to="/events">Events</Link></li>
            <li>/</li>
            <li aria-current="page">{eventData.title}</li>
          </ol>
        </nav>

        {calendarReturnUrl && (
          <div style={{ marginBottom: "20px" }}>
            <Link
              className="release-breadcrumb calendar-return-link"
              to={calendarReturnUrl}
              style={{ marginBottom: 0 }}
            >
              ← Back to Calendar
            </Link>
          </div>
        )}

        {/* Hero Section */}
        <div className="event-hero-grid">
          {/* Flyer Presentation */}
          <div className="event-flyer-column">
            <div className="event-flyer-card">
              <img
                src={flyerUrl}
                alt={`${eventData.title} flyer`}
                className="event-flyer-image"
                loading="eager"
                onError={(e) => { e.target.src = "/og-image.png"; }}
              />
              <div className="event-flyer-badge">
                {isUpcoming ? (eventData.ticket_status || "CONFIRMED SHOW") : "COMPLETED SHOW"}
              </div>
            </div>

            {/* Share Page Button */}
            <div className="event-share-row">
              <SharePageButton
                title={`${eventData.title} — silachomka Live`}
                label="Share Gathering Link"
              />
            </div>
          </div>

          {/* Core Info Column */}
          <div className="event-info-column">
            <div className="event-eyebrow-row">
              <span className="eyebrow">CHOMKA LIVE SANCTUARY</span>
              {eventData.is_featured && <span className="event-featured-pill">★ FEATURED GATHERING</span>}
            </div>

            <h1 className="event-detail-title">{eventData.title}</h1>
            {eventData.subtitle && (
              <p className="event-detail-subtitle">{eventData.subtitle}</p>
            )}

            {/* Live Countdown if upcoming */}
            {isUpcoming && (
              <EventDetailCountdown
                targetDate={eventData.event_date}
                startTime={eventData.start_time}
              />
            )}

            {/* Essential Logistics Grid */}
            <div className="event-logistics-grid">
              <div className="logistics-item">
                <div className="logistics-icon">📅</div>
                <div className="logistics-content">
                  <span className="logistics-label">DATE</span>
                  <strong className="logistics-val">{formatDateDisplay(eventData.event_date)}</strong>
                </div>
              </div>

              {(eventData.start_time || eventData.end_time) && (
                <div className="logistics-item">
                  <div className="logistics-icon">⏰</div>
                  <div className="logistics-content">
                    <span className="logistics-label">TIME</span>
                    <strong className="logistics-val">
                      {eventData.start_time || "TBA"}
                      {eventData.end_time ? ` – ${eventData.end_time}` : ""}
                    </strong>
                  </div>
                </div>
              )}

              <div className="logistics-item">
                <div className="logistics-icon">🏛️</div>
                <div className="logistics-content">
                  <span className="logistics-label">VENUE</span>
                  <strong className="logistics-val">{eventData.venue_name || "Sanctuary"}</strong>
                  {eventData.venue_address && (
                    <span className="logistics-sub">{eventData.venue_address}</span>
                  )}
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="logistics-maps-link"
                    >
                      Open in Maps ↗
                    </a>
                  )}
                </div>
              </div>

              {(eventData.city || eventData.country) && (
                <div className="logistics-item">
                  <div className="logistics-icon">📍</div>
                  <div className="logistics-content">
                    <span className="logistics-label">LOCATION</span>
                    <strong className="logistics-val">
                      {[eventData.city, eventData.country].filter(Boolean).join(", ")}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Ticket & RSVP CTA Bar */}
            <div className="event-ticket-card">
              <div className="event-ticket-left">
                <span className="event-ticket-status-pill">{eventData.ticket_status || "ADMISSION"}</span>
                {eventData.ticket_price && (
                  <div className="event-ticket-price-display">
                    <span className="event-ticket-currency">Fee:</span>
                    <strong>{eventData.ticket_price}</strong>
                  </div>
                )}
              </div>

              <div className="event-ticket-right">
                {eventData.ticket_url ? (
                  <a
                    href={eventData.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-button"
                  >
                    {isUpcoming ? "Secure Passes / RSVP ↗" : "Event Link ↗"}
                  </a>
                ) : (
                  <div className="event-rsvp-note">
                    {isUpcoming ? "Free Admission / Open Sanctuary" : "Concluded Archive"}
                  </div>
                )}
              </div>
            </div>

            {/* Lineup / Performers */}
            {eventData.lineup && Array.isArray(eventData.lineup) && eventData.lineup.length > 0 && (
              <div className="event-lineup-block">
                <h3 className="event-subheading">Curated Lineup & Performers</h3>
                <div className="event-lineup-tags">
                  {eventData.lineup.map((act, aIdx) => (
                    <span key={aIdx} className="event-lineup-tag">
                      {typeof act === "string" ? act : act.name || "Performer"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description & Sanctuary Context */}
        {eventData.description && (
          <section className="event-description-section">
            <h2 className="event-section-heading">Gathering Experience & Overview</h2>
            <div className="event-description-text">
              {eventData.description.split("\n\n").map((para, pIdx) => (
                <p key={pIdx}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* Additional Artworks & Stage Visuals */}
        {eventData.additional_artworks && Array.isArray(eventData.additional_artworks) && eventData.additional_artworks.length > 0 && (
          <section className="event-media-section">
            <h2 className="event-section-heading">Visuals, Flyers & Stage Atmosphere</h2>
            <div className="event-gallery-grid">
              {eventData.additional_artworks.map((art, artIdx) => (
                <div key={artIdx} className="event-gallery-item">
                  <img
                    src={typeof art === "string" ? art : art.url || art.src}
                    alt={`${eventData.title} media ${artIdx + 1}`}
                    loading="lazy"
                    onError={(e) => { e.target.src = "/og-image.png"; }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bi-directional Cross-Tagged Content */}
        {/* 1. Tagged Gallery Posts */}
        {taggedGalleryPosts.length > 0 && (
          <section className="event-cross-section">
            <div className="event-cross-header">
              <span className="eyebrow">SANCTUARY ARCHIVE</span>
              <h2>Moments & Visuals Captured at this Gathering</h2>
            </div>
            <div className="event-cross-gallery-grid">
              {taggedGalleryPosts.map((post) => (
                <article key={post.id} className="event-cross-gallery-card">
                  <Link to={`/gallery`} className="event-cross-gallery-thumb">
                    <img
                      src={post.asset || post.src || "/og-image.png"}
                      alt={post.title || "Gallery Moment"}
                      loading="lazy"
                    />
                    <span className="event-cross-tag-badge">📸 Moment</span>
                  </Link>
                  <div className="event-cross-gallery-body">
                    <h4>{post.title || "Untitled Moment"}</h4>
                    <Link to="/gallery" className="event-cross-link">
                      View in Gallery →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 2. Tagged Music Releases */}
        {taggedReleasesList.length > 0 && (
          <section className="event-cross-section">
            <div className="event-cross-header">
              <span className="eyebrow">PERFORMED CATALOGUE</span>
              <h2>Featured Music from this Sanctuary</h2>
            </div>
            <div className="event-cross-music-grid">
              {taggedReleasesList.map((rel) => (
                <article key={rel.id} className="event-cross-music-card">
                  <Link to={`/release/${rel.slug}`} className="event-cross-music-art">
                    <img
                      src={rel.cover || "/og-image.png"}
                      alt={rel.title}
                      loading="lazy"
                    />
                  </Link>
                  <div className="event-cross-music-info">
                    <h4>{rel.title}</h4>
                    <span className="event-cross-meta">{rel.artist || "silachomka"}</span>
                    <Link to={`/release/${rel.slug}`} className="primary-button" style={{ marginTop: "12px", display: "inline-block" }}>
                      Listen to Release →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 3. Tagged Beats */}
        {taggedBeatsList.length > 0 && (
          <section className="event-cross-section">
            <div className="event-cross-header">
              <span className="eyebrow">CHOMKA BEATS</span>
              <h2>Associated Studio Soundscapes & Beats</h2>
            </div>
            <div className="event-cross-music-grid">
              {taggedBeatsList.map((beat) => (
                <article key={beat.id} className="event-cross-music-card">
                  <Link to={`/beats/${beat.id}`} className="event-cross-music-art">
                    <img
                      src={beat.cover || "/og-image.png"}
                      alt={beat.title}
                      loading="lazy"
                    />
                  </Link>
                  <div className="event-cross-music-info">
                    <h4>{beat.title}</h4>
                    <span className="event-cross-meta">{beat.bpm ? `${beat.bpm} BPM` : "Studio Beat"} • {beat.scale || "Key"}</span>
                    <Link to={`/beats/${beat.id}`} className="primary-button" style={{ marginTop: "12px", display: "inline-block" }}>
                      Play & License Beat →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Back navigation & Newsletter */}
        <div className="event-footer-nav">
          <Link to="/events" className="secondary-button">
            ← Back to All Gatherings
          </Link>
          <Link to="/calendar" className="secondary-button">
            📅 View Activity Calendar →
          </Link>
        </div>

        <div style={{ marginTop: "60px" }}>
          <SubscriberNewsletterBox />
        </div>
      </main>
    </div>
  );
}

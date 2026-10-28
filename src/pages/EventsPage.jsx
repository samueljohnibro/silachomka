import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import SeoHead from "../components/SeoHead";
import SharePageButton from "../components/SharePageButton";
import SubscriberNewsletterBox from "../components/SubscriberNewsletterBox";
import EventsAmbientBackground from "../components/EventsAmbientBackground";
import { canonicalUrl } from "../data/siteConfig";

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function EventCountdown({ targetDate, startTime }) {
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
      <div className="event-countdown-box concluded">
        <span>GATHERING IN PROGRESS OR CONCLUDED</span>
      </div>
    );
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="event-countdown-box">
      <div className="event-countdown-title">COUNTDOWN TO GATHERING</div>
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
          <span className="countdown-timer-unit">Mins</span>
        </div>
        <div className="countdown-timer-colon">:</div>
        <div className="countdown-timer-box">
          <span className="countdown-timer-num">{String(seconds).padStart(2, "0")}</span>
          <span className="countdown-timer-unit">Secs</span>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { events } = useChomkaStore();
  const [filter, setFilter] = useState("ALL"); // ALL | UPCOMING | PAST

  const publishedEvents = useMemo(() => {
    return (events || []).filter((e) => Boolean(e.is_published));
  }, [events]);

  const upcomingEvents = useMemo(() => {
    return publishedEvents.filter((e) => e.status === "UPCOMING" || e.isFuture);
  }, [publishedEvents]);

  const pastEvents = useMemo(() => {
    return publishedEvents.filter((e) => e.status === "PAST" || (!e.isFuture && e.status !== "UPCOMING"));
  }, [publishedEvents]);

  const displayedEvents = useMemo(() => {
    if (filter === "UPCOMING") return upcomingEvents;
    if (filter === "PAST") return pastEvents;
    return publishedEvents;
  }, [filter, upcomingEvents, pastEvents, publishedEvents]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Live Sanctuary & Events — silachomka",
    url: canonicalUrl("/events"),
    description: "Upcoming live appearances, sanctuary gatherings, acoustic sessions, and tour dates for silachomka.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: publishedEvents.map((evt, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "MusicEvent",
          name: evt.title,
          startDate: evt.event_date,
          url: canonicalUrl(`/events/${evt.slug}`),
          location: {
            "@type": "Place",
            name: evt.venue_name || "Concert Venue",
            address: {
              "@type": "PostalAddress",
              addressLocality: evt.city || "",
              addressCountry: evt.country || ""
            }
          }
        }
      }))
    }
  };

  const headlineCover = upcomingEvents[0]?.primary_artwork_url || upcomingEvents[0]?.cover || null;

  return (
    <div className="events-page-view">
      <SeoHead
        title="Live Sanctuary & Events — silachomka"
        description="Official calendar of live gatherings, acoustic sanctuaries, festivals, and tour appearances for silachomka."
        path="/events"
        jsonLd={jsonLd}
      />

      {/* Atmospheric Stage Sanctuary & Volumetric Concert Spotlights */}
      <EventsAmbientBackground image={headlineCover} />

      <main className="events-page-container">
        <nav aria-label="Breadcrumb" className="events-breadcrumb">
          <ol>
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li aria-current="page">Events & Sanctuary</li>
          </ol>
        </nav>

        <header className="events-header">
          <div className="events-header-content">
            <p className="eyebrow">CHOMKA GATHERINGS & TOUR ARCHIVE</p>
            <h1 className="events-title">Live Events & Sanctuary</h1>
            <p className="events-subtitle">
              Intimate acoustic performances, headline concert appearances, audio-visual sacred showcases, and Chomka Nation gatherings.
            </p>
          </div>
          <div className="events-header-actions">
            <SharePageButton
              title="Live Sanctuary & Events — silachomka"
              label="Share Events Calendar"
            />
          </div>
        </header>

        {/* View filter tabs */}
        <div className="events-filters-bar">
          <div className="events-tabs">
            <button
              type="button"
              className={`events-tab ${filter === "ALL" ? "is-active" : ""}`}
              onClick={() => setFilter("ALL")}
            >
              All Gatherings ({publishedEvents.length})
            </button>
            <button
              type="button"
              className={`events-tab ${filter === "UPCOMING" ? "is-active" : ""}`}
              onClick={() => setFilter("UPCOMING")}
            >
              Upcoming ({upcomingEvents.length})
            </button>
            <button
              type="button"
              className={`events-tab ${filter === "PAST" ? "is-active" : ""}`}
              onClick={() => setFilter("PAST")}
            >
              Past Archive ({pastEvents.length})
            </button>
          </div>

          <Link to="/calendar" className="events-calendar-link">
            <span>📅 Unified Activity Calendar →</span>
          </Link>
        </div>

        {/* Featured Upcoming Spotlight if available */}
        {upcomingEvents.length > 0 && filter !== "PAST" && (
          <section className="events-spotlight-section">
            <div className="events-section-title">
              <span className="events-pulse-dot" />
              <span>Next Headline Gathering</span>
            </div>

            <div className="events-spotlight-card">
              <div className="events-spotlight-flyer-wrap">
                <img
                  src={upcomingEvents[0].primary_artwork_url || upcomingEvents[0].cover || "/og-image.png"}
                  alt={upcomingEvents[0].title}
                  className="events-spotlight-flyer"
                  loading="eager"
                  onError={(e) => { e.target.src = "/og-image.png"; }}
                />
                <div className="events-badge-pill spotlight-badge">
                  {upcomingEvents[0].ticket_status || "UPCOMING SHOW"}
                </div>
              </div>

              <div className="events-spotlight-info">
                <div className="events-spotlight-meta">
                  <span className="events-date-tag">
                    📅 {formatDateDisplay(upcomingEvents[0].event_date)}
                    {upcomingEvents[0].start_time ? ` • ${upcomingEvents[0].start_time}` : ""}
                  </span>
                  {upcomingEvents[0].city && (
                    <span className="events-city-tag">
                      📍 {upcomingEvents[0].venue_name ? `${upcomingEvents[0].venue_name}, ` : ""}{upcomingEvents[0].city}
                    </span>
                  )}
                </div>

                <h2 className="events-spotlight-title">{upcomingEvents[0].title}</h2>
                {upcomingEvents[0].subtitle && (
                  <p className="events-spotlight-subtitle">{upcomingEvents[0].subtitle}</p>
                )}

                {/* Live Countdown */}
                <EventCountdown
                  targetDate={upcomingEvents[0].event_date}
                  startTime={upcomingEvents[0].start_time}
                />

                {upcomingEvents[0].lineup && Array.isArray(upcomingEvents[0].lineup) && upcomingEvents[0].lineup.length > 0 && (
                  <div className="events-lineup-row">
                    <span className="events-lineup-label">Featuring:</span>
                    <div className="events-lineup-chips">
                      {upcomingEvents[0].lineup.map((performer, pIdx) => (
                        <span key={pIdx} className="events-performer-chip">
                          {typeof performer === "string" ? performer : performer.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="events-spotlight-actions">
                  <Link
                    to={`/events/${upcomingEvents[0].slug}`}
                    className="primary-button"
                  >
                    View Gathering Details & RSVP →
                  </Link>

                  {upcomingEvents[0].ticket_url && (
                    <a
                      href={upcomingEvents[0].ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-button"
                    >
                      Tickets {upcomingEvents[0].ticket_price ? `(${upcomingEvents[0].ticket_price})` : "Available"} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* List of events */}
        <section className="events-grid-section">
          <div className="events-grid-header">
            <h2>{filter === "UPCOMING" ? "Upcoming Tour Stops & Gatherings" : filter === "PAST" ? "Past Sanctuary Archive" : "All Scheduled & Concluded Dates"}</h2>
          </div>

          {displayedEvents.length === 0 ? (
            <div className="events-empty-state">
              <div className="events-empty-icon">🏛️</div>
              <h3>Sanctuary in Preparation</h3>
              <p>
                There are currently no events matching your selection. New concert dates, acoustic sets, and intimate sessions are added regularly. Subscribe below to be notified first.
              </p>
            </div>
          ) : (
            <div className="events-cards-grid">
              {displayedEvents.map((evt) => {
                const isUpcoming = evt.status === "UPCOMING" || evt.isFuture;
                return (
                  <article key={evt.id} className={`event-card ${isUpcoming ? "is-upcoming" : "is-past"}`}>
                    <Link to={`/events/${evt.slug}`} className="event-card-art-frame">
                      <img
                        src={evt.primary_artwork_url || evt.cover || "/og-image.png"}
                        alt={evt.title}
                        className="event-card-art"
                        loading="lazy"
                        onError={(e) => { e.target.src = "/og-image.png"; }}
                      />
                      <div className="event-card-badge">
                        {isUpcoming ? (evt.ticket_status || "UPCOMING") : "CONCLUDED"}
                      </div>
                    </Link>

                    <div className="event-card-body">
                      <div className="event-card-date">
                        <span>{formatDateDisplay(evt.event_date)}</span>
                        {evt.start_time && <span>• {evt.start_time}</span>}
                      </div>

                      <h3 className="event-card-title">
                        <Link to={`/events/${evt.slug}`}>{evt.title}</Link>
                      </h3>

                      <div className="event-card-venue">
                        <span>📍 {evt.venue_name || "Sanctuary Venue"}</span>
                        {evt.city && <span className="event-card-city">, {evt.city}</span>}
                        {evt.country && <span className="event-card-country"> ({evt.country})</span>}
                      </div>

                      {evt.subtitle && (
                        <p className="event-card-desc">{evt.subtitle}</p>
                      )}

                      <div className="event-card-actions">
                        <Link to={`/events/${evt.slug}`} className="event-card-link">
                          Explore Details →
                        </Link>
                        {evt.ticket_url && isUpcoming && (
                          <a
                            href={evt.ticket_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="event-card-ticket-btn"
                          >
                            Tickets
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Newsletter Box */}
        <div style={{ marginTop: "60px" }}>
          <SubscriberNewsletterBox />
        </div>
      </main>
    </div>
  );
}

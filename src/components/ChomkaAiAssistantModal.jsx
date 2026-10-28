import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import { useCurrency } from "../data/CurrencyContext";

// Standard studio service rate baselines for intent calculation
const STUDIO_SERVICE_CATALOGUE = [
  {
    slug: "vocal-recording",
    title: "Vocal Recording Sessions",
    category: "Recording",
    rateNgn: 30000,
    rateUsd: 60,
    unit: "hour",
    keywords: ["vocal", "vocals", "record", "recording", "voice", "sing", "booth", "mic", "studio time", "hours", "session"],
    description: "Pristine Neumann & Avalon vocal chain tracking with zero latency monitoring.",
  },
  {
    slug: "mixing-mastering",
    title: "Mixing & Mastering",
    category: "Engineering",
    rateNgn: 70000,
    rateUsd: 140,
    unit: "track",
    keywords: ["mix", "mixing", "master", "mastering", "mixdown", "stem", "stems", "polish", "analog", "clarity", "loudness"],
    description: "Hybrid analog/digital stem mixing and streaming-ready competitive mastering.",
  },
  {
    slug: "beat-production",
    title: "Custom Beat Production",
    category: "Production",
    rateNgn: 100000,
    rateUsd: 200,
    unit: "beat",
    keywords: ["beat", "beats", "produce", "production", "instrumental", "soundtrack", "custom beat", "afrobeats", "amapiano", "trap"],
    description: "Tailored custom composition crafted specifically around your vocal tone and artistic identity.",
  },
  {
    slug: "music-consultation",
    title: "Production Consultation & A&R",
    category: "Advisory",
    rateNgn: 25000,
    rateUsd: 50,
    unit: "session",
    keywords: ["consult", "consultation", "advice", "feedback", "a&r", "strategy", "review", "direction", "release plan"],
    description: "Direct 1-on-1 strategic review of your demos, sonic architecture, and release roadmap.",
  },
];

// Levenshtein edit distance for fuzzy typo correction
function levenshteinDistance(s1, s2) {
  const a = String(s1 || "").toLowerCase();
  const b = String(s2 || "").toLowerCase();
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Calculate similarity ratio 0..1
function fuzzyMatchScore(term, target) {
  if (!term || !target) return 0;
  const t = term.toLowerCase().trim();
  const g = target.toLowerCase().trim();
  if (g.includes(t)) return 1;
  const dist = levenshteinDistance(t, g);
  const maxLen = Math.max(t.length, g.length);
  return maxLen === 0 ? 1 : Math.max(0, 1 - dist / maxLen);
}

// Parse conversational booking stories into configured order drafts
function parseConversationalBooking(text) {
  const normalized = text.toLowerCase();
  const detectedServices = [];
  let detectedMessage = text;

  // Extract hours if mentioned (e.g., "4 hours", "3 hrs")
  let hours = 2;
  const hourMatch = normalized.match(/(\d+)\s*(?:hour|hours|hr|hrs)/);
  if (hourMatch) {
    hours = Math.max(1, parseInt(hourMatch[1], 10));
  }

  // Extract tracks count if mentioned (e.g., "2 songs", "3 tracks")
  let tracks = 1;
  const trackMatch = normalized.match(/(\d+)\s*(?:song|songs|track|tracks|beat|beats)/);
  if (trackMatch) {
    tracks = Math.max(1, parseInt(trackMatch[1], 10));
  }

  // Match against services
  for (const svc of STUDIO_SERVICE_CATALOGUE) {
    const isMatched = svc.keywords.some((k) => normalized.includes(k));
    if (isMatched) {
      let qty = 1;
      if (svc.slug === "vocal-recording") qty = hours;
      else if (svc.slug === "mixing-mastering") qty = tracks;
      else if (svc.slug === "beat-production") qty = tracks;

      detectedServices.push({
        ...svc,
        quantity: qty,
        subtotalNgn: svc.rateNgn * qty,
        subtotalUsd: svc.rateUsd * qty,
      });
    }
  }

  if (detectedServices.length === 0) return null;

  const totalNgn = detectedServices.reduce((sum, s) => sum + s.subtotalNgn, 0);
  const totalUsd = detectedServices.reduce((sum, s) => sum + s.subtotalUsd, 0);
  const depositNgn = Math.round(totalNgn * 0.5);
  const depositUsd = Math.round(totalUsd * 0.5);

  return {
    isIntent: true,
    services: detectedServices,
    totalNgn,
    totalUsd,
    depositNgn,
    depositUsd,
    rawPrompt: text,
  };
}

export default function ChomkaAiAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'beats' | 'music' | 'services' | 'events' | 'gallery'
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  const { releases, beats, gallery, events } = useChomkaStore();
  const currencyCtx = useCurrency();
  const currency = currencyCtx?.currency || "NGN";

  const formatAmount = useCallback((num) => {
    if (!Number.isFinite(num)) return "";
    if (currency === "USD") return `$${Number(num).toLocaleString()}`;
    return `₦${Number(num).toLocaleString()}`;
  }, [currency]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chomka_ai_recent_queries");
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch {}
  }, []);

  const saveQuery = useCallback((text) => {
    if (!text || text.trim().length < 2) return;
    try {
      const trimmed = text.trim();
      const updated = [trimmed, ...recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("chomka_ai_recent_queries", JSON.stringify(updated));
    } catch {}
  }, [recentSearches]);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K or / to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(e.target?.tagName)) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Conversational Intent Detection
  const bookingProposal = useMemo(() => {
    if (!query || query.trim().length < 8) return null;
    const isConversational =
      /(book|session|record|hours?|mix|master|consult|custom|beat|produce|tracks?|price|cost|how much|want to|hire)/i.test(query);
    if (!isConversational) return null;
    return parseConversationalBooking(query);
  }, [query]);

  // Multi-entity Typo-Tolerant Search Engine
  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return {
        hasQuery: false,
        beats: beats.slice(0, 3),
        releases: releases.slice(0, 2),
        services: STUDIO_SERVICE_CATALOGUE,
        events: events.slice(0, 2),
        gallery: gallery.slice(0, 3),
        suggestedTerm: null,
      };
    }

    const queryTokens = trimmed.split(/\s+/).filter(Boolean);

    // Score function across multiple attributes
    const scoreItem = (strings) => {
      let maxScore = 0;
      for (const str of strings) {
        if (!str) continue;
        const low = String(str).toLowerCase();
        // Exact containment
        if (low.includes(trimmed)) return 1.0;
        // Token match
        for (const token of queryTokens) {
          if (low.includes(token)) maxScore = Math.max(maxScore, 0.85);
          const fScore = fuzzyMatchScore(token, low);
          if (fScore > 0.65) maxScore = Math.max(maxScore, fScore * 0.8);
        }
      }
      return maxScore;
    };

    // Filter & score beats
    const matchedBeats = beats
      .map((b) => ({ item: b, score: scoreItem([b.title, b.genre, b.mood, b.key, b.bpm ? `${b.bpm} bpm` : "", ...(b.tags || [])]) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    // Filter & score releases
    const matchedReleases = releases
      .map((r) => ({ item: r, score: scoreItem([r.title, r.year, r.description, r.genre, ...(r.tracklist?.map((t) => t.title) || [])]) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    // Filter & score services
    const matchedServices = STUDIO_SERVICE_CATALOGUE
      .map((s) => ({ item: s, score: scoreItem([s.title, s.category, s.description, ...s.keywords]) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    // Filter & score events
    const matchedEvents = events
      .map((e) => ({ item: e, score: scoreItem([e.title, e.venue, e.city, e.country, e.description, e.ticket_status]) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    // Filter & score gallery
    const matchedGallery = gallery
      .map((g) => ({ item: g, score: scoreItem([g.title, g.caption, g.category, g.location, ...(g.tags || [])]) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.item);

    return {
      hasQuery: true,
      beats: matchedBeats,
      releases: matchedReleases,
      services: matchedServices,
      events: matchedEvents,
      gallery: matchedGallery,
      totalCount: matchedBeats.length + matchedReleases.length + matchedServices.length + matchedEvents.length + matchedGallery.length,
    };
  }, [query, beats, releases, events, gallery]);

  // Handle direct navigation to service checkout with pre-filled proposal
  const handleProceedToServices = (proposal) => {
    saveQuery(query);
    setIsOpen(false);
    try {
      const selectedSlugs = proposal.services.map((s) => s.slug);
      const configurations = {};
      proposal.services.forEach((s) => {
        configurations[s.slug] = {
          tier: "standard",
          hours: s.unit === "hour" ? s.quantity : 2,
          revisions: 2,
          quantity: s.quantity,
          expressTurnaround: false,
        };
      });

      const draft = {
        selectedSlugs,
        configurations,
        customerMessage: `AI Studio Request: "${proposal.rawPrompt}"`,
        step: 2, // jump to review / booking step
        lastUpdated: Date.now(),
      };
      localStorage.setItem("chomka_services_booking_draft_v1", JSON.stringify(draft));
    } catch {}
    navigate("/services");
  };

  const handleSelectResult = (url, queryText) => {
    if (queryText) saveQuery(queryText);
    setIsOpen(false);
    navigate(url);
  };

  return (
    <>
      {/* =========================================================
          FLOATING AI MAGIC SEARCH TRIGGER BUTTON (Bottom-Right)
          ========================================================= */}
      <button
        type="button"
        className="chomka-magic-ai-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Open silachomka AI Search & Studio Concierge (Ctrl+K)"
        title="Open silachomka AI Assistant (Ctrl+K)"
      >
        <div className="chomka-magic-ai-glow" aria-hidden="true" />
        <div className="chomka-magic-ai-sparkle">✦</div>
        <div className="chomka-magic-ai-label">
          <span>Ask silachomka AI</span>
          <span className="chomka-magic-ai-badge">⌘K</span>
        </div>
      </button>

      {/* =========================================================
          MODAL CONSOLE OVERLAY
          ========================================================= */}
      {isOpen && (
        <div
          className="chomka-ai-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="chomka-ai-modal-dialog" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="chomka-ai-header">
              <div className="chomka-ai-header-brand">
                <span className="chomka-ai-sparkle-icon">✦</span>
                <div>
                  <div className="chomka-ai-title">SILACHOMKA AI · CHOMKAMUSIC™</div>
                  <div className="chomka-ai-status">
                    <span className="chomka-ai-status-dot" />
                    <span>CATALOGUE & CHOMKAMUSIC™ STUDIO CONCIERGE</span>
                  </div>
                </div>
              </div>

              <div className="chomka-ai-header-actions">
                <span className="chomka-ai-esc-pill">ESC TO CLOSE</span>
                <button
                  type="button"
                  className="chomka-ai-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close search console"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Smart Search Bar */}
            <div className="chomka-ai-search-box">
              <span className="chomka-ai-search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                className="chomka-ai-search-input"
                placeholder="Search beats, releases, tour dates or say: 'I want to record vocals for 4 hours and mix 2 songs'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    saveQuery(query);
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  className="chomka-ai-clear-btn"
                  onClick={() => setQuery("")}
                  aria-label="Clear input"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Action Chips & Recommendations */}
            <div className="chomka-ai-chips-strip">
              <span className="chomka-ai-chips-label">SUGGESTIONS:</span>
              <button
                type="button"
                className="chomka-ai-chip"
                onClick={() => setQuery("Book 4 hours vocal recording and mixing")}
              >
                🎛️ Book Vocal Session
              </button>
              <button
                type="button"
                className="chomka-ai-chip"
                onClick={() => setQuery("Afrobeats")}
              >
                🥁 Afrobeats Beats
              </button>
              <button
                type="button"
                className="chomka-ai-chip"
                onClick={() => setQuery("Events and concerts")}
              >
                🎟️ Live Events
              </button>
              <button
                type="button"
                className="chomka-ai-chip"
                onClick={() => setQuery("NOISEMAKER")}
              >
                🔥 Latest Release
              </button>
              <button
                type="button"
                className="chomka-ai-chip"
                onClick={() => setQuery("Custom beat production")}
              >
                ⚡ Custom Beats
              </button>
            </div>

            {/* Console Body: Dynamic AI Intent or Search Results */}
            <div className="chomka-ai-body">
              {/* 1. Conversational Booking AI Proposal */}
              {bookingProposal && (
                <div className="chomka-ai-proposal-card">
                  <div className="chomka-ai-proposal-header">
                    <div className="chomka-ai-proposal-badge">
                      <span>✦ AI STUDIO PROPOSAL GENERATED</span>
                    </div>
                    <span className="chomka-ai-proposal-sub">
                      Organized automatically from your request
                    </span>
                  </div>

                  <p className="chomka-ai-proposal-quote">"{bookingProposal.rawPrompt}"</p>

                  <div className="chomka-ai-proposal-items">
                    {bookingProposal.services.map((svc) => (
                      <div key={svc.slug} className="chomka-ai-proposal-row">
                        <div>
                          <strong className="chomka-ai-proposal-item-title">{svc.title}</strong>
                          <span className="chomka-ai-proposal-item-qty">
                            ({svc.quantity} {svc.unit}{svc.quantity > 1 ? "s" : ""}) · {svc.description}
                          </span>
                        </div>
                        <div className="chomka-ai-proposal-item-price">
                          {formatAmount(currency === "NGN" ? svc.subtotalNgn : svc.subtotalUsd)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="chomka-ai-proposal-total-row">
                    <div>
                      <span className="chomka-ai-total-label">ESTIMATED PRODUCTION TOTAL</span>
                      <strong className="chomka-ai-total-val">
                        {formatAmount(currency === "NGN" ? bookingProposal.totalNgn : bookingProposal.totalUsd)}
                      </strong>
                    </div>
                    <div>
                      <span className="chomka-ai-total-label">50% STUDIO SECURING DEPOSIT</span>
                      <strong className="chomka-ai-total-deposit">
                        {formatAmount(currency === "NGN" ? bookingProposal.depositNgn : bookingProposal.depositUsd)}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="chomka-ai-proposal-btn"
                    onClick={() => handleProceedToServices(bookingProposal)}
                  >
                    <span>CONFIRM PACKAGE & PROCEED TO SECURING DEPOSIT</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              {/* 2. Structured Search Results */}
              <div className="chomka-ai-results-grid">
                {/* Services Matches */}
                {searchResults.services.length > 0 && (
                  <div className="chomka-ai-result-section">
                    <div className="chomka-ai-section-title">
                      <span>🎛️ STUDIO SERVICES ({searchResults.services.length})</span>
                    </div>
                    <div className="chomka-ai-section-list">
                      {searchResults.services.map((svc) => (
                        <div
                          key={svc.slug}
                          className="chomka-ai-result-card"
                          onClick={() => handleSelectResult(`/services/${svc.slug}`, svc.title)}
                        >
                          <div className="chomka-ai-card-info">
                            <span className="chomka-ai-card-category">{svc.category}</span>
                            <h4 className="chomka-ai-card-title">{svc.title}</h4>
                            <p className="chomka-ai-card-desc">{svc.description}</p>
                          </div>
                          <div className="chomka-ai-card-action">
                            <span className="chomka-ai-card-price">
                              FROM {formatAmount(currency === "NGN" ? svc.rateNgn : svc.rateUsd)}
                            </span>
                            <span className="chomka-ai-card-arrow">BOOK →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Beats Matches */}
                {searchResults.beats.length > 0 && (
                  <div className="chomka-ai-result-section">
                    <div className="chomka-ai-section-title">
                      <span>🥁 STUDIO BEATS ({searchResults.beats.length})</span>
                    </div>
                    <div className="chomka-ai-section-list">
                      {searchResults.beats.map((beat) => (
                        <div
                          key={beat.id}
                          className="chomka-ai-result-card"
                          onClick={() => handleSelectResult(`/beats/${beat.slug || beat.id}`, beat.title)}
                        >
                          <div className="chomka-ai-card-info">
                            <span className="chomka-ai-card-category">{beat.genre || "BEAT"} · {beat.bpm || 120} BPM</span>
                            <h4 className="chomka-ai-card-title">{beat.title}</h4>
                            <p className="chomka-ai-card-desc">Key: {beat.key || "C Minor"} · {beat.mood || "Atmospheric"}</p>
                          </div>
                          <div className="chomka-ai-card-action">
                            <span className="chomka-ai-card-price">
                              {beat.price ? `₦${Number(beat.price).toLocaleString()}` : "LICENSE"}
                            </span>
                            <span className="chomka-ai-card-arrow">LISTEN →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Music Releases Matches */}
                {searchResults.releases.length > 0 && (
                  <div className="chomka-ai-result-section">
                    <div className="chomka-ai-section-title">
                      <span>🎵 RELEASES & DISCOGRAPHY ({searchResults.releases.length})</span>
                    </div>
                    <div className="chomka-ai-section-list">
                      {searchResults.releases.map((rel) => (
                        <div
                          key={rel.slug}
                          className="chomka-ai-result-card"
                          onClick={() => handleSelectResult(`/release/${rel.slug}`, rel.title)}
                        >
                          <div className="chomka-ai-card-info">
                            <span className="chomka-ai-card-category">{rel.year || "RELEASE"}</span>
                            <h4 className="chomka-ai-card-title">{rel.title}</h4>
                            <p className="chomka-ai-card-desc">{rel.description || "Official project release."}</p>
                          </div>
                          <div className="chomka-ai-card-action">
                            <span className="chomka-ai-card-arrow">EXPLORE →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Events Matches */}
                {searchResults.events.length > 0 && (
                  <div className="chomka-ai-result-section">
                    <div className="chomka-ai-section-title">
                      <span>🎟️ EVENTS & PERFORMANCES ({searchResults.events.length})</span>
                    </div>
                    <div className="chomka-ai-section-list">
                      {searchResults.events.map((evt) => (
                        <div
                          key={evt.id || evt.slug}
                          className="chomka-ai-result-card"
                          onClick={() => handleSelectResult(`/events/${evt.slug}`, evt.title)}
                        >
                          <div className="chomka-ai-card-info">
                            <span className="chomka-ai-card-category">{evt.city || "LIVE"} · {evt.date}</span>
                            <h4 className="chomka-ai-card-title">{evt.title}</h4>
                            <p className="chomka-ai-card-desc">Venue: {evt.venue || "Announced soon"}</p>
                          </div>
                          <div className="chomka-ai-card-action">
                            <span className="chomka-ai-card-price">{evt.ticket_status || "TICKETS"}</span>
                            <span className="chomka-ai-card-arrow">DETAILS →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gallery Matches */}
                {searchResults.gallery.length > 0 && (
                  <div className="chomka-ai-result-section">
                    <div className="chomka-ai-section-title">
                      <span>🎬 VISUAL ARCHIVE ({searchResults.gallery.length})</span>
                    </div>
                    <div className="chomka-ai-section-list">
                      {searchResults.gallery.map((post) => (
                        <div
                          key={post.id}
                          className="chomka-ai-result-card"
                          onClick={() => handleSelectResult(`/gallery/${post.id}`, post.title)}
                        >
                          <div className="chomka-ai-card-info">
                            <span className="chomka-ai-card-category">{post.category || "GALLERY"}</span>
                            <h4 className="chomka-ai-card-title">{post.title || post.caption?.slice(0, 30) || "Archive Moment"}</h4>
                            <p className="chomka-ai-card-desc">{post.location ? `📍 ${post.location}` : "Official Vault"}</p>
                          </div>
                          <div className="chomka-ai-card-action">
                            <span className="chomka-ai-card-arrow">VIEW →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results empty state with recommendations */}
                {searchResults.hasQuery && searchResults.totalCount === 0 && !bookingProposal && (
                  <div className="chomka-ai-empty-state">
                    <p className="chomka-ai-empty-title">NO DIRECT MATCHES FOR "{query}"</p>
                    <p className="chomka-ai-empty-desc">
                      Try exploring Studio Services, searching for "Afrobeats", or asking the AI Concierge to organize a booking session.
                    </p>
                    <button
                      type="button"
                      className="studio-pill-btn"
                      onClick={() => setQuery("Book vocal recording and mixing")}
                      style={{ marginTop: "12px", background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)" }}
                    >
                      ✦ Plan a Studio Session with AI Concierge
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="chomka-ai-footer">
              <span>✦ silachomka AI · chomkaMUSIC™ & Chomka Nation</span>
              <span>POWERED BY SILACHOMKA ENGINE</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

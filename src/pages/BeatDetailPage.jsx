import { PlayIcon, PauseIcon, LeftArrowIcon, RightArrowIcon , UpRightArrowIcon, LightningIcon} from '../components/Icons';
// src/pages/BeatDetailPage.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import SeoHead from "../components/SeoHead";
import ShareLinkBox from "../components/ShareLinkBox";
import {
  absoluteUrl,
  getBeatProducer,
  getBeatSource,
} from "../data/credits";

export default function BeatDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const licenseParam = searchParams.get("license");
  const { beats } = useChomkaStore();

  /* Locate the authoritative beat */
  const beat = useMemo(() => {
    if (!Array.isArray(beats)) return null;
    return beats.find((item) => item.id === id || item.slug === id) || null;
  }, [beats, id]);

  /* Audio state */
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [durationTime, setDurationTime] = useState("0:00");

  /* Licensing State — defaults to exclusive if requested in URL */
  const [selectedLicense, setSelectedLicense] = useState(
    licenseParam === "exclusive" ? "exclusive" : "premium"
  );

  useEffect(() => {
    if (licenseParam === "exclusive") {
      const timer = setTimeout(() => {
        const offerEl = document.getElementById("offer-form");
        if (offerEl) {
          offerEl.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [licenseParam]);

  /* Offer form state */
  const [offerName, setOfferName] = useState("");
  const [offerEmail, setOfferEmail] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(false);
  const [offerError, setOfferError] = useState(null);

  /* Format seconds to M:SS */
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  /* Cleanup audio on unmount */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }
    };
  }, []);

  /* Audio play/pause toggle */
  const togglePlay = useCallback(() => {
    if (!beat?.audio) return;

    if (!audioRef.current) {
      const audio = new Audio(beat.audio);
      audioRef.current = audio;

      if ("mediaSession" in navigator) {
        const artSrc = beat.image
          ? window.location.origin + beat.image
          : window.location.origin + "/og-image.png";
        navigator.mediaSession.metadata = new MediaMetadata({
          title: beat.title,
          artist: "chomkaMUSIC\u2122 Studio",
          album: "chomkaMUSIC™ Studio Beats",
          artwork: [{ src: artSrc, sizes: "512x512", type: "image/jpeg" }],
        });
      }

      setIsLoading(true);

      audio.addEventListener("loadedmetadata", () => {
        setDurationTime(formatTime(audio.duration));
      });

      audio.addEventListener("timeupdate", () => {
        if (audio.duration) {
          setProgress(audio.currentTime / audio.duration);
          setCurrentTime(formatTime(audio.currentTime));
        }
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime("0:00");
      });

      audio.play()
        .then(() => { setIsLoading(false); setIsPlaying(true); })
        .catch(() => { setIsLoading(false); setIsPlaying(false); });
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [beat, isPlaying]);

  /* Seek handler */
  const handleSeek = (e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const nextProgress = Math.max(0, Math.min(clickX / rect.width, 1));
    audioRef.current.currentTime = nextProgress * audioRef.current.duration;
    setProgress(nextProgress);
  };

  const seekBackward = () => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    audioRef.current.currentTime = Math.max(0, ct - 5);
  };

  const seekForward = () => {
    if (!audioRef.current) return;
    const ct = audioRef.current.currentTime;
    const duration = audioRef.current.duration || 0;
    audioRef.current.currentTime = Math.min(duration, ct + 5);
  };

  /* Studio Licensing Framework Matrix with Naira prices */
  const LICENSES = {
    basic: {
      name: "Standard Lease",
      short: "Basic",
      price: "₦15,000",
      priceStatus: <><LightningIcon size={16} style={{ color: "#FFD700" }} /> Instant Selar Checkout</>,
      perks: [
        "✓ High-Quality MP3 Audio File",
        "✓ Non-Exclusive Commercial Distribution Rights",
        "✓ Credit: (Prod. silachomka)",
        "✓ Instant Delivery via Selar",
      ],
      btnText: "Purchase Standard Lease (₦15,000) on Selar",
    },
    premium: {
      name: "Premium WAV",
      short: "Premium",
      price: "₦30,000",
      priceStatus: <><LightningIcon size={16} style={{ color: "#FFD700" }} /> Instant Selar Checkout</>,
      perks: [
        "✓ 24-bit Studio Master WAV + MP3",
        "✓ Radio, Streaming & Performance Clearance",
        "✓ High-Definition Mix Delivery",
        "✓ Instant Delivery via Selar",
      ],
      btnText: "Purchase Premium WAV (₦30,000) on Selar",
    },
    ultimate: {
      name: "Trackout Stems",
      short: "Ultimate",
      price: "₦60,000",
      priceStatus: <><LightningIcon size={16} style={{ color: "#FFD700" }} /> Instant Selar Checkout</>,
      perks: [
        "✓ Full Multi-Track Audio Stems (WAV)",
        "✓ Complete Mix & Arrangement Control",
        "✓ Music Video & Sync Clearance",
        "✓ Instant Delivery via Selar",
      ],
      btnText: "Purchase Trackout Stems (₦60,000) on Selar",
    },
    exclusive: {
      name: "Exclusive Buyout",
      short: "Exclusive",
      price: "Private Studio Negotiation",
      priceStatus: "👑 100% Sole Ownership Buyout",
      perks: [
        "✓ 100% Sole Ownership Buyout",
        "✓ Beat Permanently Removed from Market",
        "✓ Full Master & Publishing Rights",
        "✓ Direct Studio Consultation with silachomka",
      ],
      btnText: "Submit Exclusive Acquisition Offer",
    },
  };

  const activeLicenseData = LICENSES[selectedLicense];

  /* 404 Fallback if beat not found */
  if (!beat) {
    return (
      <main className="beat-detail-view">
        <div style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}>
          <p className="eyebrow">silachomka / 404</p>
          <h1 className="beat-detail-title">Beat Not Found</h1>
          <p style={{ color: "var(--muted)", margin: "20px 0 35px" }}>
            The beat you requested does not exist in the official studio catalogue.
          </p>
          <Link className="primary-button" to="/beats">
            <LeftArrowIcon /> Back to All Beats
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="beat-detail-view">
      <SeoHead
        title={`${beat.title} | chomkaMUSIC™ Studio Beats | silachomka`}
        description={`${beat.title} is an original${beat.genre ? ` ${beat.genre}` : ""} instrumental by silachomka, available to listen to and license through chomkaMUSIC™ Studio.`}
        path={`/beats/${beat.id}`}
        image={beat.image || (beat.video ? beat.video.replace('.mp4', '.jpg') : null) || beat.ogImage || beat.cover || beat.thumbnail || beat.poster || "/og-image.png"}
        imageAlt={`${beat.title} beat by silachomka`}
      />
      {/* Breadcrumb Navigation */}
      <Link className="release-breadcrumb" to="/beats">
        <LeftArrowIcon /> All Beats
      </Link>

      <div className="beat-detail-grid">
        {/* =================================================
            LEFT COLUMN: VIDEO VISUALIZER & AUDIO CONTROLS
            ================================================= */}
        <div>
          <div className="beat-visualizer-card">
            {beat.video ? (
              beat.video.endsWith(".gif") ? (
                <img
                  src={beat.video}
                  alt={`${beat.title} visualizer`}
                  className="beat-visualizer-video"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <video
                  src={beat.video}
                  poster={beat.image}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="beat-visualizer-video"
                />
              )
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "var(--surface-2)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--gold)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {beat.title}
              </div>
            )}
          </div>

          {/* Audio Playback Bar */}
          <div
            style={{
              marginTop: "24px",
              padding: "20px 24px",
              background: "var(--surface)",
              border: "1px solid var(--line-gold)",
              borderRadius: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="beat-skip-btn"
                  onClick={seekBackward}
                  aria-label="Skip backward 5 seconds"
                >
                  -5s
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--gold)",
                    color: "var(--bg)",
                    border: "none",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 6px 20px var(--gold-glow)",
                    transition: "transform 180ms ease",
                  }}
                  aria-label={isLoading ? "Loading audio" : isPlaying ? "Pause audio preview" : "Play audio preview"}
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <div className="beat-detail-loading-spinner" aria-hidden="true" />
                  ) : (
                    isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />
                  )}
                </button>
                <button
                  type="button"
                  className="beat-skip-btn"
                  onClick={seekForward}
                  aria-label="Skip forward 5 seconds"
                >
                  +5s
                </button>
              </div>

              <div style={{ flex: 1 }}>
                <div
                  onClick={handleSeek}
                  style={{
                    height: "8px",
                    background: "rgba(223, 194, 125, 0.15)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  role="progressbar"
                  aria-valuenow={Math.round(progress * 100)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    style={{
                      width: `${progress * 100}%`,
                      height: "100%",
                      background: "var(--gold)",
                      borderRadius: "4px",
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    color: "var(--gold)",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  <span>{currentTime}</span>
                  <span>{durationTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Production Specs */}
          <div className="beat-specs-bar">
            <span className="spec-badge">BPM: {beat.bpm || "125 BPM"}</span>
            <span className="spec-badge">Key: {beat.key || "C Minor"}</span>
            <span className="spec-badge">Genre: {beat.genre || "Afro-Fusion"}</span>
            <span className="spec-badge">Audio: 24-bit / 44.1kHz</span>
            <span className="spec-badge">Stems: Available on Request</span>
          </div>
        </div>

        {/* =================================================
            RIGHT COLUMN: BEAT DETAILS, LICENSING & INQUIRY
            ================================================= */}
        <div>
          <p className="eyebrow">chomkaMUSIC™ Studio Catalogue</p>

          <h1 className="beat-detail-title">{beat.title}</h1>

          <p className="credit-line beat-detail-credits">
            Produced by {getBeatProducer(beat)}
            <span className="credit-dot">·</span>
            Source: {getBeatSource(beat)}
          </p>

          <p style={{ color: "var(--gold)", fontSize: "15px", fontWeight: 700, margin: "10px 0 20px" }}>
            Studio Production × Custom Licensing
          </p>

          <ShareLinkBox url={absoluteUrl(`/beats/${beat.id}`)} />

          <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.7", marginBottom: "30px" }}>
            Original studio production composed and engineered by <strong>silachomka</strong> under chomkaMUSIC™. Suitable for commercial release, sync licensing, broadcast, and artist collaborations.
          </p>

          {/* ===============================================
              DYNAMIC LICENSING SELECTOR ENGINE
              =============================================== */}
          <div className="licensing-selector-container">
            <div className="platform-section-title">Licensing Options</div>
            
            {/* Tabs */}
            <div className="license-tabs" role="tablist">
              {Object.keys(LICENSES).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selectedLicense === key}
                  className={`license-tab ${selectedLicense === key ? "is-active" : ""}`}
                  onClick={() => setSelectedLicense(key)}
                >
                  {LICENSES[key].short}
                </button>
              ))}
            </div>

            {/* Dynamic Content */}
            <div className="license-details" key={selectedLicense} role="tabpanel">
              <h3 className="license-type-name">{activeLicenseData.name}</h3>
              
              <div className="license-price-row">
                <span className="license-price-value">{activeLicenseData.price}</span>
                <span className="license-status-badge">{activeLicenseData.priceStatus}</span>
              </div>
              
              <ul className="license-perks-list">
                {activeLicenseData.perks.map((perk, index) => (
                  <li key={index}>{perk}</li>
                ))}
              </ul>

              {beat.selar?.[selectedLicense] ? (
                <a 
                  href={beat.selar[selectedLicense]} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="license-buy-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  {activeLicenseData.btnText} <UpRightArrowIcon size={16} />
                </a>
              ) : (
                <a 
                  href="#offer-form" 
                  className="license-buy-btn"
                >
                  {activeLicenseData.btnText} <RightArrowIcon />
                </a>
              )}
            </div>
          </div>

          {/* ===============================================
              STUDIO INQUIRY & EXCLUSIVE OFFER FORM
              =============================================== */}
          <div
            id="offer-form"
            style={{
              padding: "35px",
              background: "var(--surface)",
              border: "1px solid var(--line-gold)",
              borderRadius: "6px",
              boxShadow: "0 15px 45px rgba(0, 0, 0, 0.4)",
            }}
          >
            <p className="eyebrow">Exclusive Buyout Inquiry</p>
            <h2 style={{ margin: "0 0 12px", fontSize: "26px", color: "var(--text)", fontFamily: "var(--font-display)" }}>
              Exclusive Acquisition
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: "1.6", marginBottom: "25px" }}>
              Standard, Premium, and Trackout licenses for <strong>{beat.title}</strong> can be purchased instantly above with direct delivery on Selar. Use this form exclusively to negotiate an <strong style={{ color: "var(--text)" }}>Exclusive Buyout</strong> — full ownership transfer, custom terms, and stem delivery.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setOfferSubmitting(true);
                setOfferError(null);
                try {
                  const res = await fetch("https://formspree.io/f/xljerwko", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({
                      name: offerName,
                      email: offerEmail,
                      beat: beat.title,
                      beat_url: absoluteUrl(`/beats/${beat.id}`),
                      license: "Exclusive Buyout",
                      message: offerMessage,
                    }),
                  });
                  if (res.ok) {
                    setOfferSubmitted(true);
                  } else {
                    const data = await res.json().catch(() => ({}));
                    setOfferError(data?.error || "Submission failed. Please try again.");
                  }
                } catch {
                  setOfferError("Network error. Check your connection and try again.");
                } finally {
                  setOfferSubmitting(false);
                }
              }}
              className="negotiation-form"
            >
              {offerSubmitted ? (
                <div style={{
                  padding: "28px 24px",
                  background: "rgba(212, 175, 55, 0.08)",
                  border: "1px solid var(--line-gold)",
                  borderRadius: "6px",
                  textAlign: "center",
                }}>
                  <p style={{ fontSize: "22px", margin: "0 0 8px", color: "var(--gold)" }}>✓ Inquiry Sent</p>
                  <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
                    Your licensing inquiry for <strong style={{ color: "var(--text)" }}>{beat.title}</strong> has been received.
                    chomkaMUSIC™ Studio will be in touch at <strong style={{ color: "var(--text)" }}>{offerEmail}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="negotiation-form-row">
                    <input
                      type="text"
                      required
                      placeholder="Your Name / Artist Name"
                      value={offerName}
                      onChange={(e) => setOfferName(e.target.value)}
                      className="negotiation-input"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={offerEmail}
                      onChange={(e) => setOfferEmail(e.target.value)}
                      className="negotiation-input"
                    />
                  </div>

                  <textarea
                    placeholder="Project details, intended release date, or custom arrangement / stem requirements..."
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    className="negotiation-textarea"
                  />

                  {offerError && (
                    <p style={{
                      color: "#e05c5c",
                      fontSize: "13px",
                      margin: "0 0 10px",
                      padding: "10px 14px",
                      background: "rgba(224, 92, 92, 0.08)",
                      border: "1px solid rgba(224, 92, 92, 0.3)",
                      borderRadius: "4px",
                    }}>
                      ⚠ {offerError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="primary-button"
                    style={{ width: "100%", marginTop: "10px", opacity: offerSubmitting ? 0.6 : 1 }}
                    disabled={offerSubmitting}
                  >
                    {offerSubmitting ? "Sending…" : <><span>Draft Studio Licensing Inquiry</span> <RightArrowIcon size={14} /></>}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCookieConsent } from "../data/CookieConsentContext";

export default function CookieConsentBanner() {
  const location = useLocation();
  const {
    preferences,
    isBannerVisible,
    isModalOpen,
    acceptAll,
    rejectOptional,
    savePreferences,
    openCookieSettings,
    closeCookieSettings,
  } = useCookieConsent();

  const [draft, setDraft] = useState(preferences);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences, isModalOpen]);

  const isAdminRoute = location.pathname.startsWith("/admin");
  if (isAdminRoute && !isModalOpen) return null;

  return (
    <>
      {isBannerVisible && (
        <aside
          className="cookie-consent-banner"
          role="region"
          aria-label="Cookie consent notice"
        >
          <div className="cookie-consent-copy">
            <p className="cookie-consent-title">Privacy & Cookie Preferences</p>
            <p className="cookie-consent-text">
              We use essential storage to keep the site reliable and remember your currency and playback settings, plus optional preferences for embedded social media and analytics. Read our{" "}
              <Link to="/privacy">Privacy Policy</Link> and{" "}
              <Link to="/cookies">Cookie Policy</Link>.
            </p>
          </div>

          <div className="cookie-consent-actions">
            <button
              type="button"
              className="cookie-btn cookie-btn-accept"
              onClick={acceptAll}
            >
              Accept All
            </button>
            <button
              type="button"
              className="cookie-btn cookie-btn-reject"
              onClick={rejectOptional}
            >
              Reject Optional
            </button>
            <button
              type="button"
              className="cookie-btn cookie-btn-manage"
              onClick={openCookieSettings}
            >
              Manage Preferences
            </button>
          </div>
        </aside>
      )}

      {isModalOpen && (
        <div
          className="cookie-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Cookie Preferences"
          onClick={closeCookieSettings}
        >
          <div
            className="cookie-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow" style={{ marginBottom: 4 }}>
              CHOMKA NATION PRIVACY CONTROLS
            </p>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "var(--gold)" }}>
              Cookie & Storage Preferences
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
              Configure how silachomka uses browser storage and third-party embeds. Essential cookies are always active to deliver core audio, security, and session functionality.
            </p>

            <div className="cookie-category-row">
              <div className="cookie-category-info">
                <h4>Essential (Strictly Necessary)</h4>
                <p>
                  Required for security, authentication, consent storage, and core audio/media delivery.
                </p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap" }}>
                ALWAYS ACTIVE
              </span>
            </div>

            <div className="cookie-category-row">
              <div className="cookie-category-info">
                <h4>Functional Preferences</h4>
                <p>
                  Remembers your selected display currency (NGN, USD, GBP, EUR) and player preferences.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(draft.functional)}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, functional: e.target.checked }))
                }
                aria-label="Functional Preferences"
                style={{ width: 18, height: 18, accentColor: "var(--gold)", cursor: "pointer" }}
              />
            </div>

            <div className="cookie-category-row">
              <div className="cookie-category-info">
                <h4>Embedded Media (YouTube, Instagram, X)</h4>
                <p>
                  Allows interactive third-party embeds in Music Videos and Gallery social posts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(draft.embeddedMedia)}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, embeddedMedia: e.target.checked }))
                }
                aria-label="Embedded Media"
                style={{ width: 18, height: 18, accentColor: "var(--gold)", cursor: "pointer" }}
              />
            </div>

            <div className="cookie-category-row" style={{ borderBottom: "none" }}>
              <div className="cookie-category-info">
                <h4>Analytics & Performance</h4>
                <p>
                  Helps us understand aggregate catalogue visits and audio engagement. Disabled until you opt in.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(draft.analytics)}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, analytics: e.target.checked }))
                }
                aria-label="Analytics and Performance"
                style={{ width: 18, height: 18, accentColor: "var(--gold)", cursor: "pointer" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="cookie-btn cookie-btn-reject"
                onClick={rejectOptional}
              >
                Reject Optional
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-manage"
                onClick={() => savePreferences(draft)}
              >
                Save Preferences
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-accept"
                onClick={acceptAll}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

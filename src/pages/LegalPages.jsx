import { Link } from "react-router-dom";
import SeoHead from "../components/SeoHead";
import { useCookieConsent } from "../data/CookieConsentContext";

export function PrivacyPolicyPage() {
  const { openCookieSettings } = useCookieConsent();

  return (
    <main className="legal-page-view">
      <SeoHead
        title="Privacy Policy — silachomka"
        description="Privacy Policy for silachomka, chomkaMUSIC™, and Chomka Nation."
        path="/privacy"
      />
      <div className="legal-page-card">
        <p className="eyebrow">CHOMKA NATION LEGAL</p>
        <h1>Privacy Policy</h1>
        <p>Last updated: October 2026</p>

        <h2>1. Overview</h2>
        <p>
          This Privacy Policy explains how <strong>silachomka</strong>, <strong>chomkaMUSIC™</strong>, and <strong>Chomka Nation</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collect, use, and safeguard information when you visit <code>silachomka.vercel.app</code>, stream music or beat previews, view gallery media, or subscribe to artist updates.
        </p>

        <h2>2. Information We Collect</h2>
        <ul>
          <li>
            <strong>Newsletter &amp; Fan Updates:</strong> When you voluntarily subscribe via our newsletter form, we store your email address, optional name, and subscription timestamp in our database to queue official release and catalogue notifications.
          </li>
          <li>
            <strong>Exclusive Beat Negotiation Inquiries:</strong> When you submit an exclusive beat buyout offer, your name, email address, selected beat, and offer message are transmitted to our studio booking inbox.
          </li>
          <li>
            <strong>Local Browser Preferences:</strong> We store your cookie consent choices (<code>silachomka_cookie_consent_v1</code>), selected display currency (<code>chomka_preferred_currency</code>), and beat preview mode (<code>chomka_beat_playback_mode</code>) in your browser&apos;s <code>localStorage</code>.
          </li>
          <li>
            <strong>Beat Licensing &amp; Checkout:</strong> Non-exclusive beat purchases (Basic, Premium WAV, Trackout Stems) are processed on our official Selar storefront (<code>selar.com/m/chomkamusicstudio</code>). Payment details are handled directly by Selar under their privacy and security standards.
          </li>
        </ul>

        <h2>3. How We Use Information</h2>
        <p>
          We use collected data strictly to operate the catalogue, deliver audio/video streams, remember your currency and playback settings, respond to licensing inquiries, and queue opt-in release updates. We do not run third-party advertising trackers or sell personal data.
        </p>

        <h2>4. Embedded Third-Party Content</h2>
        <p>
          Release pages, music videos, and gallery posts may include embedded players or links from Spotify, YouTube, Instagram, or X. If you reject optional embedded media in your Cookie Settings, third-party player iframes on release and social post cards remain paused until you enable them.
        </p>

        <h2>5. Operator &amp; Contact Information</h2>
        <p>
          This platform is operated for artist identity <strong>silachomka</strong> (Samuel John-Ibro) under <strong>chomkaMUSIC™</strong> and <strong>Chomka Nation</strong>. No separate corporate registration number, physical postal address, or external Data Protection Officer has been designated in this automated technical notice; formal entity registration or postal notice details must be supplied directly by the platform owner if required by local jurisdiction.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <button type="button" className="cookie-btn cookie-btn-manage" onClick={openCookieSettings}>
            Manage Cookie Settings
          </button>
          <Link to="/cookies" className="cookie-btn cookie-btn-reject" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            View Cookie Policy
          </Link>
          <Link to="/" className="cookie-btn cookie-btn-reject" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export function CookiePolicyPage() {
  const { openCookieSettings } = useCookieConsent();

  return (
    <main className="legal-page-view">
      <SeoHead
        title="Cookie Policy — silachomka"
        description="Cookie & Browser Storage Policy for silachomka."
        path="/cookies"
      />
      <div className="legal-page-card">
        <p className="eyebrow">CHOMKA NATION LEGAL</p>
        <h1>Cookie Policy</h1>
        <p>Last updated: October 2026</p>

        <h2>1. How We Use Cookies &amp; Local Storage</h2>
        <p>
          <strong>silachomka</strong> uses lightweight browser storage (`localStorage` and session cookies) to keep playback responsive, remember your display currency, and respect your privacy preferences.
        </p>

        <h2>2. Categories of Storage</h2>
        <ul>
          <li>
            <strong>Essential (Strictly Necessary):</strong> Stores your cookie consent decision (<code>silachomka_cookie_consent_v1</code>), local catalogue cache keys (<code>silachomka_store_*</code>), and for authenticated studio administrators only, an HttpOnly session cookie (<code>silachomka_admin_session</code>) and CMS draft recovery keys (<code>chomka_cms_draft_*</code>).
          </li>
          <li>
            <strong>Functional Preferences:</strong> Remembers your preferred display currency (<code>chomka_preferred_currency</code>) and beat preview length preference (<code>chomka_beat_playback_mode</code>).
          </li>
          <li>
            <strong>Embedded Media:</strong> Controls whether third-party iframes from Spotify, YouTube, Instagram, and X load automatically on release and gallery views.
          </li>
          <li>
            <strong>Analytics (Opt-In Only):</strong> Optional aggregate traffic measurement, disabled by default unless you explicitly opt in. No third-party marketing pixels are loaded by default.
          </li>
        </ul>

        <h2>3. Managing Your Preferences</h2>
        <p>
          You can review or change your consent choices at any time using the button below or the &ldquo;Cookie Settings&rdquo; link in the site footer.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <button type="button" className="cookie-btn cookie-btn-accept" onClick={openCookieSettings}>
            Open Cookie Settings
          </button>
          <Link to="/privacy" className="cookie-btn cookie-btn-reject" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link to="/" className="cookie-btn cookie-btn-reject" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export function TermsOfUsePage() {
  return (
    <main className="legal-page-view">
      <SeoHead
        title="Terms of Use — silachomka"
        description="Terms of Use and Beat Licensing Notice for silachomka and chomkaMUSIC™."
        path="/terms"
      />
      <div className="legal-page-card">
        <p className="eyebrow">CHOMKA NATION LEGAL</p>
        <h1>Terms of Use</h1>
        <p>Last updated: October 2026</p>

        <h2>1. Intellectual Property</h2>
        <p>
          All musical works, sound recordings, instrumentals, beats, visual artwork, photography, videos, and brand identifiers on this website are the intellectual property of <strong>silachomka</strong>, <strong>chomkaMUSIC™</strong>, and <strong>Chomka Nation</strong> unless otherwise credited.
        </p>

        <h2>2. Audio Previews &amp; Streaming</h2>
        <p>
          Audio previews (including 30-second upcoming release previews and beat store streams) are provided strictly for personal listening and evaluation. Unauthorized ripping, redistribution, or commercial use of preview audio is prohibited.
        </p>

        <h2>3. Beat Store &amp; Licensing</h2>
        <p>
          Beat licenses (Basic Lease, Premium Lease, Unlimited Lease, and Exclusive Rights) are fulfilled via our official Selar store. License rights are governed by the tier selected at checkout. NGN prices listed on Selar are authoritative; converted currencies (USD, GBP, EUR) are provided as live reference estimates.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <Link to="/privacy" className="cookie-btn cookie-btn-reject" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link to="/cookies" className="cookie-btn cookie-btn-reject" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Cookie Policy
          </Link>
          <Link to="/" className="cookie-btn cookie-btn-reject" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

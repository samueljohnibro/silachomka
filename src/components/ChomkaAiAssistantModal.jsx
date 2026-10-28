import { useState, useEffect, useMemo, useRef, useCallback, Component } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChomkaStore, refreshCatalogue } from "../data/store";
import { useCurrency } from "../data/CurrencyContext";
import { useAdminAuth } from "../pages/admin/AdminAuthProvider";
import { adminApi } from "../data/adminApi";

// Local Error Boundary to ensure modal issues never bubble to RootErrorBoundary
class ModalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Chomka AI Assistant caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chomka-ai-empty-state" style={{ padding: "40px 20px", textAlign: "center" }}>
          <p className="chomka-ai-empty-title" style={{ color: "var(--gold)" }}>SEARCH INDEX RESYNCHRONIZING</p>
          <p className="chomka-ai-empty-desc">
            The AI assistant encountered a temporary format discrepancy in the query index.
          </p>
          <button
            type="button"
            className="studio-pill-btn"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (typeof this.props.onReset === "function") this.props.onReset();
            }}
            style={{ marginTop: "16px", background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)" }}
          >
            Reset Query & Continue
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Safely extract string tokens from strings, arrays, or metadata objects
function safeExtractTokens(item) {
  if (!item) return [];
  if (Array.isArray(item)) {
    return item.flatMap((x) => {
      if (typeof x === "string") return [x];
      if (x && typeof x === "object") return [x.name, x.title, x.label, x.tag].filter(Boolean).map(String);
      return [String(x || "")];
    }).filter(Boolean);
  }
  if (typeof item === "string") {
    return item.split(/[,\s#]+/).filter(Boolean);
  }
  if (typeof item === "object") {
    return Object.values(item)
      .filter((v) => typeof v === "string" || typeof v === "number")
      .map(String);
  }
  return [String(item)];
}

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

// Admin workspace modules catalogue for Administrative AI search & navigation
const ADMIN_MODULES = [
  {
    slug: "dashboard",
    title: "System Overview",
    path: "/admin",
    icon: "📊",
    desc: "CMS overview metrics, aggregate database counts, and live system status.",
    keywords: ["dashboard", "overview", "stats", "metrics", "system", "summary", "home"],
  },
  {
    slug: "services",
    title: "Services & Studio Orders",
    path: "/admin/services",
    icon: "🎛️",
    desc: "Manage studio service catalogue, rates, availability calendar, and client orders.",
    keywords: ["services", "orders", "bookings", "sessions", "studio", "schedule", "calendar", "availability"],
  },
  {
    slug: "events",
    title: "Events Management",
    path: "/admin/events",
    icon: "🎟️",
    desc: "Create, edit, and publish live concerts, tour dates, and ticketing passes.",
    keywords: ["events", "tour", "concert", "concerts", "live", "tickets", "shows", "venue"],
  },
  {
    slug: "gallery",
    title: "Gallery Archive",
    path: "/admin/gallery",
    icon: "📸",
    desc: "Curate visual moments, photo categories, and event highlights.",
    keywords: ["gallery", "photos", "visuals", "moments", "archive", "categories"],
  },
  {
    slug: "music",
    title: "Music Releases",
    path: "/admin/music",
    icon: "🎵",
    desc: "Manage official EP, single, and album discography releases.",
    keywords: ["music", "releases", "album", "albums", "ep", "singles", "discography"],
  },
  {
    slug: "tracks",
    title: "Tracks Management",
    path: "/admin/tracks",
    icon: "🎹",
    desc: "Individual audio tracks, stream links, lyrics, and production credits.",
    keywords: ["tracks", "songs", "audio", "lyrics", "credits", "isrc"],
  },
  {
    slug: "beats",
    title: "Beats Management",
    path: "/admin/beats",
    icon: "🥁",
    desc: "Curate instrumental catalogue, BPM, genre, key, audio previews, and Selar URLs.",
    keywords: ["beats", "instrumentals", "producer", "selar", "bpm", "wav", "mp3", "leases"],
  },
  {
    slug: "videos",
    title: "Music Videos",
    path: "/admin/videos",
    icon: "🎬",
    desc: "Manage YouTube & platform video embeds, teasers, and featured artists.",
    keywords: ["videos", "music videos", "youtube", "visualizers", "director"],
  },
  {
    slug: "media",
    title: "Media Asset Library",
    path: "/admin/media",
    icon: "📁",
    desc: "Direct R2 bucket uploads, image optimization, audio previews, and asset picker.",
    keywords: ["media", "assets", "upload", "r2", "storage", "images", "covers", "files"],
  },
  {
    slug: "links",
    title: "Social Links",
    path: "/admin/links",
    icon: "🔗",
    desc: "Update official Chomka links, DSP profiles, and smart landing destinations.",
    keywords: ["links", "socials", "smart links", "spotify", "apple", "instagram", "tiktok"],
  },
  {
    slug: "merchandise",
    title: "Merchandise CMS",
    path: "/admin/merchandise",
    icon: "🛍️",
    desc: "Apparel, vinyl, accessories, stock status, and external storefront links.",
    keywords: ["merch", "merchandise", "apparel", "store", "shirts", "vinyl"],
  },
  {
    slug: "subscribers",
    title: "Subscribers & Broadcasts",
    path: "/admin/subscribers",
    icon: "📬",
    desc: "View active newsletter subscribers, consent records, and notification dispatches.",
    keywords: ["subscribers", "newsletter", "emails", "broadcasts", "notifications", "fans"],
  },
  {
    slug: "recycle-bin",
    title: "Recycle Bin",
    path: "/admin/recycle-bin",
    icon: "🗑️",
    desc: "Soft-deleted records, one-click restoration, and 60-day automated/manual purge.",
    keywords: ["recycle bin", "trash", "deleted", "restore", "purge", "recovery"],
  },
  {
    slug: "settings",
    title: "Admin Settings",
    path: "/admin/settings",
    icon: "⚙️",
    desc: "Authentication credentials, API configurations, and system preferences.",
    keywords: ["settings", "preferences", "config", "account", "security"],
  },
];

// Levenshtein edit distance for fuzzy typo correction (bounded for performance & stability)
function levenshteinDistance(s1, s2) {
  const a = String(s1 || "").toLowerCase();
  const b = String(s2 || "").toLowerCase();
  if (!a) return b.length;
  if (!b) return a.length;
  if (a === b) return 0;

  const cleanA = a.slice(0, 80);
  const cleanB = b.slice(0, 80);

  const matrix = [];
  for (let i = 0; i <= cleanB.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= cleanA.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= cleanB.length; i++) {
    for (let j = 1; j <= cleanA.length; j++) {
      if (cleanB.charAt(i - 1) === cleanA.charAt(j - 1)) {
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
  return matrix[cleanB.length][cleanA.length];
}

// Calculate similarity ratio 0..1
function fuzzyMatchScore(term, target) {
  if (!term || !target) return 0;
  const t = String(term).toLowerCase().trim();
  const g = String(target).toLowerCase().trim();
  if (!t || !g) return 0;
  if (g.includes(t)) return 1.0;
  if (t.length < 3) return 0; // Skip fuzzy match for very short tokens

  const dist = levenshteinDistance(t, g.slice(0, 60));
  const maxLen = Math.max(t.length, Math.min(g.length, 60));
  return maxLen === 0 ? 1 : Math.max(0, 1 - dist / maxLen);
}

// Parse conversational booking stories into configured order drafts
function parseConversationalBooking(text) {
  if (typeof text !== "string") return null;
  const normalized = text.toLowerCase();
  const detectedServices = [];

  // Extract hours if mentioned (e.g., "4 hours", "3 hrs")
  let hours = 2;
  const hourMatch = normalized.match(/(\d+)\s*(?:hour|hours|hr|hrs)/);
  if (hourMatch) {
    hours = Math.max(1, parseInt(hourMatch[1], 10) || 2);
  }

  // Extract tracks count if mentioned (e.g., "2 songs", "3 tracks")
  let tracks = 1;
  const trackMatch = normalized.match(/(\d+)\s*(?:song|songs|track|tracks|beat|beats)/);
  if (trackMatch) {
    tracks = Math.max(1, parseInt(trackMatch[1], 10) || 1);
  }

  // Match against services
  for (const svc of STUDIO_SERVICE_CATALOGUE) {
    const isMatched = Array.isArray(svc.keywords) && svc.keywords.some((k) => normalized.includes(k));
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
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("chomka_ai_recent_queries");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 5);
      }
    } catch {
      // Ignore localStorage access failures
    }
    return [];
  });
  const [isAutoExpanded, setIsAutoExpanded] = useState(false);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Safely extract admin authentication context
  let authContext = {};
  try {
    authContext = useAdminAuth() || {};
  } catch {
    authContext = {};
  }
  const { isAuthenticated = false, user = null } = authContext;

  // Exact user requirements:
  // 1. "When I'm in the admin site, the AI should allow me to perform administrative tasks and processes."
  // 2. "When I'm also in the admin login, I can see that the AI is available there. So I want you to make that particular AI to be the normal AI for the public page that does not do administrative stuff."
  // 3. "So it's only when I've logged in successfully that the AI should have the ability to do administrative tasks."
  const isAdminPath = location.pathname.startsWith("/admin");
  const isLoginPage = location.pathname === "/admin/login" || location.pathname.startsWith("/admin/login");
  const isSuccessfullyLoggedInAdmin = Boolean(isAuthenticated && user);

  // Administrative AI is unlocked ONLY when logged in successfully AND inside the admin site AND NOT on login page!
  const isEligibleForAdminAi = isSuccessfullyLoggedInAdmin && isAdminPath && !isLoginPage;

  // Active mode toggle ("admin" | "public")
  const [activeConsoleMode, setActiveConsoleMode] = useState("admin");
  const effectiveMode = isEligibleForAdminAi ? activeConsoleMode : "public";
  const isAdminMode = effectiveMode === "admin";

  // Admin CMS Live Data & Stats
  const [adminStats, setAdminStats] = useState({
    events: 0,
    releases: 0,
    tracks: 0,
    beats: 0,
    videos: 0,
    gallery: 0,
    links: 0,
    subscribers: 0,
    recycleBin: 0,
    orders: 0,
  });
  const [isAdminDataLoading, setIsAdminDataLoading] = useState(false);
  const [recycleBinItems, setRecycleBinItems] = useState([]);
  const [adminSubscribers, setAdminSubscribers] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);

  // Process execution states
  const [isPurgingTrash, setIsPurgingTrash] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);
  const [isRestoringId, setIsRestoringId] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [catalogueSyncStatus, setCatalogueSyncStatus] = useState("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [subscriberDeleteLoadingId, setSubscriberDeleteLoadingId] = useState(null);
  const [subscriberDeleteResult, setSubscriberDeleteResult] = useState(null);

  // Fetch admin metrics & data strictly when authenticated and inside admin site
  const fetchAdminData = useCallback(async () => {
    if (!isEligibleForAdminAi) return;
    setIsAdminDataLoading(true);
    try {
      const [
        eventsRes,
        releasesRes,
        tracksRes,
        beatsRes,
        videosRes,
        galleryRes,
        linksRes,
        recycleRes,
        subsRes,
        ordersRes,
      ] = await Promise.allSettled([
        adminApi.getEvents(),
        adminApi.getReleases(),
        adminApi.getTracks(),
        adminApi.getBeats(),
        adminApi.getVideos(),
        adminApi.getGallery(),
        adminApi.getSocialLinks(),
        adminApi.getRecycleBin(),
        adminApi.getSubscribers(),
        fetch("/api/admin/service-orders").then((r) => (r.ok ? r.json() : [])),
      ]);

      const evts = eventsRes.status === "fulfilled" && Array.isArray(eventsRes.value) ? eventsRes.value : [];
      const rels = releasesRes.status === "fulfilled" && Array.isArray(releasesRes.value) ? releasesRes.value : [];
      const trks = tracksRes.status === "fulfilled" && Array.isArray(tracksRes.value) ? tracksRes.value : [];
      const bts = beatsRes.status === "fulfilled" && Array.isArray(beatsRes.value) ? beatsRes.value : [];
      const vids = videosRes.status === "fulfilled" && Array.isArray(videosRes.value) ? videosRes.value : [];
      const gals = galleryRes.status === "fulfilled" && Array.isArray(galleryRes.value) ? galleryRes.value : [];
      const lnks = linksRes.status === "fulfilled" && Array.isArray(linksRes.value) ? linksRes.value : [];
      const rcy = recycleRes.status === "fulfilled" && Array.isArray(recycleRes.value) ? recycleRes.value : [];
      const sbs = subsRes.status === "fulfilled" && Array.isArray(subsRes.value) ? subsRes.value : [];
      const ords = ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value) ? ordersRes.value : [];

      setRecycleBinItems(rcy);
      setAdminSubscribers(sbs);
      setAdminOrders(ords);

      setAdminStats({
        events: evts.length,
        releases: rels.length,
        tracks: trks.length,
        beats: bts.length,
        videos: vids.length,
        gallery: gals.length,
        links: lnks.length,
        subscribers: sbs.filter((s) => s.status === "ACTIVE").length,
        recycleBin: rcy.length,
        orders: ords.length,
      });
    } catch (err) {
      console.warn("Chomka Admin AI metrics fetch discrepancy:", err);
    } finally {
      setIsAdminDataLoading(false);
    }
  }, [isEligibleForAdminAi]);

  // Load admin data whenever modal is opened while in eligible admin mode
  useEffect(() => {
    if (isOpen && isEligibleForAdminAi) {
      fetchAdminData();
    }
  }, [isOpen, isEligibleForAdminAi, fetchAdminData]);

  // Administrative Process Handlers
  const handlePurgeExpired = async () => {
    setIsPurgingTrash(true);
    setPurgeResult(null);
    try {
      const res = await adminApi.purgeExpired();
      const count = res?.purgedCount ?? 0;
      setPurgeResult(`Purged ${count} expired records older than 60 days.`);
      await fetchAdminData();
      await refreshCatalogue();
    } catch (err) {
      setPurgeResult(`Purge failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsPurgingTrash(false);
    }
  };

  const handleRestoreItem = async (table, id, title) => {
    setIsRestoringId(id);
    setRestoreResult(null);
    try {
      await adminApi.restoreItem(table, id);
      setRestoreResult(`Successfully restored "${title || id}" back to active catalogue.`);
      await fetchAdminData();
      await refreshCatalogue();
    } catch (err) {
      setRestoreResult(`Restore failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsRestoringId(null);
    }
  };

  const handleSyncCatalogue = async () => {
    setCatalogueSyncStatus("syncing");
    try {
      await refreshCatalogue();
      setLastSyncedTime(new Date().toLocaleTimeString());
      setCatalogueSyncStatus("synced");
      await fetchAdminData();
    } catch (err) {
      setCatalogueSyncStatus("error");
    }
  };

  const handleDeleteSubscriber = async (subId, email) => {
    if (!window.confirm(`Are you sure you want to delete subscriber ${email}?`)) return;
    setSubscriberDeleteLoadingId(subId);
    setSubscriberDeleteResult(null);
    try {
      await adminApi.deleteSubscriber(subId);
      setSubscriberDeleteResult(`Deleted subscriber ${email}.`);
      await fetchAdminData();
    } catch (err) {
      setSubscriberDeleteResult(`Delete failed: ${err.message || "Unknown error"}`);
    } finally {
      setSubscriberDeleteLoadingId(null);
    }
  };

  const handleAdminNavigate = (path, term) => {
    if (term) saveQuery(term);
    setIsOpen(false);
    navigate(path);
  };

  // Auto-expand teaser after 10 seconds on the site, display full label for ~4.5 seconds, then collapse to circle
  useEffect(() => {
    let collapseTimer;
    const expandTimer = setTimeout(() => {
      setIsAutoExpanded(true);
      collapseTimer = setTimeout(() => {
        setIsAutoExpanded(false);
      }, 4500);
    }, 10000);

    return () => {
      clearTimeout(expandTimer);
      if (collapseTimer) clearTimeout(collapseTimer);
    };
  }, []);

  const store = useChomkaStore();
  const releases = useMemo(() => (Array.isArray(store?.releases) ? store.releases : []), [store]);
  const beats = useMemo(() => (Array.isArray(store?.beats) ? store.beats : []), [store]);
  const gallery = useMemo(() => (Array.isArray(store?.gallery) ? store.gallery : []), [store]);
  const events = useMemo(() => (Array.isArray(store?.events) ? store.events : []), [store]);

  const currencyCtx = useCurrency();
  const currency = currencyCtx?.currency || "NGN";

  const formatAmount = useCallback((num) => {
    if (!Number.isFinite(num)) return "";
    if (currency === "USD") return `$${Number(num).toLocaleString()}`;
    return `₦${Number(num).toLocaleString()}`;
  }, [currency]);

  const saveQuery = useCallback((text) => {
    if (!text || typeof text !== "string" || text.trim().length < 2) return;
    try {
      const trimmed = text.trim();
      const updated = [trimmed, ...recentSearches.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("chomka_ai_recent_queries", JSON.stringify(updated));
    } catch {
      // Ignore localStorage write failures
    }
  }, [recentSearches]);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K or / to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
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
    try {
      if (!query || query.trim().length < 8) return null;
      const isConversational =
        /(book|session|record|hours?|mix|master|consult|custom|beat|produce|tracks?|price|cost|how much|want to|hire)/i.test(query);
      if (!isConversational) return null;
      return parseConversationalBooking(query);
    } catch {
      return null;
    }
  }, [query]);

  // Multi-entity Typo-Tolerant Search Engine
  const searchResults = useMemo(() => {
    try {
      const trimmed = (query || "").trim().toLowerCase();
      if (!trimmed) {
        return {
          hasQuery: false,
          beats: beats.slice(0, 3),
          releases: releases.slice(0, 2),
          services: STUDIO_SERVICE_CATALOGUE,
          events: events.slice(0, 2),
          gallery: gallery.slice(0, 3),
          suggestedTerm: null,
          totalCount: 0,
        };
      }

      const queryTokens = trimmed.split(/\s+/).filter(Boolean);

      // Score function across multiple attributes safely
      const scoreItem = (strings) => {
        if (!Array.isArray(strings)) return 0;
        let maxScore = 0;
        for (const raw of strings) {
          if (raw == null) continue;
          const low = String(raw).toLowerCase().trim();
          if (!low) continue;
          // Exact containment of full query
          if (low.includes(trimmed)) return 1.0;
          // Token matches
          for (const token of queryTokens) {
            if (!token) continue;
            if (low.includes(token)) {
              maxScore = Math.max(maxScore, 0.85);
            } else if (token.length >= 3 && low.length <= 100) {
              const fScore = fuzzyMatchScore(token, low);
              if (fScore > 0.65) maxScore = Math.max(maxScore, fScore * 0.8);
            }
          }
        }
        return maxScore;
      };

      // Filter & score beats
      const matchedBeats = beats
        .map((b) => {
          if (!b) return null;
          const tags = safeExtractTokens(b.tags);
          const strings = [b.title, b.genre, b.mood, b.key, b.bpm ? `${b.bpm} bpm` : "", ...tags];
          return { item: b, score: scoreItem(strings) };
        })
        .filter((x) => x && x.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      // Filter & score releases
      const matchedReleases = releases
        .map((r) => {
          if (!r) return null;
          const tracks = Array.isArray(r.tracks) ? r.tracks : (Array.isArray(r.tracklist) ? r.tracklist : []);
          const trackTitles = tracks.map((t) => (typeof t === "string" ? t : t?.title || "")).filter(Boolean);
          const strings = [r.title, r.year, r.description, r.genre, ...trackTitles];
          return { item: r, score: scoreItem(strings) };
        })
        .filter((x) => x && x.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      // Filter & score services
      const matchedServices = STUDIO_SERVICE_CATALOGUE
        .map((s) => {
          if (!s) return null;
          const strings = [s.title, s.category, s.description, ...(Array.isArray(s.keywords) ? s.keywords : [])];
          return { item: s, score: scoreItem(strings) };
        })
        .filter((x) => x && x.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      // Filter & score events
      const matchedEvents = events
        .map((e) => {
          if (!e) return null;
          const lineup = safeExtractTokens(e.lineup);
          const strings = [e.title, e.venue, e.city, e.country, e.description, e.ticket_status, ...lineup];
          return { item: e, score: scoreItem(strings) };
        })
        .filter((x) => x && x.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      // Filter & score gallery
      const matchedGallery = gallery
        .map((g) => {
          if (!g) return null;
          const tags = safeExtractTokens(g.tags);
          const strings = [g.title, g.caption, g.category, g.location, ...tags];
          return { item: g, score: scoreItem(strings) };
        })
        .filter((x) => x && x.score >= 0.5)
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
    } catch (err) {
      console.error("AI assistant search error:", err);
      return {
        hasQuery: Boolean(query && query.trim()),
        beats: [],
        releases: [],
        services: [],
        events: [],
        gallery: [],
        totalCount: 0,
      };
    }
  }, [query, beats, releases, events, gallery]);

  // Handle direct navigation to service checkout with pre-filled proposal
  const handleProceedToServices = (proposal) => {
    if (!proposal || !Array.isArray(proposal.services)) return;
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
    } catch {
      // Ignore storage error
    }
    navigate("/services");
  };

  // Admin module filtering for administrative workspace navigation
  const matchedAdminModules = useMemo(() => {
    if (!query || !query.trim()) return ADMIN_MODULES;
    const q = query.trim().toLowerCase();
    return ADMIN_MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q) ||
        (Array.isArray(m.keywords) && m.keywords.some((k) => k.includes(q) || q.includes(k)))
    );
  }, [query]);

  // Admin intent detection for natural language administrative commands
  const adminTaskIntent = useMemo(() => {
    if (!query || query.trim().length < 3) return null;
    const q = query.trim().toLowerCase();

    if (/(purge|empty\s*trash|clean\s*bin|clean\s*trash|recycle\s*bin|deleted\s*items)/i.test(q)) {
      return {
        type: "PURGE_RECYCLE_BIN",
        title: "Recycle Bin Automated Purge",
        desc: "Permanently delete soft-deleted records older than 60 days across all catalogue collections.",
      };
    }

    if (/(sync|refresh\s*cache|reload\s*store|update\s*public|synchronize)/i.test(q)) {
      return {
        type: "SYNC_CATALOGUE",
        title: "Public Catalogue Synchronization",
        desc: "Synchronize client store cache with the live production database to propagate updates immediately.",
      };
    }

    if (/(create|add|new|upload)\s+(beat|instrumental)/i.test(q)) {
      return {
        type: "NAVIGATE_CREATE",
        targetPath: "/admin/beats",
        title: "Create New Beat",
        desc: "Jump straight into the Beats CMS to configure BPM, Selar links, and audio stems.",
        btnText: "Open Beats Creator →",
      };
    }

    if (/(create|add|new)\s+(release|album|ep|single)/i.test(q)) {
      return {
        type: "NAVIGATE_CREATE",
        targetPath: "/admin/music",
        title: "Publish New Music Release",
        desc: "Open the Music CMS to register artwork, tracklists, release date, and DSP links.",
        btnText: "Open Music Releases CMS →",
      };
    }

    if (/(create|add|new|schedule)\s+(event|concert|tour|show)/i.test(q)) {
      return {
        type: "NAVIGATE_CREATE",
        targetPath: "/admin/events",
        title: "Schedule Live Event",
        desc: "Open Events Management to register venue, ticketing links, and lineup.",
        btnText: "Open Events CMS →",
      };
    }

    if (/(upload|add)\s+(media|asset|image|audio|file)/i.test(q)) {
      return {
        type: "NAVIGATE_CREATE",
        targetPath: "/admin/media",
        title: "Upload Media Asset",
        desc: "Open Media Asset Library for high-efficiency R2 cloud storage uploads.",
        btnText: "Open Media Library →",
      };
    }

    if (/(subscribers?|newsletter|fan\s*emails?)/i.test(q)) {
      return {
        type: "SUBSCRIBERS_LOOKUP",
        title: "Audience & Subscribers Management",
        desc: "Search, verify consent status, and manage the official mailing list.",
      };
    }

    if (/(orders?|bookings?|studio\s*inquir)/i.test(q)) {
      return {
        type: "ORDERS_LOOKUP",
        title: "Studio Client Orders & Sessions",
        desc: "Review booked studio services, client contact records, and turnaround deadlines.",
      };
    }

    return null;
  }, [query]);

  // Admin entities live matching
  const adminBeats = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return beats.filter((b) =>
      b.title?.toLowerCase().includes(q) ||
      b.genre?.toLowerCase().includes(q) ||
      String(b.bpm || "").includes(q) ||
      b.key?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [beats, query]);

  const adminReleases = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return releases.filter((r) =>
      r.title?.toLowerCase().includes(q) ||
      r.genre?.toLowerCase().includes(q) ||
      String(r.year || "").includes(q)
    ).slice(0, 4);
  }, [releases, query]);

  const adminEvents = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return events.filter((e) =>
      e.title?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q) ||
      e.venue?.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [events, query]);

  const adminGallery = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return gallery.filter((g) =>
      g.title?.toLowerCase().includes(q) ||
      g.caption?.toLowerCase().includes(q) ||
      g.category?.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [gallery, query]);

  const adminRecycleMatches = useMemo(() => {
    if (!query || !query.trim()) return recycleBinItems.slice(0, 5);
    const q = query.trim().toLowerCase();
    return recycleBinItems.filter((item) =>
      item.title?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q) ||
      item.table?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [recycleBinItems, query]);

  const adminSubscriberMatches = useMemo(() => {
    if (!query || !query.trim()) return adminSubscribers.slice(0, 5);
    const q = query.trim().toLowerCase();
    return adminSubscribers.filter((s) =>
      s.email?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [adminSubscribers, query]);

  const adminOrderMatches = useMemo(() => {
    if (!query || !query.trim()) return adminOrders.slice(0, 4);
    const q = query.trim().toLowerCase();
    return adminOrders.filter((o) =>
      o.customerName?.toLowerCase().includes(q) ||
      o.customerEmail?.toLowerCase().includes(q) ||
      o.orderStatus?.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [adminOrders, query]);

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
        className={`chomka-magic-ai-trigger ${isAdminMode ? "is-admin-mode" : ""} ${isAutoExpanded ? "is-expanded" : ""}`}
        onClick={() => {
          setIsAutoExpanded(false);
          setIsOpen(true);
        }}
        aria-label={
          isAdminMode
            ? "Open CHOMKA Admin AI Console (Ctrl+K)"
            : "Open CHOMKA AI Search & Studio Concierge (Ctrl+K)"
        }
        title={
          isAdminMode
            ? "Open CHOMKA Admin AI Console (Ctrl+K)"
            : "Open CHOMKA AI Assistant (Ctrl+K)"
        }
      >
        <div className="chomka-magic-ai-glow" aria-hidden="true" />
        <div className="chomka-magic-ai-sparkle" aria-hidden="true">
          {isAdminMode ? "⚙️" : "✦"}
        </div>
        <div className="chomka-magic-ai-label">
          <span>{isAdminMode ? "ADMIN AI" : "ASK CHOMKA AI"}</span>
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
            <ModalErrorBoundary onReset={() => setQuery("")}>
              {/* Header */}
              <div className="chomka-ai-header">
                <div className="chomka-ai-header-brand">
                  <span className="chomka-ai-sparkle-icon">
                    {isAdminMode ? "⚙️" : "✦"}
                  </span>
                  <div>
                    <div className="chomka-ai-title">
                      {isAdminMode ? "CHOMKA ADMIN AI · EXECUTIVE CONSOLE" : "CHOMKA AI · CHOMKAMUSIC™"}
                    </div>
                    <div className="chomka-ai-status">
                      <span className="chomka-ai-status-dot" />
                      <span>
                        {isAdminMode
                          ? `AUTHENTICATED CMS · ${user?.email || "ADMIN"}`
                          : "CATALOGUE & CHOMKAMUSIC™ STUDIO CONCIERGE"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="chomka-ai-header-actions">
                  {isEligibleForAdminAi && (
                    <div className="chomka-ai-mode-pills">
                      <button
                        type="button"
                        className={`chomka-ai-mode-pill ${effectiveMode === "admin" ? "is-active" : ""}`}
                        onClick={() => setActiveConsoleMode("admin")}
                      >
                        ⚡ ADMIN TASKS
                      </button>
                      <button
                        type="button"
                        className={`chomka-ai-mode-pill ${effectiveMode === "public" ? "is-active" : ""}`}
                        onClick={() => setActiveConsoleMode("public")}
                      >
                        🌐 PUBLIC SEARCH
                      </button>
                    </div>
                  )}
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
                <span className="chomka-ai-search-icon">{isAdminMode ? "⚡" : "🔍"}</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="chomka-ai-search-input"
                  placeholder={
                    isAdminMode
                      ? "Run admin task, search CMS records, purge recycle bin, manage beats, or navigate..."
                      : "Search beats, releases, tour dates or say: 'I want to record vocals for 4 hours and mix 2 songs'..."
                  }
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
                <span className="chomka-ai-chips-label">
                  {isAdminMode ? "ADMIN ACTIONS:" : "SUGGESTIONS:"}
                </span>
                {isAdminMode ? (
                  <>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("")}
                    >
                      📊 System Overview
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("manage beats")}
                    >
                      🥁 Beats CMS
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("manage releases")}
                    >
                      🎵 Music CMS
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("live events")}
                    >
                      🎟️ Events CMS
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("purge recycle bin")}
                    >
                      🗑️ Purge Trash
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("studio orders")}
                    >
                      🎛️ Studio Orders
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("subscribers")}
                    >
                      📬 Subscribers
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("sync catalogue")}
                    >
                      🔄 Sync Cache
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Console Body: Admin AI Console or Public Concierge */}
              <div className="chomka-ai-body">
                {isAdminMode ? (
                  /* =========================================================
                     AUTHENTICATED ADMIN AI WORKSPACE & PROCESSES
                     ========================================================= */
                  <div className="chomka-ai-admin-body">
                    {/* Process Card 1: Recycle Bin Purge */}
                    {adminTaskIntent?.type === "PURGE_RECYCLE_BIN" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">✦ ADMINISTRATIVE PROCESS</span>
                          <span style={{ fontSize: "11px", color: "var(--gold)" }}>
                            {adminStats.recycleBin} records in recycle bin
                          </span>
                        </div>
                        <h3 className="chomka-ai-process-title">Recycle Bin Automated Purge</h3>
                        <p className="chomka-ai-process-desc">
                          Permanently delete soft-deleted records older than 60 days across releases, tracks, beats, videos, gallery, media, and merchandise. This operation cannot be reversed.
                        </p>
                        {purgeResult && (
                          <div className={`chomka-ai-process-alert ${purgeResult.includes("failed") ? "is-error" : ""}`}>
                            {purgeResult}
                          </div>
                        )}
                        <div className="chomka-ai-process-actions">
                          <button
                            type="button"
                            className="chomka-ai-process-btn"
                            onClick={handlePurgeExpired}
                            disabled={isPurgingTrash}
                          >
                            {isPurgingTrash ? "Purging expired records..." : "🧹 Run Purge Expired (60+ Days)"}
                          </button>
                          <button
                            type="button"
                            className="chomka-ai-process-btn is-secondary"
                            onClick={() => handleAdminNavigate("/admin/recycle-bin", "Recycle Bin")}
                          >
                            Open Recycle Bin CMS →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Process Card 2: Catalogue Store Sync */}
                    {adminTaskIntent?.type === "SYNC_CATALOGUE" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">✦ ADMINISTRATIVE PROCESS</span>
                          {lastSyncedTime && (
                            <span style={{ fontSize: "11px", color: "#34d399" }}>
                              Last synced: {lastSyncedTime}
                            </span>
                          )}
                        </div>
                        <h3 className="chomka-ai-process-title">Public Catalogue Synchronization</h3>
                        <p className="chomka-ai-process-desc">
                          Forces an immediate resynchronization between the browser runtime cache and the live PostgreSQL production database. Use this after saving CMS updates.
                        </p>
                        {catalogueSyncStatus === "synced" && (
                          <div className="chomka-ai-process-alert">
                            ✓ Public catalogue cache successfully resynchronized with live database.
                          </div>
                        )}
                        {catalogueSyncStatus === "error" && (
                          <div className="chomka-ai-process-alert is-error">
                            Failed to synchronize catalogue. Check network connection.
                          </div>
                        )}
                        <div className="chomka-ai-process-actions">
                          <button
                            type="button"
                            className="chomka-ai-process-btn"
                            onClick={handleSyncCatalogue}
                            disabled={catalogueSyncStatus === "syncing"}
                          >
                            {catalogueSyncStatus === "syncing" ? "Synchronizing store..." : "🔄 Synchronize Live Catalogue"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Process Card 3: Quick Navigation / Creation Intent */}
                    {adminTaskIntent?.type === "NAVIGATE_CREATE" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">⚡ ADMINISTRATIVE ACTION</span>
                        </div>
                        <h3 className="chomka-ai-process-title">{adminTaskIntent.title}</h3>
                        <p className="chomka-ai-process-desc">{adminTaskIntent.desc}</p>
                        <div className="chomka-ai-process-actions">
                          <button
                            type="button"
                            className="chomka-ai-process-btn"
                            onClick={() => handleAdminNavigate(adminTaskIntent.targetPath, query)}
                          >
                            {adminTaskIntent.btnText}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Process Card 4: Subscribers Quick Lookup */}
                    {adminTaskIntent?.type === "SUBSCRIBERS_LOOKUP" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">✦ AUDIENCE & SUBSCRIBERS</span>
                          <span style={{ fontSize: "11px", color: "var(--gold)" }}>
                            {adminStats.subscribers} active subscribers
                          </span>
                        </div>
                        <h3 className="chomka-ai-process-title">Newsletter Subscribers</h3>
                        <p className="chomka-ai-process-desc">
                          Search registered fan emails, verify consent status, or delete subscriber records.
                        </p>
                        {subscriberDeleteResult && (
                          <div className={`chomka-ai-process-alert ${subscriberDeleteResult.includes("failed") ? "is-error" : ""}`}>
                            {subscriberDeleteResult}
                          </div>
                        )}
                        <div className="chomka-ai-process-actions">
                          <button
                            type="button"
                            className="chomka-ai-process-btn"
                            onClick={() => handleAdminNavigate("/admin/subscribers", "Subscribers")}
                          >
                            Open Subscribers Dashboard →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Process Card 5: Studio Orders Quick Lookup */}
                    {adminTaskIntent?.type === "ORDERS_LOOKUP" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">✦ STUDIO CLIENT ORDERS</span>
                          <span style={{ fontSize: "11px", color: "var(--gold)" }}>
                            {adminOrders.length} recent orders
                          </span>
                        </div>
                        <h3 className="chomka-ai-process-title">Studio Client Orders & Deadlines</h3>
                        <p className="chomka-ai-process-desc">
                          Review studio booking proposals, customer requirements, payment deposits, and delivery schedules.
                        </p>
                        <div className="chomka-ai-process-actions">
                          <button
                            type="button"
                            className="chomka-ai-process-btn"
                            onClick={() => handleAdminNavigate("/admin/services", "Studio Orders")}
                          >
                            Open Services & Orders CMS →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Default State: Live System Overview Metrics */}
                    {(!query || !query.trim()) && (
                      <div className="chomka-ai-admin-overview">
                        <div className="chomka-ai-admin-overview-header">
                          <span className="chomka-ai-admin-overview-title">
                            SYSTEM OVERVIEW & LIVE METRICS
                          </span>
                          {isAdminDataLoading && (
                            <span style={{ fontSize: "10px", color: "var(--gold)" }}>
                              Updating counts...
                            </span>
                          )}
                        </div>

                        {/* 10 Stats Tiles Grid */}
                        <div className="chomka-ai-admin-stat-grid">
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/events", "Live Events")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🎟️ Live Events</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.events}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/music", "Music Releases")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🎵 Releases</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.releases}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/tracks", "Tracks")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🎹 Tracks</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.tracks}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/beats", "Beats")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🥁 Beats</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.beats}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/videos", "Videos")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🎬 Videos</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.videos}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/gallery", "Gallery")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>📸 Gallery</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.gallery}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/links", "Social Links")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🔗 Socials</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.links}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/subscribers", "Subscribers")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>📬 Subscribers</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.subscribers}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/services", "Studio Orders")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🎛️ Studio Orders</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.orders}</div>
                          </div>
                          <div
                            className="chomka-ai-admin-stat-card"
                            onClick={() => handleAdminNavigate("/admin/recycle-bin", "Recycle Bin")}
                          >
                            <div className="chomka-ai-admin-stat-title">
                              <span>🗑️ Recycle Bin</span>
                              <span>→</span>
                            </div>
                            <div className="chomka-ai-admin-stat-value">{adminStats.recycleBin}</div>
                          </div>
                        </div>

                        {/* Administrative Quick Shortcuts */}
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--gold)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                            ADMINISTRATIVE SHORTCUTS
                          </div>
                          <div className="chomka-ai-admin-quick-actions">
                            <button
                              type="button"
                              className="chomka-ai-admin-quick-btn"
                              onClick={() => handleAdminNavigate("/admin/beats", "Add Beat")}
                            >
                              🥁 Create Beat
                            </button>
                            <button
                              type="button"
                              className="chomka-ai-admin-quick-btn"
                              onClick={() => handleAdminNavigate("/admin/events", "Add Event")}
                            >
                              🎟️ Schedule Event
                            </button>
                            <button
                              type="button"
                              className="chomka-ai-admin-quick-btn"
                              onClick={() => handleAdminNavigate("/admin/music", "Add Release")}
                            >
                              🎵 Publish Release
                            </button>
                            <button
                              type="button"
                              className="chomka-ai-admin-quick-btn"
                              onClick={() => handleAdminNavigate("/admin/media", "Upload Media")}
                            >
                              📁 Upload Media
                            </button>
                            <button
                              type="button"
                              className="chomka-ai-admin-quick-btn"
                              onClick={handlePurgeExpired}
                              disabled={isPurgingTrash}
                            >
                              {isPurgingTrash ? "Purging..." : "🧹 Purge Expired Trash"}
                            </button>
                            <button
                              type="button"
                              className="chomka-ai-admin-quick-btn"
                              onClick={handleSyncCatalogue}
                              disabled={catalogueSyncStatus === "syncing"}
                            >
                              {catalogueSyncStatus === "syncing" ? "Syncing..." : "🔄 Sync Live Catalogue"}
                            </button>
                          </div>
                        </div>

                        {/* Workspaces Directory */}
                        <div>
                          <div style={{ fontSize: "10px", color: "var(--gold)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>
                            ADMINISTRATIVE WORKSPACES ({ADMIN_MODULES.length})
                          </div>
                          <div className="chomka-ai-section-list">
                            {ADMIN_MODULES.slice(0, 8).map((mod) => (
                              <div
                                key={mod.slug}
                                className="chomka-ai-result-card"
                                onClick={() => handleAdminNavigate(mod.path, mod.title)}
                              >
                                <div className="chomka-ai-card-info">
                                  <span className="chomka-ai-card-category">{mod.icon} WORKSPACE</span>
                                  <h4 className="chomka-ai-card-title">{mod.title}</h4>
                                  <p className="chomka-ai-card-desc">{mod.desc}</p>
                                </div>
                                <div className="chomka-ai-card-action">
                                  <span className="chomka-ai-card-arrow">OPEN →</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Non-Empty Search Query Results across Admin Modules & Entities */}
                    {query && query.trim() && (
                      <div className="chomka-ai-results-grid">
                        {restoreResult && (
                          <div className="chomka-ai-process-alert" style={{ marginBottom: "12px" }}>
                            {restoreResult}
                          </div>
                        )}

                        {/* Workspaces Matches */}
                        {matchedAdminModules.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>🏢 WORKSPACES ({matchedAdminModules.length})</span>
                            </div>
                            <div className="chomka-ai-section-list">
                              {matchedAdminModules.map((mod) => (
                                <div
                                  key={mod.slug}
                                  className="chomka-ai-result-card"
                                  onClick={() => handleAdminNavigate(mod.path, mod.title)}
                                >
                                  <div className="chomka-ai-card-info">
                                    <span className="chomka-ai-card-category">{mod.icon} MODULE</span>
                                    <h4 className="chomka-ai-card-title">{mod.title}</h4>
                                    <p className="chomka-ai-card-desc">{mod.desc}</p>
                                  </div>
                                  <div className="chomka-ai-card-action">
                                    <span className="chomka-ai-card-arrow">OPEN →</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Beats in CMS */}
                        {adminBeats.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>🥁 BEATS RECORDS ({adminBeats.length})</span>
                            </div>
                            <div className="chomka-ai-section-list">
                              {adminBeats.map((beat) => (
                                <div
                                  key={beat.id}
                                  className="chomka-ai-result-card"
                                  onClick={() => handleAdminNavigate(`/admin/beats`, beat.title)}
                                >
                                  <div className="chomka-ai-card-info">
                                    <span className="chomka-ai-card-category">{beat.genre || "BEAT"} · {beat.bpm || 120} BPM</span>
                                    <h4 className="chomka-ai-card-title">{beat.title}</h4>
                                    <p className="chomka-ai-card-desc">Key: {beat.key || "C Minor"} · Selar ID: {beat.id}</p>
                                  </div>
                                  <div className="chomka-ai-card-action">
                                    <span className="chomka-ai-card-arrow">EDIT IN CMS →</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Releases in CMS */}
                        {adminReleases.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>🎵 RELEASES & DISCOGRAPHY ({adminReleases.length})</span>
                            </div>
                            <div className="chomka-ai-section-list">
                              {adminReleases.map((rel) => (
                                <div
                                  key={rel.slug}
                                  className="chomka-ai-result-card"
                                  onClick={() => handleAdminNavigate(`/admin/music`, rel.title)}
                                >
                                  <div className="chomka-ai-card-info">
                                    <span className="chomka-ai-card-category">{rel.year || "RELEASE"}</span>
                                    <h4 className="chomka-ai-card-title">{rel.title}</h4>
                                    <p className="chomka-ai-card-desc">{rel.description || "Official music release catalogue item."}</p>
                                  </div>
                                  <div className="chomka-ai-card-action">
                                    <span className="chomka-ai-card-arrow">EDIT IN CMS →</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Events in CMS */}
                        {adminEvents.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>🎟️ LIVE EVENTS ({adminEvents.length})</span>
                            </div>
                            <div className="chomka-ai-section-list">
                              {adminEvents.map((evt) => (
                                <div
                                  key={evt.id || evt.slug}
                                  className="chomka-ai-result-card"
                                  onClick={() => handleAdminNavigate(`/admin/events`, evt.title)}
                                >
                                  <div className="chomka-ai-card-info">
                                    <span className="chomka-ai-card-category">{evt.city || "LIVE"} · {evt.date}</span>
                                    <h4 className="chomka-ai-card-title">{evt.title}</h4>
                                    <p className="chomka-ai-card-desc">Venue: {evt.venue || "Announced soon"} · Status: {evt.ticket_status}</p>
                                  </div>
                                  <div className="chomka-ai-card-action">
                                    <span className="chomka-ai-card-arrow">EDIT IN CMS →</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Gallery in CMS */}
                        {adminGallery.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>📸 GALLERY MOMENTS ({adminGallery.length})</span>
                            </div>
                            <div className="chomka-ai-section-list">
                              {adminGallery.map((post) => (
                                <div
                                  key={post.id}
                                  className="chomka-ai-result-card"
                                  onClick={() => handleAdminNavigate(`/admin/gallery`, post.title)}
                                >
                                  <div className="chomka-ai-card-info">
                                    <span className="chomka-ai-card-category">{post.category || "GALLERY"}</span>
                                    <h4 className="chomka-ai-card-title">{post.title || post.caption?.slice(0, 30) || "Visual Moment"}</h4>
                                    <p className="chomka-ai-card-desc">{post.location ? `📍 ${post.location}` : "Media Archive"}</p>
                                  </div>
                                  <div className="chomka-ai-card-action">
                                    <span className="chomka-ai-card-arrow">EDIT IN CMS →</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Subscribers in CMS */}
                        {adminSubscriberMatches.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>📬 SUBSCRIBERS ({adminSubscriberMatches.length})</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {adminSubscriberMatches.map((sub) => (
                                <div key={sub.id} className="chomka-ai-entity-row">
                                  <div>
                                    <strong style={{ fontSize: "12px", color: "#fff" }}>{sub.email}</strong>
                                    <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                                      Source: {sub.source || "Website"} · Joined: {new Date(sub.created_at || Date.now()).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span
                                      className="chomka-ai-entity-badge"
                                      style={{
                                        background: sub.status === "ACTIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                        color: sub.status === "ACTIVE" ? "#34d399" : "#f87171",
                                      }}
                                    >
                                      {sub.status}
                                    </span>
                                    <button
                                      type="button"
                                      style={{
                                        padding: "3px 8px",
                                        fontSize: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid rgba(239, 68, 68, 0.4)",
                                        background: "rgba(239, 68, 68, 0.1)",
                                        color: "#f87171",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                                      disabled={subscriberDeleteLoadingId === sub.id}
                                    >
                                      {subscriberDeleteLoadingId === sub.id ? "Deleting..." : "Delete"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Deleted items in Recycle Bin */}
                        {adminRecycleMatches.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>🗑️ RECYCLE BIN ITEMS ({adminRecycleMatches.length})</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {adminRecycleMatches.map((item) => (
                                <div key={`${item.table}-${item.id}`} className="chomka-ai-entity-row">
                                  <div>
                                    <span className="chomka-ai-entity-badge" style={{ marginRight: "6px" }}>
                                      {item.table?.toUpperCase() || "RECORD"}
                                    </span>
                                    <strong style={{ fontSize: "12px", color: "#fff" }}>
                                      {item.title || item.name || item.id}
                                    </strong>
                                    <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                                      Deleted: {new Date(item.deleted_at || Date.now()).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      borderRadius: "4px",
                                      border: "1px solid var(--gold)",
                                      background: "rgba(223, 194, 125, 0.15)",
                                      color: "var(--gold)",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleRestoreItem(item.table, item.id, item.title || item.name)}
                                    disabled={isRestoringId === item.id}
                                  >
                                    {isRestoringId === item.id ? "Restoring..." : "Restore Item ↺"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Studio Orders in CMS */}
                        {adminOrderMatches.length > 0 && (
                          <div className="chomka-ai-result-section">
                            <div className="chomka-ai-section-title">
                              <span>🎛️ STUDIO ORDERS ({adminOrderMatches.length})</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {adminOrderMatches.map((ord) => (
                                <div key={ord.id} className="chomka-ai-entity-row">
                                  <div>
                                    <strong style={{ fontSize: "12px", color: "#fff" }}>
                                      {ord.customerName} ({ord.customerEmail})
                                    </strong>
                                    <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                                      Services: {Array.isArray(ord.services) ? ord.services.join(", ") : "Studio Session"}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="chomka-ai-entity-badge">
                                      {ord.orderStatus || "PENDING"}
                                    </span>
                                    <button
                                      type="button"
                                      style={{
                                        padding: "3px 8px",
                                        fontSize: "10px",
                                        borderRadius: "4px",
                                        border: "1px solid var(--gold)",
                                        background: "transparent",
                                        color: "var(--gold)",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => handleAdminNavigate("/admin/services", ord.customerName)}
                                    >
                                      View →
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Empty state when searching in Admin Mode */}
                        {matchedAdminModules.length === 0 &&
                          adminBeats.length === 0 &&
                          adminReleases.length === 0 &&
                          adminEvents.length === 0 &&
                          adminGallery.length === 0 &&
                          adminSubscriberMatches.length === 0 &&
                          adminRecycleMatches.length === 0 &&
                          adminOrderMatches.length === 0 &&
                          !adminTaskIntent && (
                            <div className="chomka-ai-empty-state">
                              <p className="chomka-ai-empty-title">NO CMS RECORDS FOUND FOR "{query}"</p>
                              <p className="chomka-ai-empty-desc">
                                Try searching for "Beats", "Events", "Purge recycle bin", "Subscribers", or "Sync catalogue".
                              </p>
                              <button
                                type="button"
                                className="studio-pill-btn"
                                onClick={() => setQuery("")}
                                style={{ marginTop: "12px", background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)" }}
                              >
                                📊 Return to System Overview
                              </button>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* =========================================================
                     PUBLIC CATALOGUE SEARCH & CONCIERGE (Public site & /admin/login)
                     ========================================================= */
                  <>
                    {/* 1. Conversational Booking AI Proposal */}
                    {bookingProposal && Array.isArray(bookingProposal.services) && (
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
                      {Array.isArray(searchResults?.services) && searchResults.services.length > 0 && (
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
                      {Array.isArray(searchResults?.beats) && searchResults.beats.length > 0 && (
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
                      {Array.isArray(searchResults?.releases) && searchResults.releases.length > 0 && (
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
                      {Array.isArray(searchResults?.events) && searchResults.events.length > 0 && (
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
                      {Array.isArray(searchResults?.gallery) && searchResults.gallery.length > 0 && (
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
                      {searchResults?.hasQuery && searchResults?.totalCount === 0 && !bookingProposal && (
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
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="chomka-ai-footer">
                <span>
                  {isAdminMode
                    ? "✦ CHOMKA ADMIN AI · SECURE CMS EXECUTIVE WORKSPACE"
                    : "✦ CHOMKA AI · chomkaMUSIC™ & Chomka Nation"}
                </span>
                <span>POWERED BY SILACHOMKA ENGINE</span>
              </div>
            </ModalErrorBoundary>
          </div>
        </div>
      )}
    </>
  );
}

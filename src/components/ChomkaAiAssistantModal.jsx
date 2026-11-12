import { useState, useEffect, useMemo, useRef, useCallback, Component } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useChomkaStore, refreshCatalogue } from "../data/store";
import { useCurrency } from "../data/CurrencyContext";
import { useAdminAuth } from "../pages/admin/AdminAuthProvider";
import { adminApi } from "../data/adminApi";
import { formatLongDate } from "../utils/dateFormatter";
import {
  buildCatalogueKnowledge,
  parseChomkaQuestion,
  synthesizeChomkaAiAnswer,
  parseAdminExecutiveIntent,
  STOP_WORDS,
  extractAcronyms,
} from "../data/chomkaAiKnowledgeEngine";

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

// Standard studio service rate baselines for intent calculation (mirrors CONVERSATIONAL_SERVICES)
export const STUDIO_SERVICE_CATALOGUE = [
  {
    slug: "voice-recording",
    aliasSlugs: ["vocal-recording", "recording-session", "studio-time"],
    title: "Voice Recording Sessions",
    category: "Recording",
    rateNgn: 25000,
    rateUsd: 50,
    unit: "hour",
    isHourly: true,
    keywords: [
      "vocal", "vocals", "record", "recording", "voice", "sing", "singing",
      "booth", "mic", "microphone", "studio time", "hours", "hour", "session",
      "tracking", "recording session", "vocal session", "studio booth"
    ],
    description: "Pristine Neumann & Avalon vocal chain tracking with zero latency monitoring & live producer guidance.",
  },
  {
    slug: "beat-production",
    aliasSlugs: ["custom-beat", "produce-beat"],
    title: "Custom Beat Production",
    category: "Production",
    rateNgn: 80000,
    rateUsd: 160,
    unit: "beat",
    isHourly: false,
    keywords: [
      "custom beat", "beat production", "produce beat", "producer", "production",
      "instrumental", "soundtrack", "tailored beat", "afrobeats beat", "amapiano beat",
      "trap beat", "hip hop beat", "compose", "composition", "silachomka beat", "buy a beat", "buy beat"
    ],
    description: "Tailored custom composition crafted specifically around your vocal tone, musical key, and artistic identity.",
  },
  {
    slug: "beat-mixing",
    aliasSlugs: ["mix-beat"],
    title: "Beat Mixing & Stem Punch",
    category: "Mixing",
    rateNgn: 25000,
    rateUsd: 50,
    unit: "track",
    isHourly: false,
    keywords: ["beat mix", "beat mixing", "mix beat", "tighten beat", "drum punch", "bass mix"],
    description: "Tighten kicks, glue 808s, and balance instrumental stems for punch and clarity across all sound systems.",
  },
  {
    slug: "vocal-mixing",
    aliasSlugs: ["mix-vocals", "mixing"],
    title: "Vocal Mixing & Tuning",
    category: "Mixing",
    rateNgn: 35000,
    rateUsd: 70,
    unit: "song",
    isHourly: false,
    keywords: ["vocal mix", "vocal mixing", "tune vocals", "autotune", "pitch correction", "mix vocals", "vocal polish"],
    description: "Surgical pitch tuning, background cleanup, smooth analog compression, and lush spatial reverb depth.",
  },
  {
    slug: "full-song-mastering",
    aliasSlugs: ["mastering", "master"],
    title: "Streaming-Ready Mastering",
    category: "Mastering",
    rateNgn: 35000,
    rateUsd: 70,
    unit: "master",
    isHourly: false,
    keywords: ["master", "mastering", "final polish", "streaming ready", "spotify master", "apple music master", "loudness"],
    description: "Commercial streaming loudness, tonal balance, stereo imaging, and translation across club & phone speakers.",
  },
  {
    slug: "full-song-production",
    aliasSlugs: ["full-song"],
    title: "Full Song Production",
    category: "Production",
    rateNgn: 110000,
    rateUsd: 220,
    unit: "song",
    isHourly: false,
    keywords: ["full song", "song from scratch", "produce song", "complete song", "full production", "all-in-one hit"],
    description: "Turn rough demos or voice notes into a finished, radio-ready record from composition to final master.",
  },
  {
    slug: "instrumentalist-collaboration",
    aliasSlugs: ["collaboration"],
    title: "Instrumentalist / Producer Collab",
    category: "Collaboration",
    rateNgn: 20000,
    rateUsd: 40,
    unit: "session",
    isHourly: false,
    keywords: ["instrumentalist", "live guitars", "guitar", "keys", "piano", "guest producer", "collab"],
    description: "Live guitar lines, rich keys, and direct co-production collaboration to elevate your track.",
  },
  {
    slug: "feature",
    aliasSlugs: ["silachomka-feature"],
    title: "Artist Feature / Guest Verse",
    category: "Collaboration",
    rateNgn: 50000,
    rateUsd: 100,
    unit: "feature",
    isHourly: false,
    keywords: ["feature", "guest verse", "hook", "sing a hook", "silachomka verse", "collaborate with silachomka"],
    description: "Official silachomka guest verse, vocal hook, or co-composition on your release.",
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

// Schedule & session date intent detection engine
export function parseDateScheduleIntent(text, availabilityList = []) {
  if (typeof text !== "string") return null;
  const norm = text.toLowerCase();

  const isScheduleMentioned =
    /(nearest\s*(?:opened|open|available)?\s*(?:session|booking)?\s*date|next\s*available|earliest|asap|as\s*soon\s*as\s*possible|opened\s*session|open\s*date|nearest\s*date|tomorrow|today|this\s*week|next\s*week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\b\d{4}-\d{2}-\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b)/i.test(
      norm
    );

  if (!isScheduleMentioned) return null;

  const today = new Date();
  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatYMD(today);

  // 1. Exact ISO date in query: YYYY-MM-DD
  const ymdMatch = norm.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (ymdMatch) {
    return {
      dateStr: ymdMatch[1],
      timeSlot: "10:00 AM",
      allSlots: ["10:00 AM", "02:00 PM", "06:00 PM"],
      source: "exact_date",
      label: "Specified Session Date",
    };
  }

  // 2. Tomorrow explicitly requested
  if (/\btomorrow\b/i.test(norm)) {
    const tmrw = new Date(today);
    tmrw.setDate(tmrw.getDate() + 1);
    return {
      dateStr: formatYMD(tmrw),
      timeSlot: "10:00 AM",
      allSlots: ["10:00 AM", "02:00 PM", "06:00 PM"],
      source: "tomorrow",
      label: "Tomorrow's Studio Session",
    };
  }

  // 3. Filter open upcoming dates from studio availability
  const openDates = (Array.isArray(availabilityList) ? availabilityList : [])
    .filter((item) => {
      if (!item || !item.dateStr) return false;
      if (item.isClosed) return false;
      if (item.dateStr < todayStr) return false;
      const slots = Array.isArray(item.slots) ? item.slots : [];
      return slots.length > 0;
    })
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  if (openDates.length > 0) {
    const nearest = openDates[0];
    const firstSlot = nearest.slots[0] || "10:00 AM";
    return {
      dateStr: nearest.dateStr,
      timeSlot: firstSlot,
      allSlots: nearest.slots,
      source: "calendar_availability",
      label: "Nearest Opened Session Date",
    };
  }

  // 4. Fallback studio operating schedule (Mon-Sat, skipping Sunday, starting tomorrow)
  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + 1);
  if (nextDate.getDay() === 0) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  return {
    dateStr: formatYMD(nextDate),
    timeSlot: "10:00 AM",
    allSlots: ["10:00 AM", "02:00 PM", "06:00 PM"],
    source: "operating_calendar",
    label: "Nearest Opened Session Date",
  };
}

// Parse conversational booking stories into configured order drafts
export function parseConversationalBooking(
  text,
  availabilityList = [],
  beatsCatalogue = [],
  serviceCatalogue = STUDIO_SERVICE_CATALOGUE,
  slotOverride = null
) {
  if (typeof text !== "string") return null;
  const normalized = text.toLowerCase();
  const detectedServices = [];

  const isConversational =
    /(book|session|record|recording|voice|vocal|hours?|mix|master|consult|custom|beat|produce|tracks?|price|cost|how much|want to|hire|buy)/i.test(
      normalized
    );
  if (!isConversational) return null;

  // Extract hours if mentioned (e.g., "4 hours", "3 hrs", "3 hours")
  let hours = 2;
  const hourMatch = normalized.match(/(\d+)\s*(?:hour|hours|hr|hrs)/);
  if (hourMatch) {
    hours = Math.max(1, parseInt(hourMatch[1], 10) || 2);
  }

  // Extract tracks count if mentioned (e.g., "2 songs", "3 tracks", "1 beat")
  let quantity = 1;
  const trackMatch = normalized.match(/(\d+)\s*(?:song|songs|track|tracks|beat|beats)/);
  if (trackMatch) {
    quantity = Math.max(1, parseInt(trackMatch[1], 10) || 1);
  }

  // Parse scheduling intent
  const scheduleIntent = parseDateScheduleIntent(text, availabilityList);

  let isBeatRequested = false;

  // Match against services
  for (const svc of serviceCatalogue) {
    const isMatched =
      Array.isArray(svc.keywords) &&
      svc.keywords.some((k) => normalized.includes(k.toLowerCase()));

    if (isMatched) {
      if (svc.slug === "beat-production") {
        isBeatRequested = true;
      }

      let qty = 1;
      if (svc.isHourly || svc.slug === "voice-recording") {
        qty = hours;
      } else if (
        svc.slug === "beat-mixing" ||
        svc.slug === "vocal-mixing" ||
        svc.slug === "full-song-mastering" ||
        svc.slug === "beat-production"
      ) {
        qty = quantity;
      }

      detectedServices.push({
        ...svc,
        quantity: qty,
        subtotalNgn: svc.rateNgn * qty,
        subtotalUsd: svc.rateUsd * qty,
      });
    }
  }

  // Also check if user specifically asked for "silachomka beat" or "buy beat"
  if (/(buy|get|purchase|license)\s+(?:a\s+)?(?:silachomka\s+)?beat/i.test(normalized)) {
    isBeatRequested = true;
    if (!detectedServices.some((s) => s.slug === "beat-production")) {
      const bp = serviceCatalogue.find((s) => s.slug === "beat-production");
      if (bp) {
        detectedServices.push({
          ...bp,
          quantity: quantity,
          subtotalNgn: bp.rateNgn * quantity,
          subtotalUsd: bp.rateUsd * quantity,
        });
      }
    }
  }

  // If no services matched but user mentioned "record", "recording", "booth", or "session"
  if (
    detectedServices.length === 0 &&
    /(record|recording|session|booth|vocal|voice)/i.test(normalized)
  ) {
    const vr = serviceCatalogue.find((s) => s.slug === "voice-recording");
    if (vr) {
      detectedServices.push({
        ...vr,
        quantity: hours,
        subtotalNgn: vr.rateNgn * hours,
        subtotalUsd: vr.rateUsd * hours,
      });
    }
  }

  if (detectedServices.length === 0) return null;

  const totalNgn = detectedServices.reduce((sum, s) => sum + s.subtotalNgn, 0);
  const totalUsd = detectedServices.reduce((sum, s) => sum + s.subtotalUsd, 0);
  const depositNgn = Math.round(totalNgn * 0.5);
  const depositUsd = Math.round(totalUsd * 0.5);

  // Recommended official beats from catalogue
  let recommendedBeats = [];
  if (isBeatRequested || /(beat|instrumental)/i.test(normalized)) {
    const mentionedBeat = (beatsCatalogue || []).find(
      (b) => b?.title && normalized.includes(b.title.toLowerCase())
    );
    if (mentionedBeat) {
      recommendedBeats = [
        mentionedBeat,
        ...(beatsCatalogue || []).filter((b) => b.id !== mentionedBeat.id).slice(0, 2),
      ];
    } else {
      recommendedBeats = (beatsCatalogue || []).slice(0, 3);
    }
  }

  const effectiveTimeSlot = slotOverride || scheduleIntent?.timeSlot || "10:00 AM";

  return {
    isIntent: true,
    services: detectedServices,
    totalNgn,
    totalUsd,
    depositNgn,
    depositUsd,
    rawPrompt: text,
    schedule: scheduleIntent,
    bookingDate: scheduleIntent?.dateStr || null,
    bookingTime: effectiveTimeSlot,
    isBeatRequested,
    recommendedBeats,
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
  const [adminEventsList, setAdminEventsList] = useState([]);
  const [adminReleasesList, setAdminReleasesList] = useState([]);
  const [adminTracksList, setAdminTracksList] = useState([]);
  const [adminBeatsList, setAdminBeatsList] = useState([]);
  const [adminVideosList, setAdminVideosList] = useState([]);
  const [adminGalleryList, setAdminGalleryList] = useState([]);
  const [adminLinksList, setAdminLinksList] = useState([]);

  // Process execution states
  const [isPurgingTrash, setIsPurgingTrash] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);
  const [isRestoringId, setIsRestoringId] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [catalogueSyncStatus, setCatalogueSyncStatus] = useState("idle");
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [subscriberDeleteLoadingId, setSubscriberDeleteLoadingId] = useState(null);
  const [subscriberDeleteResult, setSubscriberDeleteResult] = useState(null);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [executingEntityId, setExecutingEntityId] = useState(null);
  const [lastActionFeedback, setLastActionFeedback] = useState(null);

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
      setAdminEventsList(evts);
      setAdminReleasesList(rels);
      setAdminTracksList(trks);
      setAdminBeatsList(bts);
      setAdminVideosList(vids);
      setAdminGalleryList(gals);
      setAdminLinksList(lnks);

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

  const handleExecuteDelete = async (entityType, id, title) => {
    if (!id) return;
    setExecutingEntityId(id);
    setIsExecutingAction(true);
    setLastActionFeedback(null);
    try {
      let tableName = "events";
      if (entityType === "events" || entityType === "event") {
        tableName = "events";
        await adminApi.deleteEvent(id);
      } else if (entityType === "beats" || entityType === "beat") {
        tableName = "beats";
        await adminApi.deleteBeat(id);
      } else if (entityType === "releases" || entityType === "release") {
        tableName = "releases";
        await adminApi.deleteRelease(id);
      } else if (entityType === "tracks" || entityType === "track") {
        tableName = "tracks";
        await adminApi.deleteTrack(id);
      } else if (entityType === "videos" || entityType === "video") {
        tableName = "music_videos";
        await adminApi.deleteVideo(id);
      } else if (entityType === "gallery") {
        tableName = "gallery_posts";
        await adminApi.deleteGalleryPost(id);
      } else if (entityType === "media") {
        tableName = "media_assets";
        await adminApi.deleteMediaAsset(id);
      } else if (entityType === "subscribers" || entityType === "subscriber") {
        tableName = "subscribers";
        await adminApi.deleteSubscriber(id);
      }

      setLastActionFeedback({
        type: "success",
        message: `Successfully moved "${title || id}" to Recycle Bin.`,
        undoItem: tableName === "subscribers" ? null : { table: tableName, id, title: title || id },
      });

      await fetchAdminData();
      await refreshCatalogue();
    } catch (err) {
      setLastActionFeedback({
        type: "error",
        message: `Deletion failed: ${err.message || "Unknown error"}`,
        undoItem: null,
      });
    } finally {
      setIsExecutingAction(false);
      setExecutingEntityId(null);
    }
  };

  const handleExecuteUndo = async (undoItem) => {
    if (!undoItem || !undoItem.table || !undoItem.id) return;
    setIsExecutingAction(true);
    try {
      await adminApi.restoreItem(undoItem.table, undoItem.id);
      setLastActionFeedback({
        type: "success",
        message: `Restored "${undoItem.title}" back to active catalogue.`,
        undoItem: null,
      });
      await fetchAdminData();
      await refreshCatalogue();
    } catch (err) {
      setLastActionFeedback({
        type: "error",
        message: `Restore failed: ${err.message || "Unknown error"}`,
        undoItem,
      });
    } finally {
      setIsExecutingAction(false);
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

  const [studioAvailability, setStudioAvailability] = useState([]);
  const [liveServices, setLiveServices] = useState([]);
  const [selectedSlotOverride, setSelectedSlotOverride] = useState(null);

  // Fetch live studio availability & live services catalogue
  useEffect(() => {
    let cancelled = false;
    fetch("/api/services/availability")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setStudioAvailability(data);
        }
      })
      .catch(() => {});

    fetch("/api/services")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setLiveServices(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Merge live services with baseline catalogue to ensure full dynamic accuracy
  const effectiveCatalogue = useMemo(() => {
    if (liveServices.length === 0) return STUDIO_SERVICE_CATALOGUE;
    return STUDIO_SERVICE_CATALOGUE.map((item) => {
      const match = liveServices.find(
        (s) => s.slug === item.slug || (Array.isArray(item.aliasSlugs) && item.aliasSlugs.includes(s.slug))
      );
      if (!match) return item;
      const rate = Number(match.hourlyRateNgn || match.basePriceNgn || item.rateNgn);
      return {
        ...item,
        title: match.title || item.title,
        rateNgn: rate,
        rateUsd: Math.round(rate / 500),
        description: match.description || item.description,
      };
    });
  }, [liveServices]);

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

  // Dynamic Catalogue Knowledge Graph & Alias Mapping (DPS -> "DON'T PLAY SILACHOMKA", etc.)
  const aliasKnowledgeMap = useMemo(() => {
    return buildCatalogueKnowledge(releases, beats);
  }, [releases, beats]);

  // Conversational Intent & Natural Language Question Parser
  const parsedChomkaQuestion = useMemo(() => {
    if (!query || query.trim().length < 2) return null;
    return parseChomkaQuestion(query, aliasKnowledgeMap, releases);
  }, [query, aliasKnowledgeMap, releases]);

  // Authoritative AI Smart Answer Synthesis
  const smartAnswer = useMemo(() => {
    if (!parsedChomkaQuestion) return null;
    return synthesizeChomkaAiAnswer(parsedChomkaQuestion, currency, releases);
  }, [parsedChomkaQuestion, currency, releases]);

  // Conversational Intent Detection with Scheduling & Beat Recommendations
  const bookingProposal = useMemo(() => {
    try {
      if (!query || query.trim().length < 4) return null;
      // Do not generate a studio booking proposal if the question is an informational release query
      if (parsedChomkaQuestion && parsedChomkaQuestion.intent !== "STUDIO_SERVICES") {
        return null;
      }
      return parseConversationalBooking(
        query,
        studioAvailability,
        beats,
        effectiveCatalogue,
        selectedSlotOverride
      );
    } catch {
      return null;
    }
  }, [query, studioAvailability, beats, effectiveCatalogue, selectedSlotOverride, parsedChomkaQuestion]);

  // Multi-entity Typo-Tolerant Search Engine with Knowledge-Aware Acronym & Entity Boosting
  const searchResults = useMemo(() => {
    try {
      const trimmed = (query || "").trim().toLowerCase();
      if (!trimmed) {
        return {
          hasQuery: false,
          beats: beats.slice(0, 3),
          releases: releases.slice(0, 2),
          services: effectiveCatalogue,
          events: events.slice(0, 2),
          gallery: gallery.slice(0, 3),
          suggestedTerm: null,
          totalCount: 0,
        };
      }

      const queryTokens = trimmed.replace(/[?!.]+$/, "").split(/\s+/).filter(Boolean);
      // Filter out high-frequency noise stop words so queries like "when did silachomka release dps" don't match all releases on "silachomka" or "release"
      const meaningfulTokens = queryTokens.filter((t) => !STOP_WORDS.has(t));
      const activeTokens = meaningfulTokens.length > 0 ? meaningfulTokens : queryTokens;

      const targetEntity = parsedChomkaQuestion?.matchedEntity;
      const targetReleaseSlug = targetEntity?.type === "release" ? targetEntity.data?.slug : null;
      const targetBeatId = targetEntity?.type === "beat" ? targetEntity.data?.id : null;
      const targetServiceSlug = targetEntity?.type === "service" ? targetEntity.data?.slug : null;
      const isReleaseQuery = parsedChomkaQuestion?.intent?.startsWith("RELEASE_") || targetEntity?.type === "release";

      // Score function across multiple attributes safely
      const scoreItem = (strings, isService = false) => {
        if (!Array.isArray(strings)) return 0;
        let maxScore = 0;
        for (const raw of strings) {
          if (raw == null) continue;
          const low = String(raw).toLowerCase().trim();
          if (!low) continue;
          // Exact containment of full query
          if (low.includes(trimmed)) return 1.0;
          // Token matches against active tokens
          for (const token of activeTokens) {
            if (!token) continue;
            if (low === token) {
              maxScore = Math.max(maxScore, 1.0);
            } else if (low.includes(token)) {
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
          if (targetBeatId && b.id === targetBeatId) {
            return { item: b, score: 2.0 };
          }
          const tags = safeExtractTokens(b.tags);
          const acronyms = extractAcronyms(b.title);
          const strings = [b.title, b.genre, b.mood, b.key, b.bpm ? `${b.bpm} bpm` : "", ...tags, ...acronyms];
          return { item: b, score: scoreItem(strings) };
        })
        .filter((x) => x && x.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      // Filter & score releases
      const matchedReleases = releases
        .map((r) => {
          if (!r) return null;
          if (targetReleaseSlug && r.slug === targetReleaseSlug) {
            return { item: r, score: 2.5 };
          }
          const tracks = Array.isArray(r.tracks) ? r.tracks : (Array.isArray(r.tracklist) ? r.tracklist : []);
          const trackTitles = tracks.map((t) => (typeof t === "string" ? t : t?.title || "")).filter(Boolean);
          const acronyms = extractAcronyms(r.title);
          const strings = [r.title, r.year, r.description, r.genre, ...trackTitles, ...acronyms];
          return { item: r, score: scoreItem(strings) };
        })
        .filter((x) => x && x.score >= 0.5)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      // Filter & score services - suppress if the query is strictly about a music release
      const matchedServices = isReleaseQuery
        ? []
        : effectiveCatalogue
            .map((s) => {
              if (!s) return null;
              if (targetServiceSlug && s.slug === targetServiceSlug) {
                return { item: s, score: 2.0 };
              }
              const strings = [s.title, s.category, s.description, ...(Array.isArray(s.keywords) ? s.keywords : [])];
              return { item: s, score: scoreItem(strings, true) };
            })
            .filter((x) => x && x.score >= 0.5)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.item);

      // Filter & score events
      const matchedEvents = isReleaseQuery
        ? []
        : events
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
      const matchedGallery = isReleaseQuery
        ? []
        : gallery
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
  }, [query, beats, releases, events, gallery, effectiveCatalogue, parsedChomkaQuestion]);

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
          hours: s.isHourly || s.unit === "hour" ? s.quantity : 2,
          revisions: 2,
          quantity: s.quantity,
          expressTurnaround: false,
          bookingDate: proposal.bookingDate || "",
          bookingTime: proposal.bookingTime || "",
          sessionInfo: proposal.bookingDate
            ? `AI Concierge Scheduled: ${proposal.schedule?.label || "Nearest open date"} (${formatLongDate(proposal.bookingDate)} at ${proposal.bookingTime || "10:00 AM"})`
            : "",
        };
      });

      const draft = {
        selectedSlugs,
        configurations,
        customerMessage: `AI Studio Request: "${proposal.rawPrompt}"`,
        step: "confirm", // jump to review / booking step
        autoApply: true,
        lastUpdated: Date.now(),
      };
      localStorage.setItem("chomka_services_booking_draft_v1", JSON.stringify(draft));
    } catch {
      // Ignore storage error
    }
    navigate("/services");
  };

  const effectiveAdminEvents = useMemo(() => (adminEventsList.length > 0 ? adminEventsList : events), [adminEventsList, events]);
  const effectiveAdminBeats = useMemo(() => (adminBeatsList.length > 0 ? adminBeatsList : beats), [adminBeatsList, beats]);
  const effectiveAdminReleases = useMemo(() => (adminReleasesList.length > 0 ? adminReleasesList : releases), [adminReleasesList, releases]);
  const effectiveAdminGallery = useMemo(() => (adminGalleryList.length > 0 ? adminGalleryList : gallery), [adminGalleryList, gallery]);
  const effectiveAdminTracks = adminTracksList;
  const effectiveAdminVideos = adminVideosList;

  const adminCollections = useMemo(() => ({
    events: effectiveAdminEvents,
    beats: effectiveAdminBeats,
    releases: effectiveAdminReleases,
    tracks: effectiveAdminTracks,
    videos: effectiveAdminVideos,
    gallery: effectiveAdminGallery,
    subscribers: adminSubscribers,
    recycleBin: recycleBinItems,
    orders: adminOrders,
  }), [
    effectiveAdminEvents,
    effectiveAdminBeats,
    effectiveAdminReleases,
    effectiveAdminTracks,
    effectiveAdminVideos,
    effectiveAdminGallery,
    adminSubscribers,
    recycleBinItems,
    adminOrders,
  ]);

  // Admin module filtering for administrative workspace navigation
  const matchedAdminModules = useMemo(() => {
    if (!query || !query.trim()) return ADMIN_MODULES;
    const q = query.trim().toLowerCase();
    const queryTokens = q.split(/[\s,.-]+/).filter((t) => t.length >= 2);

    return ADMIN_MODULES.filter((m) => {
      const titleLower = m.title.toLowerCase();
      const descLower = m.desc.toLowerCase();
      if (titleLower.includes(q) || descLower.includes(q)) return true;

      return queryTokens.some((token) => {
        const stemmed = token.replace(/e?s$/, "");
        if (titleLower.includes(token) || (stemmed.length >= 3 && titleLower.includes(stemmed))) return true;
        if (m.slug.includes(token) || (stemmed.length >= 3 && m.slug.includes(stemmed))) return true;
        if (Array.isArray(m.keywords)) {
          return m.keywords.some((k) => {
            const kStemmed = k.replace(/e?s$/, "");
            return k.includes(token) || token.includes(k) || (stemmed.length >= 3 && kStemmed === stemmed);
          });
        }
        return false;
      });
    });
  }, [query]);

  // Admin intent detection for natural language administrative commands
  const adminTaskIntent = useMemo(() => {
    if (!isAdminMode || !query || query.trim().length < 2) return null;
    return parseAdminExecutiveIntent(query, location.pathname, adminCollections);
  }, [isAdminMode, query, location.pathname, adminCollections]);

  // Admin entities live matching
  const adminBeats = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2 && !["delete", "remove", "trash", "beat", "beats", "edit", "create", "show"].includes(t));
    const searchTarget = tokens.length > 0 ? tokens : [q];

    return effectiveAdminBeats.filter((b) => {
      const title = (b.title || "").toLowerCase();
      const genre = (b.genre || "").toLowerCase();
      const bpm = String(b.bpm || "");
      const key = (b.key || "").toLowerCase();
      if (title.includes(q) || genre.includes(q) || bpm.includes(q) || key.includes(q)) return true;
      return searchTarget.some((t) => title.includes(t) || genre.includes(t) || key.includes(t));
    }).slice(0, 5);
  }, [effectiveAdminBeats, query]);

  const adminReleases = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2 && !["delete", "remove", "trash", "release", "releases", "album", "music", "edit", "create", "show"].includes(t));
    const searchTarget = tokens.length > 0 ? tokens : [q];

    return effectiveAdminReleases.filter((r) => {
      const title = (r.title || "").toLowerCase();
      const genre = (r.genre || "").toLowerCase();
      const year = String(r.year || "");
      if (title.includes(q) || genre.includes(q) || year.includes(q)) return true;
      return searchTarget.some((t) => title.includes(t) || genre.includes(t));
    }).slice(0, 4);
  }, [effectiveAdminReleases, query]);

  const adminEvents = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2 && !["delete", "remove", "trash", "event", "events", "concert", "tour", "edit", "create", "show"].includes(t));
    const searchTarget = tokens.length > 0 ? tokens : [q];

    return effectiveAdminEvents.filter((e) => {
      const title = (e.title || "").toLowerCase();
      const city = (e.city || "").toLowerCase();
      const venue = (e.venue_name || e.venue || "").toLowerCase();
      if (title.includes(q) || city.includes(q) || venue.includes(q)) return true;
      return searchTarget.some((t) => title.includes(t) || city.includes(t) || venue.includes(t));
    }).slice(0, 4);
  }, [effectiveAdminEvents, query]);

  const adminGallery = useMemo(() => {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length >= 2 && !["delete", "remove", "trash", "gallery", "photo", "image", "edit", "create", "show"].includes(t));
    const searchTarget = tokens.length > 0 ? tokens : [q];

    return effectiveAdminGallery.filter((g) => {
      const title = (g.title || g.caption || "").toLowerCase();
      const category = (g.category || "").toLowerCase();
      if (title.includes(q) || category.includes(q)) return true;
      return searchTarget.some((t) => title.includes(t) || category.includes(t));
    }).slice(0, 4);
  }, [effectiveAdminGallery, query]);

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
          {isAdminMode ? (
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
              <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.08.49.08 1.01 0 1.5l1.64 1.28-.7 1.21-1.93-.78a6.38 6.38 0 0 1-1.3 1.3l.78 1.93-1.21.7-1.28-1.64a6.38 6.38 0 0 1-1.5 0l-1.28 1.64-1.21-.7.78-1.93a6.38 6.38 0 0 1-1.3-1.3l-1.93.78-.7-1.21 1.64-1.28a6.38 6.38 0 0 1 0-1.5l-1.64-1.28.7-1.21 1.93.78a6.38 6.38 0 0 1 1.3-1.3l-.78-1.93 1.21-.7 1.28 1.64c.49-.08 1.01-.08 1.5 0l1.28-1.64 1.21.7-.78 1.93a6.38 6.38 0 0 1 1.3 1.3l1.93-.78.7 1.21-1.64 1.28z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
              <path d="M12 2C12 7.523 16.477 12 22 12C16.477 12 12 16.477 12 22C12 16.477 7.523 12 2 12C7.523 12 12 7.523 12 2Z" />
            </svg>
          )}
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
                <div className="chomka-ai-header-center">
                  <div className="chomka-ai-title-row">
                    <span className="chomka-ai-sparkle-icon" aria-hidden="true">
                      {isAdminMode ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
                          <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.08.49.08 1.01 0 1.5l1.64 1.28-.7 1.21-1.93-.78a6.38 6.38 0 0 1-1.3 1.3l.78 1.93-1.21.7-1.28-1.64a6.38 6.38 0 0 1-1.5 0l-1.28 1.64-1.21-.7.78-1.93a6.38 6.38 0 0 1-1.3-1.3l-1.93.78-.7-1.21 1.64-1.28a6.38 6.38 0 0 1 0-1.5l-1.64-1.28.7-1.21 1.93.78a6.38 6.38 0 0 1 1.3-1.3l-.78-1.93 1.21-.7 1.28 1.64c.49-.08 1.01-.08 1.5 0l1.28-1.64 1.21.7-.78 1.93a6.38 6.38 0 0 1 1.3 1.3l1.93-.78.7 1.21-1.64 1.28z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C12 7.523 16.477 12 22 12C16.477 12 12 16.477 12 22C12 16.477 7.523 12 2 12C7.523 12 12 7.523 12 2Z" />
                        </svg>
                      )}
                    </span>
                    <h2 className="chomka-ai-title">
                      {isAdminMode ? (
                        <>
                          <span>CHOMKA ADMIN AI</span>
                          <span className="chomka-ai-title-sub"> · EXECUTIVE CONSOLE</span>
                        </>
                      ) : (
                        <>
                          <span>CHOMKA AI</span>
                          <span className="chomka-ai-title-sub"> · CHOMKAMUSIC™</span>
                        </>
                      )}
                    </h2>
                  </div>
                  <div className="chomka-ai-status">
                    <span className="chomka-ai-status-dot" aria-hidden="true" />
                    <span>
                      {isAdminMode
                        ? `AUTHENTICATED CMS · ${user?.email || "ADMIN"}`
                        : "CATALOGUE & CHOMKAMUSIC™ STUDIO CONCIERGE"}
                    </span>
                  </div>

                  {isEligibleForAdminAi && (
                    <div className="chomka-ai-mode-pills" role="tablist" aria-label="Console mode">
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
                </div>

                <div className="chomka-ai-header-actions">
                  <button
                    type="button"
                    className="chomka-ai-close-btn"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close search console (Press ESC)"
                    title="Close console (ESC)"
                  >
                    <kbd className="chomka-ai-esc-kbd">ESC</kbd>
                    <span className="chomka-ai-esc-label">TO CLOSE</span>
                    <span className="chomka-ai-close-sep" aria-hidden="true" />
                    <span className="chomka-ai-close-x" aria-hidden="true">✕</span>
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
                      onClick={() => setQuery("delete event")}
                      style={{ borderColor: "rgba(239, 68, 68, 0.45)", color: "#f87171", background: "rgba(239, 68, 68, 0.08)" }}
                    >
                      🗑️ Delete Event
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("schedule event")}
                    >
                      🎟️ Schedule Event
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("create beat")}
                    >
                      🥁 Create Beat
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("purge recycle bin")}
                    >
                      🧹 Purge Trash
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("sync catalogue")}
                    >
                      🔄 Sync Cache
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
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("when did silachomka release dps?")}
                    >
                      🎵 When did silachomka release DPS?
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("what is the latest release?")}
                    >
                      🔥 Latest Release
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("i want to buy a silachomka beat and pay for recording session of 3 hrs on the nearest opened session date")}
                    >
                      ⚡ Beat + 3hr Recording Session
                    </button>
                    <button
                      type="button"
                      className="chomka-ai-chip"
                      onClick={() => setQuery("Book 3 hours voice recording on nearest open date")}
                    >
                      🎙️ 3 Hrs Vocal Tracking
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
                      onClick={() => setQuery("Live concert dates")}
                    >
                      🎟️ Live Events
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
                    {/* Process Card 0: Delete Entity (Move to Recycle Bin) */}
                    {adminTaskIntent?.type === "DELETE_ENTITY" && (
                      <div className="chomka-ai-process-card chomka-ai-process-card--danger">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge is-danger">
                            ⚡ EXECUTIVE ACTION · MOVE TO RECYCLE BIN
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--gold)" }}>
                            {adminTaskIntent.candidates?.length || 0} active {adminTaskIntent.entityPlural?.toLowerCase() || "records"}
                          </span>
                        </div>
                        <h3 className="chomka-ai-process-title">{adminTaskIntent.title}</h3>
                        <p className="chomka-ai-process-desc">{adminTaskIntent.desc}</p>

                        {/* Live Action Feedback with Undo */}
                        {lastActionFeedback && (
                          <div className={`chomka-ai-process-alert ${lastActionFeedback.type === "error" ? "is-error" : ""}`}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "10px" }}>
                              <span>{lastActionFeedback.message}</span>
                              {lastActionFeedback.undoItem && (
                                <button
                                  type="button"
                                  className="chomka-ai-undo-btn"
                                  onClick={() => handleExecuteUndo(lastActionFeedback.undoItem)}
                                  disabled={isExecutingAction}
                                >
                                  ↺ Undo & Restore
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Specific Matched Item Confirmation */}
                        {adminTaskIntent.matchedItem && (
                          <div className="chomka-ai-confirm-box">
                            <div className="chomka-ai-confirm-details">
                              <span className="chomka-ai-entity-badge">{adminTaskIntent.entityLabel?.toUpperCase()}</span>
                              <strong style={{ fontSize: "14px", color: "#fff" }}>
                                {adminTaskIntent.matchedItem.title || adminTaskIntent.matchedItem.name || adminTaskIntent.matchedItem.email}
                              </strong>
                              {adminTaskIntent.matchedItem.event_date && (
                                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                  📅 {adminTaskIntent.matchedItem.event_date} {adminTaskIntent.matchedItem.venue_name || adminTaskIntent.matchedItem.venue ? `· 📍 ${adminTaskIntent.matchedItem.venue_name || adminTaskIntent.matchedItem.venue}` : ""}
                                </span>
                              )}
                              {adminTaskIntent.matchedItem.bpm && (
                                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                  🥁 {adminTaskIntent.matchedItem.genre} · {adminTaskIntent.matchedItem.bpm} BPM
                                </span>
                              )}
                              {adminTaskIntent.matchedItem.year && (
                                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                  🎵 {adminTaskIntent.matchedItem.year} · {adminTaskIntent.matchedItem.type}
                                </span>
                              )}
                            </div>
                            <div className="chomka-ai-process-actions" style={{ marginTop: "12px" }}>
                              <button
                                type="button"
                                className="chomka-ai-process-btn is-danger"
                                onClick={() =>
                                  handleExecuteDelete(
                                    adminTaskIntent.entityType,
                                    adminTaskIntent.matchedItem.id || adminTaskIntent.matchedItem.slug,
                                    adminTaskIntent.matchedItem.title || adminTaskIntent.matchedItem.name
                                  )
                                }
                                disabled={isExecutingAction && executingEntityId === (adminTaskIntent.matchedItem.id || adminTaskIntent.matchedItem.slug)}
                              >
                                {isExecutingAction && executingEntityId === (adminTaskIntent.matchedItem.id || adminTaskIntent.matchedItem.slug)
                                  ? "Moving to Recycle Bin..."
                                  : "🗑️ Confirm: Move to Recycle Bin"}
                              </button>
                              <button
                                type="button"
                                className="chomka-ai-process-btn is-secondary"
                                onClick={() => handleAdminNavigate(adminTaskIntent.targetPath, adminTaskIntent.matchedItem.title)}
                              >
                                Edit in CMS →
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Candidate list to choose from */}
                        {(!adminTaskIntent.matchedItem || adminTaskIntent.candidates?.length > 1) && (
                          <div className="chomka-ai-action-list-wrap">
                            <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                              {adminTaskIntent.matchedItem ? "Other Active Records:" : `Select ${adminTaskIntent.entityLabel} to Move to Trash:`}
                            </div>
                            <div className="chomka-ai-action-items-list">
                              {adminTaskIntent.candidates?.length === 0 ? (
                                <div style={{ padding: "16px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                                  No active {adminTaskIntent.entityPlural?.toLowerCase() || "records"} found in this category.
                                </div>
                              ) : (
                                adminTaskIntent.candidates.slice(0, 8).map((item) => {
                                  const itemId = item.id || item.slug;
                                  const itemTitle = item.title || item.name || item.email || `Record #${itemId}`;
                                  const isDeletingThis = isExecutingAction && executingEntityId === itemId;
                                  return (
                                    <div key={itemId} className="chomka-ai-entity-row chomka-ai-entity-row--action">
                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                          <strong style={{ fontSize: "12px", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {itemTitle}
                                          </strong>
                                          {item.ticket_status && (
                                            <span className="chomka-ai-entity-badge" style={{ fontSize: "8px", padding: "1px 4px" }}>
                                              {item.ticket_status}
                                            </span>
                                          )}
                                        </div>
                                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                                          {item.event_date ? `📅 ${item.event_date}` : ""}
                                          {item.venue_name || item.venue ? ` · 📍 ${item.venue_name || item.venue}` : ""}
                                          {item.city ? `, ${item.city}` : ""}
                                          {item.genre ? `🥁 ${item.genre}` : ""}
                                          {item.bpm ? ` · ${item.bpm} BPM` : ""}
                                          {item.year ? `🎵 ${item.year}` : ""}
                                          {item.category ? `📸 ${item.category}` : ""}
                                        </span>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                        <button
                                          type="button"
                                          className="chomka-ai-row-delete-btn"
                                          onClick={() => handleExecuteDelete(adminTaskIntent.entityType, itemId, itemTitle)}
                                          disabled={isDeletingThis}
                                          title="Move to Recycle Bin"
                                        >
                                          {isDeletingThis ? "Deleting..." : "🗑️ Move to Trash"}
                                        </button>
                                        <button
                                          type="button"
                                          className="chomka-ai-row-view-btn"
                                          onClick={() => handleAdminNavigate(adminTaskIntent.targetPath, itemTitle)}
                                          title="Open in CMS"
                                        >
                                          Edit →
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        <div className="chomka-ai-process-actions" style={{ marginTop: "10px" }}>
                          <button
                            type="button"
                            className="chomka-ai-process-btn is-secondary"
                            onClick={() => handleAdminNavigate(adminTaskIntent.targetPath, "")}
                          >
                            Open Full {adminTaskIntent.entityPlural} CMS →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Process Card: Create Entity */}
                    {adminTaskIntent?.type === "CREATE_ENTITY" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">⚡ ADMINISTRATIVE ACTION</span>
                          <span style={{ fontSize: "11px", color: "var(--gold)" }}>
                            {adminStats[adminTaskIntent.entityType] ?? 0} existing records
                          </span>
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

                    {/* Process Card: Edit Entity */}
                    {adminTaskIntent?.type === "EDIT_ENTITY" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">✏️ EDIT CMS RECORD</span>
                          <span style={{ fontSize: "11px", color: "var(--gold)" }}>
                            {adminTaskIntent.candidates?.length || 0} matching records
                          </span>
                        </div>
                        <h3 className="chomka-ai-process-title">{adminTaskIntent.title}</h3>
                        <p className="chomka-ai-process-desc">{adminTaskIntent.desc}</p>
                        <div className="chomka-ai-action-items-list" style={{ marginTop: "8px" }}>
                          {adminTaskIntent.candidates?.slice(0, 6).map((item) => {
                            const itemId = item.id || item.slug;
                            const itemTitle = item.title || item.name || item.email || `Record #${itemId}`;
                            return (
                              <div key={itemId} className="chomka-ai-entity-row chomka-ai-entity-row--action">
                                <div>
                                  <strong style={{ fontSize: "12px", color: "#fff" }}>{itemTitle}</strong>
                                  <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                                    {item.event_date ? `📅 ${item.event_date}` : ""}
                                    {item.venue_name || item.venue ? ` · 📍 ${item.venue_name || item.venue}` : ""}
                                    {item.genre ? `🥁 ${item.genre}` : ""}
                                    {item.year ? `🎵 ${item.year}` : ""}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="chomka-ai-row-view-btn"
                                  onClick={() => handleAdminNavigate(adminTaskIntent.targetPath, itemTitle)}
                                >
                                  Open Editor →
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Process Card: List Entities / Directory */}
                    {adminTaskIntent?.type === "LIST_ENTITIES" && (
                      <div className="chomka-ai-process-card">
                        <div className="chomka-ai-process-header">
                          <span className="chomka-ai-process-badge">✦ ACTIVE DIRECTORY</span>
                          <span style={{ fontSize: "11px", color: "var(--gold)" }}>
                            {adminTaskIntent.candidates?.length || 0} active {adminTaskIntent.entityPlural?.toLowerCase() || "records"}
                          </span>
                        </div>
                        <h3 className="chomka-ai-process-title">{adminTaskIntent.title}</h3>
                        <p className="chomka-ai-process-desc">{adminTaskIntent.desc}</p>

                        {/* Live Action Feedback */}
                        {lastActionFeedback && (
                          <div className={`chomka-ai-process-alert ${lastActionFeedback.type === "error" ? "is-error" : ""}`}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "10px" }}>
                              <span>{lastActionFeedback.message}</span>
                              {lastActionFeedback.undoItem && (
                                <button
                                  type="button"
                                  className="chomka-ai-undo-btn"
                                  onClick={() => handleExecuteUndo(lastActionFeedback.undoItem)}
                                  disabled={isExecutingAction}
                                >
                                  ↺ Undo & Restore
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="chomka-ai-action-items-list" style={{ marginTop: "8px" }}>
                          {adminTaskIntent.candidates?.slice(0, 6).map((item) => {
                            const itemId = item.id || item.slug;
                            const itemTitle = item.title || item.name || item.email || `Record #${itemId}`;
                            const isDeletingThis = isExecutingAction && executingEntityId === itemId;
                            return (
                              <div key={itemId} className="chomka-ai-entity-row chomka-ai-entity-row--action">
                                <div>
                                  <strong style={{ fontSize: "12px", color: "#fff" }}>{itemTitle}</strong>
                                  <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                                    {item.event_date ? `📅 ${item.event_date}` : ""}
                                    {item.venue_name || item.venue ? ` · 📍 ${item.venue_name || item.venue}` : ""}
                                    {item.genre ? `🥁 ${item.genre}` : ""}
                                    {item.year ? `🎵 ${item.year}` : ""}
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <button
                                    type="button"
                                    className="chomka-ai-row-delete-btn"
                                    onClick={() => handleExecuteDelete(adminTaskIntent.entityType, itemId, itemTitle)}
                                    disabled={isDeletingThis}
                                  >
                                    {isDeletingThis ? "Deleting..." : "🗑️ Trash"}
                                  </button>
                                  <button
                                    type="button"
                                    className="chomka-ai-row-view-btn"
                                    onClick={() => handleAdminNavigate(adminTaskIntent.targetPath, itemTitle)}
                                  >
                                    Edit →
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="chomka-ai-process-actions" style={{ marginTop: "10px" }}>
                          <button
                            type="button"
                            className="chomka-ai-process-btn is-secondary"
                            onClick={() => handleAdminNavigate(adminTaskIntent.targetPath, "")}
                          >
                            Open Full {adminTaskIntent.entityPlural} CMS →
                          </button>
                        </div>
                      </div>
                    )}

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
                                Try administrative commands like "delete event", "schedule event", "create beat", "purge recycle bin", or "sync catalogue".
                              </p>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "14px", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="studio-pill-btn"
                                  onClick={() => setQuery("delete event")}
                                  style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.4)" }}
                                >
                                  🗑️ Delete Event
                                </button>
                                <button
                                  type="button"
                                  className="studio-pill-btn"
                                  onClick={() => setQuery("schedule event")}
                                  style={{ background: "rgba(223, 194, 125, 0.15)", color: "var(--gold)" }}
                                >
                                  🎟️ Schedule Event
                                </button>
                                <button
                                  type="button"
                                  className="studio-pill-btn"
                                  onClick={() => setQuery("")}
                                  style={{ background: "rgba(255, 255, 255, 0.08)", color: "#fff" }}
                                >
                                  📊 System Overview
                                </button>
                              </div>
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

                        {/* Scheduled Session Date & Slot Banner */}
                        {bookingProposal.bookingDate && (
                          <div className="chomka-ai-proposal-schedule-card">
                            <div className="chomka-ai-schedule-badge-row">
                              <span className="chomka-ai-schedule-chip">
                                📅 {bookingProposal.schedule?.label || "NEAREST OPENED SESSION DATE"}
                              </span>
                              <span className="chomka-ai-schedule-status">
                                {bookingProposal.schedule?.source === "calendar_availability"
                                  ? "✓ CONFIRMED OPEN STUDIO SLOT"
                                  : "⚡ PRIORITY RESERVATION LOCK"}
                              </span>
                            </div>
                            <div className="chomka-ai-schedule-main">
                              <div className="chomka-ai-schedule-date-text">
                                {formatLongDate(bookingProposal.bookingDate)}
                              </div>
                              <div className="chomka-ai-schedule-time-text">
                                Studio Slot: <strong>{bookingProposal.bookingTime || "10:00 AM"}</strong>
                                {bookingProposal.services.find((s) => s.slug === "voice-recording" || s.isHourly)?.quantity
                                  ? ` · ${bookingProposal.services.find((s) => s.slug === "voice-recording" || s.isHourly).quantity} Hours Studio Booth Tracking`
                                  : ""}
                              </div>
                            </div>
                            {Array.isArray(bookingProposal.schedule?.allSlots) && bookingProposal.schedule.allSlots.length > 1 && (
                              <div className="chomka-ai-schedule-slots-picker">
                                <span className="chomka-ai-slots-picker-label">Available Slots:</span>
                                <div className="chomka-ai-slots-pills">
                                  {bookingProposal.schedule.allSlots.map((slot) => (
                                    <button
                                      key={slot}
                                      type="button"
                                      className={`chomka-ai-slot-btn ${bookingProposal.bookingTime === slot ? "is-selected" : ""}`}
                                      onClick={() => setSelectedSlotOverride(slot)}
                                    >
                                      {slot}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="chomka-ai-proposal-items">
                          {bookingProposal.services.map((svc) => (
                            <div key={svc.slug} className="chomka-ai-proposal-row">
                              <div className="chomka-ai-proposal-item-info">
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

                        {/* Instant Beat Catalogue Alternative if beat requested */}
                        {bookingProposal.isBeatRequested && Array.isArray(bookingProposal.recommendedBeats) && bookingProposal.recommendedBeats.length > 0 && (
                          <div className="chomka-ai-proposal-beats-strip">
                            <div className="chomka-ai-beats-strip-header">
                              <span>🥁 OFFICIAL SILACHOMKA BEATS VAULT</span>
                              <span style={{ fontSize: "10px", color: "var(--gold-light)" }}>
                                Prefer an instant beat lease? License from ₦20,000 / $30
                              </span>
                            </div>
                            <div className="chomka-ai-beats-strip-list">
                              {bookingProposal.recommendedBeats.slice(0, 3).map((beat) => (
                                <div
                                  key={beat.id}
                                  className="chomka-ai-beats-strip-item"
                                  onClick={() => handleSelectResult(`/beats/${beat.slug || beat.id}`, beat.title)}
                                  title="Listen & License Beat"
                                >
                                  <div className="chomka-ai-beats-strip-meta">
                                    <span className="chomka-ai-beats-strip-title">🎵 {beat.title}</span>
                                    <span className="chomka-ai-beats-strip-genre">{beat.genre || "TYPE BEAT"} · {beat.bpm || 120} BPM</span>
                                  </div>
                                  <span className="chomka-ai-beats-strip-btn">PREVIEW & LICENSE →</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

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

                    {/* 2. Direct AI Smart Answer Card (Authoritative Q&A from Knowledge Engine) */}
                    {!bookingProposal && smartAnswer && (
                      <div className="chomka-ai-smart-answer-card">
                        <div className="chomka-ai-answer-header">
                          <div className="chomka-ai-answer-badge">
                            <span className="chomka-ai-sparkle-dot">✦</span>
                            <span>{smartAnswer.badge || "CHOMKA AI ANSWER"}</span>
                          </div>
                          <span className="chomka-ai-answer-verified">✓ VERIFIED ARCHIVE RECORD</span>
                        </div>

                        <div className="chomka-ai-answer-body">
                          <h3 className="chomka-ai-answer-title">{smartAnswer.title}</h3>
                          {smartAnswer.headline && (
                            <div className="chomka-ai-answer-headline">{smartAnswer.headline}</div>
                          )}
                          <p className="chomka-ai-answer-summary">{smartAnswer.summary}</p>

                          {Array.isArray(smartAnswer.facts) && smartAnswer.facts.length > 0 && (
                            <div className="chomka-ai-answer-facts">
                              {smartAnswer.facts.map((fact, idx) => (
                                <div key={idx} className="chomka-ai-fact-pill">
                                  <span className="chomka-ai-fact-label">{fact.label}</span>
                                  <span className="chomka-ai-fact-value">{fact.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {smartAnswer.platforms && typeof smartAnswer.platforms === "object" && (
                            <div className="chomka-ai-stream-strip">
                              <span className="chomka-ai-stream-label">DIRECT STREAMING DESTINATIONS</span>
                              <div className="chomka-ai-stream-links">
                                {smartAnswer.platforms.spotify && (
                                  <a
                                    href={smartAnswer.platforms.spotify}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="chomka-ai-stream-pill spotify"
                                  >
                                    Spotify ↗
                                  </a>
                                )}
                                {(smartAnswer.platforms.appleMusic || smartAnswer.platforms.apple) && (
                                  <a
                                    href={smartAnswer.platforms.appleMusic || smartAnswer.platforms.apple}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="chomka-ai-stream-pill apple"
                                  >
                                    Apple Music ↗
                                  </a>
                                )}
                                {(smartAnswer.platforms.youtubeMusic || smartAnswer.platforms.youtube) && (
                                  <a
                                    href={smartAnswer.platforms.youtubeMusic || smartAnswer.platforms.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="chomka-ai-stream-pill youtube"
                                  >
                                    YouTube ↗
                                  </a>
                                )}
                                {smartAnswer.platforms.audiomack && (
                                  <a
                                    href={smartAnswer.platforms.audiomack}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="chomka-ai-stream-pill audiomack"
                                  >
                                    Audiomack ↗
                                  </a>
                                )}
                                {smartAnswer.platforms.boomplay && (
                                  <a
                                    href={smartAnswer.platforms.boomplay}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="chomka-ai-stream-pill boomplay"
                                  >
                                    Boomplay ↗
                                  </a>
                                )}
                                {smartAnswer.platforms.deezer && (
                                  <a
                                    href={smartAnswer.platforms.deezer}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="chomka-ai-stream-pill deezer"
                                  >
                                    Deezer ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {smartAnswer.actionUrl && (
                            <button
                              type="button"
                              className="chomka-ai-answer-action-btn"
                              onClick={() => handleSelectResult(smartAnswer.actionUrl, smartAnswer.title)}
                            >
                              <span>{smartAnswer.actionText || "VIEW IN CATALOGUE →"}</span>
                              <span>→</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. Structured Search Results */}
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
                      {searchResults?.hasQuery && searchResults?.totalCount === 0 && !bookingProposal && !smartAnswer && (
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

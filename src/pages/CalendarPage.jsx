import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useChomkaStore } from "../data/store";
import { fetchCalendarActivities } from "../data/api";
import SeoHead from "../components/SeoHead";
import SharePageButton from "../components/SharePageButton";
import SubscriberNewsletterBox from "../components/SubscriberNewsletterBox";
import { suppressScroll } from "../App";
import {
  buildCalendarUrl,
  saveCalendarState,
  getSavedCalendarState,
  formatMonthYearParam,
  parseMonthYearParam,
} from "../utils/calendarNavigation";

const TYPE_CONFIG = {
  event: {
    label: "Live Event",
    icon: "🎟️",
    color: "var(--gold)",
    bg: "rgba(212, 175, 55, 0.15)",
    border: "rgba(212, 175, 55, 0.4)",
    action: "View Event Details",
  },
  release: {
    label: "Music Release",
    icon: "🎵",
    color: "#4facfe",
    bg: "rgba(79, 172, 254, 0.15)",
    border: "rgba(79, 172, 254, 0.4)",
    action: "Listen to Release",
  },
  beat: {
    label: "Beat Drop",
    icon: "🎹",
    color: "#b76e79",
    bg: "rgba(183, 110, 121, 0.15)",
    border: "rgba(183, 110, 121, 0.4)",
    action: "Play & License Beat",
  },
  gallery: {
    label: "Gallery Moment",
    icon: "📸",
    color: "#2af598",
    bg: "rgba(42, 245, 152, 0.15)",
    border: "rgba(42, 245, 152, 0.4)",
    action: "View Gallery Moment",
  },
};

function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDateFull(dateStr) {
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

export default function CalendarPage() {
  const { releases, beats, gallery, events } = useChomkaStore();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Load any previously saved session calendar state as fallback
  const savedState = useMemo(() => {
    return getSavedCalendarState() || {};
  }, []);

  // Determine initial view mode: query param > location.state > savedState > "GRID"
  const initialViewMode = useMemo(() => {
    const fromParam = searchParams.get("view");
    if (fromParam) {
      return fromParam.toUpperCase() === "TIMELINE" ? "TIMELINE" : "GRID";
    }
    if (location.state?.viewMode) return location.state.viewMode;
    if (savedState.viewMode) return savedState.viewMode;
    return "GRID";
  }, [searchParams, location.state, savedState]);

  // Determine initial filter: query param > location.state > savedState > "ALL"
  const initialFilter = useMemo(() => {
    const fromParam = searchParams.get("filter");
    const valid = ["ALL", "event", "release", "beat", "gallery"];
    if (fromParam && valid.includes(fromParam)) return fromParam;
    if (location.state?.activeFilter && valid.includes(location.state.activeFilter)) return location.state.activeFilter;
    if (savedState.activeFilter && valid.includes(savedState.activeFilter)) return savedState.activeFilter;
    return "ALL";
  }, [searchParams, location.state, savedState]);

  // Determine initial search: query param > location.state > savedState > ""
  const initialSearch = useMemo(() => {
    return searchParams.get("q") ?? location.state?.searchQuery ?? savedState.searchQuery ?? "";
  }, [searchParams, location.state, savedState]);

  // Determine initial date & month
  const initialDateAndMonth = useMemo(() => {
    const dateParam = searchParams.get("date") || location.state?.selectedDateStr || savedState.selectedDateStr || null;
    const monthParam = searchParams.get("month");

    let targetDate = new Date();
    if (monthParam) {
      const parsed = parseMonthYearParam(monthParam);
      if (parsed) targetDate = parsed;
    } else if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) {
        targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    } else if (savedState.currentDate) {
      const parsed = new Date(savedState.currentDate);
      if (!isNaN(parsed.getTime())) {
        targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }

    return {
      currentDate: targetDate,
      selectedDateStr: dateParam,
    };
  }, [searchParams, location.state, savedState]);

  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [currentDate, setCurrentDate] = useState(initialDateAndMonth.currentDate);
  const [selectedDateStr, setSelectedDateStr] = useState(initialDateAndMonth.selectedDateStr);

  // Target scroll position and targeted activity ID for restoration
  const targetScrollYRef = useRef(
    searchParams.get("scrollY") ? parseInt(searchParams.get("scrollY"), 10) :
    location.state?.scrollY !== undefined ? location.state.scrollY :
    savedState.scrollY !== undefined ? savedState.scrollY : null
  );
  const targetActIdRef = useRef(
    searchParams.get("actId") || location.state?.actId || savedState.actId || null
  );

  // Fetch activities from API, falling back to local store
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const fetched = await fetchCalendarActivities();
        if (mounted && Array.isArray(fetched) && fetched.length > 0) {
          setActivities(fetched);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Could not fetch remote calendar, using local store:", err);
      }

      // Local fallback derivation
      if (mounted) {
        const derived = [];
        (releases || []).forEach((r) => {
          if (r.release_date || r.date) {
            derived.push({
              id: `rel-${r.id || r.slug}`,
              title: r.title,
              slug: r.slug,
              subtype: r.type || "Release",
              date: (r.release_date || r.date || "").slice(0, 10),
              image: r.cover || "",
              type: "release",
              badge: "MUSIC RELEASE",
              url: `/release/${r.slug}`,
            });
          }
        });

        (beats || []).forEach((b) => {
          derived.push({
            id: `beat-${b.id}`,
            title: b.title,
            slug: b.slug,
            subtype: b.genre || `${b.bpm || ""} BPM`,
            date: (b.created_at || "2026-01-01").slice(0, 10),
            image: b.cover || b.artwork_url || "",
            type: "beat",
            badge: "BEAT",
            url: `/beats/${b.slug || b.id}`,
          });
        });

        (gallery || []).forEach((g) => {
          derived.push({
            id: `gal-${g.id}`,
            title: g.title || "Gallery Moment",
            slug: g.slug || String(g.id),
            subtype: g.category || "Moment",
            date: (g.display_date || g.created_at || "2026-01-01").slice(0, 10),
            image: g.asset || g.src || "",
            type: "gallery",
            badge: "GALLERY MOMENT",
            url: `/gallery/${g.slug || g.id}`,
          });
        });

        (events || []).forEach((e) => {
          if (e.event_date) {
            derived.push({
              id: `evt-${e.id}`,
              title: e.title,
              slug: e.slug,
              subtype: e.venue_name || e.city || "Sanctuary",
              date: e.event_date.slice(0, 10),
              image: e.primary_artwork_url || e.cover || "",
              type: "event",
              badge: "LIVE EVENT",
              url: `/events/${e.slug}`,
            });
          }
        });

        derived.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivities(derived);
        setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [releases, beats, gallery, events]);

  // Filter and search
  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      if (activeFilter !== "ALL" && item.type !== activeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchSubtype = (item.subtype || "").toLowerCase().includes(q);
        const matchDate = (item.date || "").toLowerCase().includes(q);
        return matchTitle || matchSubtype || matchDate;
      }
      return true;
    });
  }, [activities, activeFilter, searchQuery]);

  // Counts by type
  const counts = useMemo(() => {
    const res = { ALL: activities.length, event: 0, release: 0, beat: 0, gallery: 0 };
    activities.forEach((a) => {
      if (res[a.type] !== undefined) res[a.type]++;
    });
    return res;
  }, [activities]);

  // Group by date map for month grid: { 'YYYY-MM-DD': [activities] }
  const activitiesByDate = useMemo(() => {
    const map = {};
    filteredActivities.forEach((act) => {
      if (!act.date) return;
      const key = act.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(act);
    });
    return map;
  }, [filteredActivities]);

  const selectedDayActivities = useMemo(() => {
    if (!selectedDateStr) return null;
    return activitiesByDate[selectedDateStr] || [];
  }, [selectedDateStr, activitiesByDate]);

  // Generate days for Month Grid
  const gridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayIndex = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    const days = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayIndex; i++) {
      days.push({ empty: true, key: `empty-prev-${i}` });
    }

    // Days in current month
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      // Format as YYYY-MM-DD local
      const yStr = String(year);
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateKey = `${yStr}-${mStr}-${dStr}`;

      const acts = activitiesByDate[dateKey] || [];
      const isToday = dateKey === todayStr;

      days.push({
        empty: false,
        dayNum: d,
        dateKey,
        dateObj,
        activities: acts,
        isToday,
      });
    }

    return days;
  }, [currentDate, activitiesByDate]);

  // Synchronize state with URL search parameters
  const syncParams = useCallback((newOverrides = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const effective = {
        view: viewMode === "TIMELINE" ? "timeline" : null,
        filter: activeFilter !== "ALL" ? activeFilter : null,
        q: searchQuery.trim() ? searchQuery.trim() : null,
        month: formatMonthYearParam(currentDate),
        date: selectedDateStr || null,
        ...newOverrides,
      };

      Object.entries(effective).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "" || (k === "view" && v === "grid") || (k === "filter" && v === "ALL")) {
          next.delete(k);
        } else {
          next.set(k, v);
        }
      });
      return next;
    }, { replace: true });
  }, [viewMode, activeFilter, searchQuery, currentDate, selectedDateStr, setSearchParams]);

  // Save current state in sessionStorage for session persistence
  useEffect(() => {
    saveCalendarState({
      viewMode,
      activeFilter,
      searchQuery,
      currentDate: currentDate.toISOString(),
      selectedDateStr,
      scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      returnUrl: buildCalendarUrl({
        viewMode,
        activeFilter,
        searchQuery,
        currentDate,
        selectedDateStr,
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
      }),
    });
  }, [viewMode, activeFilter, searchQuery, currentDate, selectedDateStr]);

  // Restore scroll position or target element after activities have loaded
  useEffect(() => {
    if (!loading) {
      const targetScrollY = targetScrollYRef.current;
      const targetActId = targetActIdRef.current;

      if (typeof targetScrollY === "number" && targetScrollY > 0) {
        suppressScroll();
        window.scrollTo({ top: targetScrollY, behavior: "instant" });
        const timer1 = setTimeout(() => {
          window.scrollTo({ top: targetScrollY, behavior: "instant" });
        }, 60);
        const timer2 = setTimeout(() => {
          window.scrollTo({ top: targetScrollY, behavior: "instant" });
          targetScrollYRef.current = null;
        }, 200);
        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
        };
      } else if (targetActId) {
        suppressScroll();
        const el = document.getElementById(`cal-act-${targetActId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        targetActIdRef.current = null;
      }
    }
  }, [loading]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(nextDate);
    setSelectedDateStr(null);
    syncParams({
      month: formatMonthYearParam(nextDate),
      date: null,
    });
  };

  const handleNextMonth = () => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(nextDate);
    setSelectedDateStr(null);
    syncParams({
      month: formatMonthYearParam(nextDate),
      date: null,
    });
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    const nowStr = now.toISOString().slice(0, 10);
    const acts = activitiesByDate[nowStr] || null;
    setSelectedDateStr(acts ? nowStr : null);
    syncParams({
      month: formatMonthYearParam(now),
      date: acts ? nowStr : null,
    });
  };

  const handleDayClick = (day) => {
    if (day.empty) return;
    setSelectedDateStr(day.dateKey);
    syncParams({
      date: day.dateKey,
    });
  };

  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
    syncParams({ filter: newFilter });
  };

  const handleViewModeChange = (newMode) => {
    setViewMode(newMode);
    syncParams({ view: newMode === "TIMELINE" ? "timeline" : null });
  };

  const handleSearchChange = (q) => {
    setSearchQuery(q);
    syncParams({ q: q.trim() || null });
  };

  const handleActivityClick = useCallback((act) => {
    const currentScroll = typeof window !== "undefined" ? window.scrollY : 0;
    const returnUrl = buildCalendarUrl({
      viewMode,
      activeFilter,
      searchQuery,
      currentDate,
      selectedDateStr,
      scrollY: currentScroll,
      actId: act?.id,
    });
    saveCalendarState({
      viewMode,
      activeFilter,
      searchQuery,
      currentDate: currentDate.toISOString(),
      selectedDateStr,
      scrollY: currentScroll,
      actId: act?.id,
      returnUrl,
    });
  }, [viewMode, activeFilter, searchQuery, currentDate, selectedDateStr]);

  const getActivityLinkProps = useCallback((act) => {
    const currentScroll = typeof window !== "undefined" ? window.scrollY : 0;
    const returnUrl = buildCalendarUrl({
      viewMode,
      activeFilter,
      searchQuery,
      currentDate,
      selectedDateStr,
      scrollY: currentScroll,
      actId: act?.id,
    });

    return {
      to: {
        pathname: act.url,
        search: "?from=calendar",
      },
      state: {
        from: "calendar",
        returnUrl,
        scrollY: currentScroll,
        actId: act?.id,
      },
      onClick: () => handleActivityClick(act),
    };
  }, [viewMode, activeFilter, searchQuery, currentDate, selectedDateStr, handleActivityClick]);

  // Group by Month & Year for Timeline view
  const groupedTimeline = useMemo(() => {
    const groups = {};
    filteredActivities.forEach((act) => {
      if (!act.date) return;
      const d = new Date(act.date);
      const groupKey = isNaN(d.getTime()) ? "Archive" : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(act);
    });
    return Object.entries(groups);
  }, [filteredActivities]);

  return (
    <div className="calendar-page-view">
      <SeoHead
        title="Unified Activity Calendar — silachomka"
        description="Comprehensive chronological timeline of silachomka music releases, beat drops, gallery moments, and live concert events."
        path="/calendar"
      />

      <main className="calendar-page-container">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="events-breadcrumb">
          <ol>
            <li><Link to="/">Home</Link></li>
            <li>/</li>
            <li aria-current="page">Unified Activity Calendar</li>
          </ol>
        </nav>

        {/* Page Header */}
        <header className="calendar-header">
          <div className="calendar-header-content">
            <p className="eyebrow">CHOMKA TIMELINE & ARCHIVE</p>
            <h1 className="calendar-title">Unified Activity Calendar</h1>
            <p className="calendar-subtitle">
              Every musical release, studio beat drop, visual gallery moment, and live concert gathering unified in one chronological continuum.
            </p>
          </div>
          <div className="calendar-header-actions">
            <SharePageButton
              title="Unified Activity Calendar — silachomka"
              label="Share Calendar"
            />
          </div>
        </header>

        {/* Controls Bar: View Toggle & Search */}
        <div className="calendar-controls-bar">
          {/* Category Filter Pills */}
          <div className="calendar-filter-pills">
            <button
              type="button"
              className={`calendar-pill ${activeFilter === "ALL" ? "is-active" : ""}`}
              onClick={() => handleFilterChange("ALL")}
            >
              All Activities ({counts.ALL})
            </button>
            <button
              type="button"
              className={`calendar-pill event-pill ${activeFilter === "event" ? "is-active" : ""}`}
              onClick={() => handleFilterChange("event")}
            >
              🎟️ Live Events ({counts.event})
            </button>
            <button
              type="button"
              className={`calendar-pill release-pill ${activeFilter === "release" ? "is-active" : ""}`}
              onClick={() => handleFilterChange("release")}
            >
              🎵 Music Releases ({counts.release})
            </button>
            <button
              type="button"
              className={`calendar-pill beat-pill ${activeFilter === "beat" ? "is-active" : ""}`}
              onClick={() => handleFilterChange("beat")}
            >
              🎹 Studio Beats ({counts.beat})
            </button>
            <button
              type="button"
              className={`calendar-pill gallery-pill ${activeFilter === "gallery" ? "is-active" : ""}`}
              onClick={() => handleFilterChange("gallery")}
            >
              📸 Gallery Moments ({counts.gallery})
            </button>
          </div>

          <div className="calendar-view-tools">
            <div className="calendar-search-wrap">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="calendar-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="calendar-search-clear"
                  onClick={() => handleSearchChange("")}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="calendar-mode-toggle">
              <button
                type="button"
                className={`calendar-mode-btn ${viewMode === "GRID" ? "is-active" : ""}`}
                onClick={() => handleViewModeChange("GRID")}
                title="Month Grid View"
              >
                📅 Grid
              </button>
              <button
                type="button"
                className={`calendar-mode-btn ${viewMode === "TIMELINE" ? "is-active" : ""}`}
                onClick={() => handleViewModeChange("TIMELINE")}
                title="Agenda Timeline View"
              >
                📜 Agenda
              </button>
            </div>
          </div>
        </div>

        {/* Main Calendar Content */}
        {loading ? (
          <div className="event-detail-loading">
            <div className="beat-loading-spinner" />
            <p>Loading activity timeline...</p>
          </div>
        ) : viewMode === "GRID" ? (
          /* =========================================================
             MONTH GRID VIEW
             ========================================================= */
          <div className="calendar-grid-card">
            {/* Month Header Nav */}
            <div className="calendar-month-nav">
              <div className="calendar-month-left">
                <h2 className="calendar-month-title">{formatMonthYear(currentDate)}</h2>
              </div>
              <div className="calendar-month-controls">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="calendar-nav-arrow"
                  aria-label="Previous Month"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="calendar-today-btn"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="calendar-nav-arrow"
                  aria-label="Next Month"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="calendar-week-header">
              <span>SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* Days Grid */}
            <div className="calendar-days-grid">
              {gridDays.map((cell, idx) => {
                if (cell.empty) {
                  return <div key={cell.key || idx} className="calendar-day-cell is-empty" />;
                }

                const hasActivities = cell.activities && cell.activities.length > 0;
                const isSelected = selectedDateStr === cell.dateKey;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => handleDayClick(cell)}
                    className={`calendar-day-cell ${cell.isToday ? "is-today" : ""} ${hasActivities ? "has-activities" : ""} ${isSelected ? "is-selected" : ""}`}
                  >
                    <div className="calendar-day-header">
                      <span className="calendar-day-number">{cell.dayNum}</span>
                      {hasActivities && (
                        <span className="calendar-day-count">{cell.activities.length}</span>
                      )}
                    </div>

                    {/* Chips Preview */}
                    <div className="calendar-day-chips">
                      {cell.activities.slice(0, 3).map((act) => {
                        const conf = TYPE_CONFIG[act.type] || TYPE_CONFIG.event;
                        return (
                          <div
                            key={act.id}
                            className={`calendar-chip-dot chip-${act.type}`}
                            title={`${conf.label}: ${act.title}`}
                          >
                            <span className="chip-dot" style={{ backgroundColor: conf.color }} />
                            <span className="chip-label">{act.title}</span>
                          </div>
                        );
                      })}
                      {cell.activities.length > 3 && (
                        <span className="calendar-chip-more">+{cell.activities.length - 3} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Expanded Drawer */}
            {selectedDateStr && (
              <div className="calendar-day-drawer">
                <div className="calendar-drawer-header">
                  <h3>
                    Activities on {formatDateFull(selectedDateStr)} ({selectedDayActivities?.length || 0})
                  </h3>
                  <button
                    type="button"
                    className="calendar-drawer-close"
                    onClick={() => {
                      setSelectedDateStr(null);
                      syncParams({ date: null });
                    }}
                  >
                    ✕ Close
                  </button>
                </div>

                {!selectedDayActivities || selectedDayActivities.length === 0 ? (
                  <p className="calendar-drawer-empty">No scheduled activities or releases recorded on this date.</p>
                ) : (
                  <div className="calendar-drawer-grid">
                    {selectedDayActivities.map((act) => {
                      const conf = TYPE_CONFIG[act.type] || TYPE_CONFIG.event;
                      return (
                        <article key={act.id} id={`cal-act-${act.id}`} className="calendar-drawer-card">
                          <Link {...getActivityLinkProps(act)} className="calendar-drawer-art">
                            <img
                              src={act.image || "/og-image.png"}
                              alt={act.title}
                              onError={(e) => { e.target.src = "/og-image.png"; }}
                            />
                            <span
                              className="calendar-drawer-badge"
                              style={{ backgroundColor: conf.bg, color: conf.color, borderColor: conf.border }}
                            >
                              {conf.icon} {conf.label}
                            </span>
                          </Link>
                          <div className="calendar-drawer-info">
                            <h4 className="calendar-drawer-title">
                              <Link {...getActivityLinkProps(act)}>{act.title}</Link>
                            </h4>
                            {act.subtype && <p className="calendar-drawer-subtype">{act.subtype}</p>}
                            <Link {...getActivityLinkProps(act)} className="calendar-drawer-action-btn">
                              {conf.action} →
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* =========================================================
             CHRONOLOGICAL TIMELINE / AGENDA VIEW
             ========================================================= */
          <div className="calendar-timeline-view">
            {groupedTimeline.length === 0 ? (
              <div className="events-empty-state">
                <div className="events-empty-icon">📅</div>
                <h3>No Activities Found</h3>
                <p>No milestones match your current filter and search criteria.</p>
              </div>
            ) : (
              groupedTimeline.map(([groupName, groupActs]) => (
                <div key={groupName} className="calendar-timeline-group">
                  <div className="calendar-group-heading">
                    <h2>{groupName}</h2>
                    <span className="calendar-group-count">{groupActs.length} {groupActs.length === 1 ? "activity" : "activities"}</span>
                  </div>

                  <div className="calendar-timeline-list">
                    {groupActs.map((act) => {
                      const conf = TYPE_CONFIG[act.type] || TYPE_CONFIG.event;
                      return (
                        <article key={act.id} id={`cal-act-${act.id}`} className={`timeline-entry type-${act.type}`}>
                          <div className="timeline-date-column">
                            <span className="timeline-date-day">
                              {new Date(act.date).getDate() || ""}
                            </span>
                            <span className="timeline-date-weekday">
                              {new Date(act.date).toLocaleDateString("en-US", { weekday: "short" })}
                            </span>
                          </div>

                          <div className="timeline-node-line">
                            <div className="timeline-node-dot" style={{ borderColor: conf.color }} />
                          </div>

                          <div className="timeline-card">
                            <Link {...getActivityLinkProps(act)} className="timeline-art-wrap">
                              <img
                                src={act.image || "/og-image.png"}
                                alt={act.title}
                                loading="lazy"
                                onError={(e) => { e.target.src = "/og-image.png"; }}
                              />
                            </Link>

                            <div className="timeline-details">
                              <div className="timeline-badge-row">
                                <span
                                  className="timeline-type-pill"
                                  style={{ backgroundColor: conf.bg, color: conf.color, borderColor: conf.border }}
                                >
                                  {conf.icon} {conf.label}
                                </span>
                                {act.isFuture && (
                                  <span className="timeline-future-pill">UPCOMING</span>
                                )}
                              </div>

                              <h3 className="timeline-title">
                                <Link {...getActivityLinkProps(act)}>{act.title}</Link>
                              </h3>

                              {act.subtype && (
                                <p className="timeline-subtype">{act.subtype}</p>
                              )}

                              <div className="timeline-actions">
                                <Link {...getActivityLinkProps(act)} className="timeline-cta-btn">
                                  {conf.action} →
                                </Link>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Newsletter */}
        <div style={{ marginTop: "60px" }}>
          <SubscriberNewsletterBox />
        </div>
      </main>
    </div>
  );
}

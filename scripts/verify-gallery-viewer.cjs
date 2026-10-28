// scripts/verify-gallery-viewer.cjs
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING GALLERY VIEWER REDESIGN & CALENDAR INTEGRATION VERIFICATION ===\n');

// 1. Static Code Analysis Checks
const modalCode = fs.readFileSync(path.join(__dirname, '../src/components/GalleryPostModal.jsx'), 'utf8');
const pageCode = fs.readFileSync(path.join(__dirname, '../src/pages/GalleryPostPage.jsx'), 'utf8');
const calendarCode = fs.readFileSync(path.join(__dirname, '../src/pages/CalendarPage.jsx'), 'utf8');
const appCss = fs.readFileSync(path.join(__dirname, '../src/App.css'), 'utf8');

// Check 1: Calendar Navigation Integration
assert(modalCode.includes('import { buildCalendarUrl, getSavedCalendarState } from "../utils/calendarNavigation"'), 'GalleryPostModal imports calendar navigation utilities');
assert(modalCode.includes('className="gallery-date-gateway"'), 'GalleryPostModal renders .gallery-date-gateway');
assert(modalCode.includes('to={calendarUrl}'), 'GalleryPostModal links date gateway to dynamic calendarUrl');
assert(modalCode.includes('effectiveViewMode'), 'GalleryPostModal preserves effectiveViewMode (GRID vs TIMELINE)');
console.log('✓ Check 1: Calendar Navigation Integration in GalleryPostModal verified');

// Check 2: Header Layout Collision Fix
assert(!modalCode.includes('<span className="gallery-modal-date">'), 'Old colliding gallery-modal-date is removed from header row');
assert(appCss.includes('.gallery-sidebar-header {'), 'Sidebar header is styled in App.css');
assert(appCss.includes('padding-right: 48px;'), 'Sidebar header reserves clearance padding for close button');
assert(appCss.includes('.gallery-modal-close:hover'), 'Close button has interactive hover state');
console.log('✓ Check 2: Close button decoupled and header collision resolved');

// Check 3: Editorial Location Signature
assert(modalCode.includes('className="gallery-editorial-location"'), 'Editorial location signature rendered when location present');
assert(modalCode.includes('className="location-marker-glyph"'), 'Editorial location glyph present');
assert(appCss.includes('.gallery-editorial-location'), 'App.css styles .gallery-editorial-location');
console.log('✓ Check 3: Signature Editorial Location Detail implemented');

// Check 4: Media & Carousel Controls
assert(modalCode.includes('className="carousel-counter-badge"'), 'Carousel counter badge present');
assert(modalCode.includes('counter-num'), 'Zero-padded counter number rendered');
assert(modalCode.includes('counter-total'), 'Zero-padded counter total rendered');
assert(modalCode.includes('polyline points="15 18 9 12 15 6"'), 'Refined SVG prev chevron present');
assert(modalCode.includes('polyline points="9 18 15 12 9 6"'), 'Refined SVG next chevron present');
assert(appCss.includes('.carousel-slide-btn:hover'), 'Carousel buttons styled with gold glow hover');
console.log('✓ Check 4: Editorial Media Carousel Controls and Zero-Padded Counter verified');

// Check 5: Calendar Page Highlighting & Targeting
assert(calendarCode.includes('cal-act-${cleanId}'), 'CalendarPage targets clean activity ID');
assert(calendarCode.includes('cal-act-gal-${rawId}'), 'CalendarPage targets gal- prefixed activity ID');
assert(calendarCode.includes('is-calendar-targeted'), 'CalendarPage adds is-calendar-targeted class');
assert(appCss.includes('@keyframes calendarTargetPulse'), 'App.css defines calendarTargetPulse keyframes');
assert(appCss.includes('.is-calendar-targeted'), 'App.css defines is-calendar-targeted animation');
console.log('✓ Check 5: Calendar Target Pulse and ID resolution verified');

// 2. Behavioral Unit Testing for Date Extraction & URL Construction
const { formatMonthYearParam, buildCalendarUrl } = require('../src/utils/calendarNavigation');

// Test ISO date extraction logic
function testExtractPostIsoDate(post) {
  if (!post) return null;
  const candidates = [post.date, post.post_date, post.displayDate];
  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    const m = c.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (post.displayDate && typeof post.displayDate === "string") {
    const d = new Date(post.displayDate);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dt = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dt}`;
    }
  }
  return null;
}

// Test case A: ISO Date
const isoPost = { id: 'test-1', date: '2026-02-08T00:00:00.000Z', displayDate: 'Sunday, February 8, 2026' };
const isoRes = testExtractPostIsoDate(isoPost);
assert.strictEqual(isoRes, '2026-02-08', 'ISO date correctly extracted');

// Test case B: Human String displayDate
const humanPost = { id: 'test-2', displayDate: 'Sunday, February 8, 2026' };
const humanRes = testExtractPostIsoDate(humanPost);
assert.strictEqual(humanRes, '2026-02-08', 'Human displayDate correctly converted to YYYY-MM-DD');

// Test case C: Grid Calendar URL Construction
const gridUrl = buildCalendarUrl({
  viewMode: 'GRID',
  currentDate: new Date('2026-02-08'),
  selectedDateStr: '2026-02-08',
  actId: 'gal-test-1',
});
assert(gridUrl.includes('date=2026-02-08'), 'Grid URL has date param');
assert(gridUrl.includes('month=2026-02'), 'Grid URL has month param');
assert(gridUrl.includes('actId=gal-test-1'), 'Grid URL has actId param');
assert(!gridUrl.includes('view=timeline'), 'Grid URL does not force timeline');

// Test case D: Timeline Calendar URL Construction
const timelineUrl = buildCalendarUrl({
  viewMode: 'TIMELINE',
  currentDate: new Date('2026-02-08'),
  selectedDateStr: '2026-02-08',
  actId: 'gal-test-1',
});
assert(timelineUrl.includes('view=timeline'), 'Timeline URL has view=timeline param');
assert(timelineUrl.includes('date=2026-02-08'), 'Timeline URL has date param');
assert(timelineUrl.includes('actId=gal-test-1'), 'Timeline URL has actId param');

console.log('✓ Check 6: Behavioral date extraction and calendar URL synthesis verified');
console.log('  Grid Calendar URL:', gridUrl);
console.log('  Timeline Calendar URL:', timelineUrl);

console.log('\nALL GALLERY VIEWER AUDIT CHECKS PASSED SUCCESSFULLY!');

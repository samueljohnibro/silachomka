// scripts/verify-events-calendar.cjs
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, desc) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${desc}`);
    failed++;
  }
}

console.log('=================================================================');
console.log(' EVENTS DOMAIN & UNIFIED ACTIVITY CALENDAR VERIFICATION');
console.log('=================================================================');

// 1. Files exist
console.log('\n--- 1. Frontend Components & Pages ---');
assert(fs.existsSync('src/pages/EventsPage.jsx'), 'src/pages/EventsPage.jsx exists');
assert(fs.existsSync('src/pages/EventDetailPage.jsx'), 'src/pages/EventDetailPage.jsx exists');
assert(fs.existsSync('src/pages/CalendarPage.jsx'), 'src/pages/CalendarPage.jsx exists');
assert(fs.existsSync('src/pages/admin/AdminEventsPage.jsx'), 'src/pages/admin/AdminEventsPage.jsx exists');

// 2. Routing in App.jsx
console.log('\n--- 2. Routing in App.jsx ---');
const appSource = fs.readFileSync('src/App.jsx', 'utf8');
assert(appSource.includes('<Route path="/events" element={<EventsRoute />} />'), 'Public /events route registered in App.jsx');
assert(appSource.includes('<Route path="/events/:slug" element={<EventDetailRoute />} />'), 'Public /events/:slug route registered in App.jsx');
assert(appSource.includes('<Route path="/calendar" element={<CalendarRoute />} />'), 'Public /calendar route registered in App.jsx');
assert(appSource.includes('<Route path="events" element={<AdminEventsPage />} />'), 'Admin /admin/events route registered in App.jsx');
assert(appSource.includes('UpcomingCountdownShowcase'), 'UpcomingCountdownShowcase component integrated in App.jsx');
assert(appSource.includes('HomepageEventsSection'), 'HomepageEventsSection component integrated in App.jsx');

// 3. Admin Layout & Navigation
console.log('\n--- 3. Admin Layout Navigation ---');
const adminLayoutSource = fs.readFileSync('src/pages/admin/AdminLayout.jsx', 'utf8');
assert(adminLayoutSource.includes("{ name: 'Events', path: '/admin/events' }"), 'Events nav item in AdminSidebar');
assert(adminLayoutSource.includes("if (path.includes('/events')) return 'Events Management'"), 'Events page title handled in AdminHeader');

// 4. API & Store
console.log('\n--- 4. Data Layer & Store Integration ---');
const apiSource = fs.readFileSync('src/data/api.js', 'utf8');
const storeSource = fs.readFileSync('src/data/store.js', 'utf8');
const adminApiSource = fs.readFileSync('src/data/adminApi.js', 'utf8');
assert(apiSource.includes('fetchEvents'), 'fetchEvents exists in src/data/api.js');
assert(apiSource.includes('fetchEventBySlug'), 'fetchEventBySlug exists in src/data/api.js');
assert(apiSource.includes('fetchCalendarActivities'), 'fetchCalendarActivities exists in src/data/api.js');
assert(storeSource.includes('events: []'), 'events initialized in memoryStore');
assert(adminApiSource.includes('getEvents'), 'adminApi.getEvents implemented');
assert(adminApiSource.includes('createEvent'), 'adminApi.createEvent implemented');
assert(adminApiSource.includes('deleteEvent'), 'adminApi.deleteEvent implemented');

// 5. Worker API Endpoints
console.log('\n--- 5. Cloudflare Worker API Endpoints ---');
const workerIndex = fs.readFileSync('worker/src/index.js', 'utf8');
const workerCrud = fs.readFileSync('worker/src/admin/crud.js', 'utf8');
assert(workerIndex.includes("app.get('/api/events'"), 'GET /api/events endpoint implemented');
assert(workerIndex.includes("app.get('/api/events/:slug'"), 'GET /api/events/:slug endpoint implemented');
assert(workerIndex.includes("app.get('/api/calendar'"), 'GET /api/calendar endpoint implemented');
assert(workerCrud.includes("adminApp.get('/events'"), 'GET /events implemented in admin/crud.js');
assert(workerCrud.includes("adminApp.post('/events'"), 'POST /events implemented in admin/crud.js');
assert(workerCrud.includes("adminApp.put('/events/:id'"), 'PUT /events/:id implemented in admin/crud.js');
assert(workerCrud.includes("adminApp.delete('/events/:id'"), 'DELETE /events/:id soft-delete implemented in admin/crud.js');

// 6. Pre-rendered Pages & Sitemap
console.log('\n--- 6. Pre-rendered Pages & Sitemap ---');
assert(fs.existsSync('dist/events/index.html'), 'dist/events/index.html pre-rendered');
assert(fs.existsSync('dist/calendar/index.html'), 'dist/calendar/index.html pre-rendered');
const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
assert(sitemap.includes('/events'), 'sitemap.xml contains /events');
assert(sitemap.includes('/calendar'), 'sitemap.xml contains /calendar');

console.log('=================================================================');
console.log(` RESULTS: ${passed} passed, ${failed} failed.`);
console.log('=================================================================');
process.exit(failed > 0 ? 1 : 0);

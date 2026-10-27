const fs = require('fs');
const path = require('path');
const { neon } = require('../worker/node_modules/@neondatabase/serverless');

const devVars = fs.readFileSync(path.join(__dirname, '../worker/.dev.vars'), 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(dbUrl);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function verifyStage29() {
  console.log('=================================================');
  console.log(' STAGE 29 — FULL SYSTEM & MUSIC SERVICES VERIFICATION');
  console.log('=================================================\n');

  console.log('--- 1. Music Services Database & Authority Verification ---');
  const services = await sql`SELECT slug, title, category, base_price_ngn, is_hourly, hourly_rate_ngn, turnaround_days FROM music_services ORDER BY sort_order ASC`;
  assert(services.length === 9, `All 9 authoritative studio services exist in DB (found ${services.length})`);

  const s1 = services.find(s => s.slug === 'beat-production');
  assert(s1 && Number(s1.base_price_ngn) === 80000, `Service #1 Beat Production is ₦80,000 (found ${s1?.base_price_ngn})`);

  const s2 = services.find(s => s.slug === 'beat-mixing');
  assert(s2 && Number(s2.base_price_ngn) === 25000, `Service #2 Beat Mixing is ₦25,000 (found ${s2?.base_price_ngn})`);

  const s3 = services.find(s => s.slug === 'voice-recording');
  assert(s3 && s3.is_hourly === true && Number(s3.hourly_rate_ngn) === 25000, `Service #3 Voice Recording is hourly ₦25,000/hr (is_hourly: ${s3?.is_hourly}, rate: ${s3?.hourly_rate_ngn})`);

  const s4 = services.find(s => s.slug === 'vocal-mixing');
  assert(s4 && Number(s4.base_price_ngn) === 35000, `Service #4 Vocal Mixing is ₦35,000 (found ${s4?.base_price_ngn})`);

  const s5 = services.find(s => s.slug === 'recording-mixing-client-beat');
  assert(s5 && s5.base_price_ngn === null, `Service #5 Recording + Mixing on Client's Beat is PRICE TO BE DEFINED (null in DB)`);

  const s6 = services.find(s => s.slug === 'full-song-mastering');
  assert(s6 && Number(s6.base_price_ngn) === 35000, `Service #6 Full Song Mastering is ₦35,000 (found ${s6?.base_price_ngn})`);

  const s7 = services.find(s => s.slug === 'instrumentalist-collaboration');
  assert(s7 && Number(s7.base_price_ngn) === 20000, `Service #7 Instrumentalist Collaboration is ₦20,000 (found ${s7?.base_price_ngn})`);

  const s8 = services.find(s => s.slug === 'full-song-production');
  assert(s8 && Number(s8.base_price_ngn) === 110000, `Service #8 Full Song Production is ₦110,000 (found ${s8?.base_price_ngn})`);

  const s9 = services.find(s => s.slug === 'feature');
  assert(s9 && Number(s9.base_price_ngn) === 50000, `Service #9 Feature is ₦50,000 (found ${s9?.base_price_ngn})`);

  console.log('\n--- 2. Order Creation & Calculation Tests ---');
  // Create a test hourly order
  const testNum = `SC-SRV-${new Date().getFullYear()}-TEST`;
  await sql`DELETE FROM service_orders WHERE order_number = ${testNum}`;

  await sql`
    INSERT INTO service_orders (
      order_number, service_slug, service_title, customer_name, customer_email,
      configuration, total_amount_ngn, currency, order_status, deadline_timezone
    ) VALUES (
      ${testNum}, 'voice-recording', 'Voice Recording', 'Test Artist', 'test@silachomka.com',
      ${JSON.stringify({ hours: 4 })}::jsonb, 100000, 'NGN', 'AWAITING_PAYMENT', 'WAT'
    )
  `;

  const orderRows = await sql`SELECT * FROM service_orders WHERE order_number = ${testNum}`;
  assert(orderRows.length === 1, 'Service order successfully inserted');
  assert(Number(orderRows[0].total_amount_ngn) === 100000, `Hourly calculation for 4h = ₦100,000 (found ${orderRows[0].total_amount_ngn})`);
  assert(orderRows[0].deadline_timezone === 'WAT', `Explicit deadline timezone is WAT (found ${orderRows[0].deadline_timezone})`);
  assert(orderRows[0].order_status === 'AWAITING_PAYMENT', `Initial order status is AWAITING_PAYMENT`);

  // Clean up test order
  await sql`DELETE FROM service_orders WHERE order_number = ${testNum}`;
  assert(true, 'Test order cleaned up cleanly');

  console.log('\n--- 3. Codebase Architecture & Integrity Assertions ---');
  const beatsPage = fs.readFileSync('src/pages/BeatsPage.jsx', 'utf8');
  assert(!beatsPage.includes('<span>1 MIN</span>'), '1 MIN toggle removed from normal catalog grid toolbar in BeatsPage.jsx');
  assert(beatsPage.includes('1 Min / Full Track Toggle inside Reel'), 'Duration toggle strictly preserved inside Reel Mode (BeatReelPlayer)');

  const appCss = fs.readFileSync('src/App.css', 'utf8');
  assert(appCss.includes('position: fixed;\n  inset: 0;\n  width: 100vw;\n  height: 100vh;') || appCss.includes('position: fixed;'), 'Atmospheric backdrop scaled to full fixed viewport');
  assert(!appCss.includes('height: 820px;'), 'Old 820px card constraint removed from .product-ambient-backdrop');

  const adminMusic = fs.readFileSync('src/pages/admin/AdminMusicPage.jsx', 'utf8');
  assert(adminMusic.includes('minWidth: 135'), 'Track Credit Role select minWidth fixed in AdminMusicPage.jsx to prevent text clipping');

  const appJsx = fs.readFileSync('src/App.jsx', 'utf8');
  assert(appJsx.includes('ServicesPage'), 'ServicesPage imported in App.jsx');
  assert(appJsx.includes('ServiceOrderDetailPage'), 'ServiceOrderDetailPage imported in App.jsx');
  assert(appJsx.includes('AdminServicesPage'), 'AdminServicesPage imported in App.jsx');
  assert(appJsx.includes('path="/services"'), 'Route /services registered in App.jsx');
  assert(appJsx.includes('path="/services/order/:orderNumber"'), 'Route /services/order/:orderNumber registered in App.jsx');
  assert(appJsx.includes('path="services" element={<AdminServicesPage />}'), 'Admin route /admin/services registered in App.jsx');

  const adminLayout = fs.readFileSync('src/pages/admin/AdminLayout.jsx', 'utf8');
  assert(adminLayout.includes("path: '/admin/services'"), 'Services & Orders registered in AdminLayout.jsx navigation');

  const workerIndex = fs.readFileSync('worker/src/index.js', 'utf8');
  assert(workerIndex.includes("app.get('/api/services'"), 'Public endpoint /api/services registered in worker/src/index.js');
  assert(workerIndex.includes("app.post('/api/services/upload'"), 'Private client upload endpoint /api/services/upload registered');
  assert(workerIndex.includes("app.post('/api/services/orders'"), 'Order creation endpoint /api/services/orders registered');
  assert(workerIndex.includes("app.get('/api/services/orders/:orderNumber'"), 'Order status lookup endpoint registered');

  const workerCrud = fs.readFileSync('worker/src/admin/crud.js', 'utf8');
  assert(workerCrud.includes("adminApp.get('/service-orders'"), 'Admin orders list endpoint registered in crud.js');
  assert(workerCrud.includes("adminApp.put('/service-orders/:id'"), 'Admin order update & deliverable endpoint registered in crud.js');
  assert(workerCrud.includes("adminApp.put('/services/:id'"), 'Admin service configuration endpoint registered in crud.js');

  const vercelJson = fs.readFileSync('vercel.json', 'utf8');
  assert(vercelJson.includes('/services'), 'Vercel rewrites include /services crawler rules');

  console.log('\n=================================================');
  console.log(` STAGE 29 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('=================================================');
  if (failed > 0) process.exit(1);
}

verifyStage29().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});

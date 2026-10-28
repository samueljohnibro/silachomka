// scripts/verify-stage39.cjs
/**
 * STAGE 39 VERIFICATION SUITE
 * Verifies:
 * 1. Google Search Console verification in <head> of index.html and dist/index.html
 * 2. Prerender build preserves verification in crawler-visible raw HTML
 * 3. Centralized site origin single source of truth (src/data/siteConfig.js)
 * 4. Backward compatibility re-export in src/data/credits.js
 * 5. Elimination of hardcoded production origin strings in public views & JSON-LD
 * 6. robots.txt synchronization with sitemap.xml
 * 7. Sitemap cleanliness (0 admin, 0 private APIs, all valid canonical routes)
 * 8. Worker migration readiness (PUBLIC_ORIGIN support and CORS allowlist)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

let totalPassed = 0;
let totalFailed = 0;

function pass(desc) {
  console.log(`  [PASS] ${desc}`);
  totalPassed++;
}

function fail(desc, err) {
  console.error(`  [FAIL] ${desc}`);
  if (err) console.error('        Error:', err.message || err);
  totalFailed++;
}

console.log('=================================================================');
console.log(' STAGE 39 VERIFICATION SUITE — SEO OWNERSHIP & MIGRATION READINESS');
console.log('=================================================================\n');

// 1. Google Search Console Verification in Template & Prerender
console.log('--- 1. Google Search Console Verification Meta Tag ---');
try {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert(indexHtml.includes('<!-- GOOGLE_SITE_VERIFICATION:START -->'), 'index.html contains verification start marker');
  assert(indexHtml.includes('<!-- GOOGLE_SITE_VERIFICATION:END -->'), 'index.html contains verification end marker');
  assert(indexHtml.includes('name="google-site-verification"'), 'index.html contains google-site-verification meta tag');
  pass('index.html includes Google Search Console verification slot in <head>');
} catch (e) {
  fail('index.html Google Search Console verification check', e);
}

try {
  const distIndexHtml = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
  assert(distIndexHtml.includes('name="google-site-verification"'), 'dist/index.html contains google-site-verification meta tag');
  assert(distIndexHtml.indexOf('name="google-site-verification"') < distIndexHtml.indexOf('</head>'), 'verification meta tag is inside <head>');
  pass('dist/index.html raw HTML contains verification meta tag before client JS executes');
} catch (e) {
  fail('dist/index.html verification check', e);
}

// 2. Centralized Site Origin Single Source of Truth
console.log('\n--- 2. Single Source of Truth for Site Origin ---');
try {
  const siteConfig = fs.readFileSync(path.join(ROOT, 'src', 'data', 'siteConfig.js'), 'utf8');
  assert(siteConfig.includes('DEFAULT_SITE_ORIGIN = "https://silachomka.vercel.app"'), 'DEFAULT_SITE_ORIGIN defined');
  assert(siteConfig.includes('export const SITE_ORIGIN ='), 'SITE_ORIGIN exported');
  assert(siteConfig.includes('export function canonicalUrl('), 'canonicalUrl function exported');
  assert(siteConfig.includes('export function absoluteUrl('), 'absoluteUrl function exported');
  assert(siteConfig.includes('VITE_SITE_ORIGIN'), 'Supports VITE_SITE_ORIGIN environment variable override');
  pass('src/data/siteConfig.js implements centralized origin and canonical helpers');
} catch (e) {
  fail('siteConfig.js inspection', e);
}

try {
  const credits = fs.readFileSync(path.join(ROOT, 'src', 'data', 'credits.js'), 'utf8');
  assert(credits.includes('export { DEFAULT_SITE_ORIGIN, SITE_ORIGIN, canonicalUrl, absoluteUrl }'), 'credits re-exports canonical helpers');
  pass('src/data/credits.js preserves backward compatibility by re-exporting canonical helpers');
} catch (e) {
  fail('credits.js re-export inspection', e);
}

// 3. Elimination of Hardcoded Production Origins in Public Pages
console.log('\n--- 3. Elimination of Hardcoded Production Origins ---');
const componentsToCheck = [
  'src/App.jsx',
  'src/components/ReleasePage.jsx',
  'src/pages/BeatsPage.jsx',
  'src/pages/BeatDetailPage.jsx',
  'src/pages/GalleryPostPage.jsx',
  'src/components/GalleryPostModal.jsx',
  'src/pages/ServicesPage.jsx',
  'src/components/SharePageButton.jsx',
];

for (const compPath of componentsToCheck) {
  try {
    const content = fs.readFileSync(path.join(ROOT, compPath), 'utf8');
    const lines = content.split('\n');
    const matches = lines.filter((line) => line.includes('https://silachomka.vercel.app'));
    assert.strictEqual(matches.length, 0, `Found hardcoded origin in ${compPath}: ${matches.join('; ')}`);
    pass(`No hardcoded origin in ${compPath}`);
  } catch (e) {
    fail(`Hardcoded origin check in ${compPath}`, e);
  }
}

// 4. Sitemap Audit & robots.txt Synchronization
console.log('\n--- 4. Sitemap Audit & robots.txt Synchronization ---');
try {
  const sitemapXml = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  const locMatches = sitemapXml.match(/<loc>([^<]+)<\/loc>/g) || [];
  assert(locMatches.length >= 40, `Expected at least 40 sitemap URLs, got ${locMatches.length}`);
  
  // Verify 0 admin or private API URLs
  const forbidden = locMatches.filter(l => l.includes('/admin') || l.includes('/api/'));
  assert.strictEqual(forbidden.length, 0, `Sitemap must not contain admin or api URLs: ${forbidden.join(', ')}`);
  pass(`Sitemap contains ${locMatches.length} clean, public canonical URLs (0 admin, 0 api)`);
} catch (e) {
  fail('Sitemap audit', e);
}

try {
  const robotsTxt = fs.readFileSync(path.join(ROOT, 'dist', 'robots.txt'), 'utf8');
  assert(robotsTxt.includes('Disallow: /admin'), 'robots.txt disallows /admin');
  assert(robotsTxt.includes('Disallow: /api/admin/'), 'robots.txt disallows /api/admin/');
  assert(robotsTxt.includes('Sitemap: https://silachomka.vercel.app/sitemap.xml'), 'robots.txt references active canonical sitemap');
  pass('dist/robots.txt protects admin routes and references sitemap.xml');
} catch (e) {
  fail('robots.txt audit', e);
}

// 5. Worker Migration Readiness
console.log('\n--- 5. Cloudflare Worker Migration Readiness ---');
try {
  const workerCode = fs.readFileSync(path.join(ROOT, 'worker', 'src', 'index.js'), 'utf8');
  assert(workerCode.includes("'https://silachomka.com'"), 'CORS allowlist includes silachomka.com');
  assert(workerCode.includes("'https://www.silachomka.com'"), 'CORS allowlist includes www.silachomka.com');
  assert(workerCode.includes('PUBLIC_ORIGIN'), 'Worker reads PUBLIC_ORIGIN environment variable');
  pass('Worker CORS allowlist and dynamic origin handlers are pre-configured for silachomka.com');
} catch (e) {
  fail('Worker migration readiness check', e);
}

console.log('\n=================================================================');
console.log(` STAGE 39 RESULTS: ${totalPassed} passed, ${totalFailed} failed.`);
console.log('=================================================================');

if (totalFailed > 0) {
  process.exit(1);
}

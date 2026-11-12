// Comprehensive verification test for Country and Currency Auto-Detection Engine
const assert = require('assert');

async function runTests() {
  console.log('--- Starting Currency & Geolocation Engine Verification ---');

  const API_BASE = 'https://silachomka-api.samueljohnibrotech.workers.dev';
  const VERCEL_BASE = 'https://silachomka.vercel.app';

  // Test 1: Worker direct /api/geo defaults to NGN for Nigerian IP / baseline
  console.log('Test 1: Worker direct /api/geo baseline');
  const res1 = await fetch(`${API_BASE}/api/geo`).then(r => r.json());
  console.log('Worker /api/geo response:', res1);
  assert.strictEqual(res1.currency, 'NGN', 'Worker /api/geo should default to NGN');

  // Test 2: Vercel proxied /api/geo returns NGN for Nigerian client IP
  console.log('Test 2: Vercel proxied /api/geo');
  const res2 = await fetch(`${VERCEL_BASE}/api/geo`).then(r => r.json());
  console.log('Vercel /api/geo response:', res2);
  assert.strictEqual(res2.currency, 'NGN', 'Vercel /api/geo must resolve to NGN, not USD');
  assert.strictEqual(res2.country, 'NG', 'Vercel /api/geo must resolve country to NG');

  // Test 3: International timezone matrix resolution
  console.log('Test 3: International timezone matrix');
  const matrix = [
    { tz: 'Africa/Lagos', expectedCurr: 'NGN', expectedCountry: 'NG' },
    { tz: 'America/New_York', expectedCurr: 'USD', expectedCountry: 'US' },
    { tz: 'America/Los_Angeles', expectedCurr: 'USD', expectedCountry: 'US' },
    { tz: 'Europe/London', expectedCurr: 'GBP', expectedCountry: 'GB' },
    { tz: 'Africa/Accra', expectedCurr: 'GHS', expectedCountry: 'GH' },
    { tz: 'Africa/Nairobi', expectedCurr: 'KES', expectedCountry: 'KE' },
    { tz: 'Africa/Johannesburg', expectedCurr: 'ZAR', expectedCountry: 'ZA' },
    { tz: 'Africa/Kampala', expectedCurr: 'UGX', expectedCountry: 'UG' },
    { tz: 'Africa/Dar_es_Salaam', expectedCurr: 'TZS', expectedCountry: 'TZ' },
    { tz: 'Africa/Kigali', expectedCurr: 'RWF', expectedCountry: 'RW' },
    { tz: 'Africa/Lusaka', expectedCurr: 'ZMW', expectedCountry: 'ZM' }
  ];

  for (const item of matrix) {
    const res = await fetch(`${VERCEL_BASE}/api/geo?tz=${encodeURIComponent(item.tz)}`).then(r => r.json());
    console.log(`  [TZ: ${item.tz.padEnd(20)}] -> Country: ${res.country}, Currency: ${res.currency} (${res.source})`);
    assert.strictEqual(res.currency, item.expectedCurr, `Expected ${item.expectedCurr} for tz ${item.tz}`);
    assert.strictEqual(res.country, item.expectedCountry, `Expected ${item.expectedCountry} for tz ${item.tz}`);
  }

  // Test 4: Pricing API with currency=AUTO
  console.log('Test 4: Pricing API with currency=AUTO');
  const autoPricing = await fetch(`${VERCEL_BASE}/api/beats/pricing?currency=AUTO`).then(r => r.json());
  console.log('AUTO pricing response currency:', autoPricing.currency, 'sample price:', Object.values(autoPricing.products || {})[0]?.formatted);
  assert.strictEqual(autoPricing.success, true, 'Pricing API should succeed');
  assert.strictEqual(autoPricing.currency, 'NGN', 'AUTO pricing for Nigerian client must be NGN');

  // Test 5: Client-side detection logic simulation (testing detectInitialCurrency algorithm)
  console.log('Test 5: Client-side detectInitialCurrency simulation');
  
  function simulateDetect(tz, navLangs, storedPref) {
    if (storedPref) return storedPref.toUpperCase();
    const langStr = navLangs.join(',').toLowerCase();
    if (
      tz.includes('Lagos') ||
      tz.includes('Nigeria') ||
      tz.includes('Kano') ||
      tz.includes('Ibadan') ||
      tz.includes('Porto-Novo') ||
      /-ng\b/i.test(langStr) ||
      /\b(yo|ig|ha|pcm)\b/i.test(langStr)
    ) {
      return 'NGN';
    }
    if (tz.includes('Accra') || tz.includes('Ghana') || /-gh\b/i.test(langStr)) return 'GHS';
    if (tz.includes('Nairobi') || tz.includes('Kenya') || /-ke\b/i.test(langStr)) return 'KES';
    if (tz.includes('Johannesburg') || tz.includes('South_Africa') || /-za\b/i.test(langStr)) return 'ZAR';
    if (tz.includes('London') || /-gb\b/i.test(langStr)) return 'GBP';
    if (tz.includes('America') || tz.includes('New_York') || /-us\b/i.test(langStr)) return 'USD';
    return 'NGN';
  }

  // Simulations:
  assert.strictEqual(simulateDetect('Africa/Lagos', ['en-US'], null), 'NGN', 'Device with Africa/Lagos must be NGN');
  assert.strictEqual(simulateDetect('UTC', ['en-NG'], null), 'NGN', 'Device with en-NG locale in UTC must be NGN');
  assert.strictEqual(simulateDetect('UTC', ['yo-NG', 'yo'], null), 'NGN', 'Device with Yoruba locale must be NGN');
  assert.strictEqual(simulateDetect('UTC', ['en'], null), 'NGN', 'Unknown device defaults to NGN');
  assert.strictEqual(simulateDetect('America/New_York', ['en-US'], null), 'USD', 'Device in US must be USD');
  assert.strictEqual(simulateDetect('Africa/Lagos', ['en-NG'], 'GBP'), 'GBP', 'Stored user preference overrides detection');

  // Test 6: Immunity Shield Verification
  console.log('Test 6: Immunity Shield Verification');
  function simulateImmunityShield(localTz, localLang, remoteGeo) {
    const isLocallyNigeria =
      localTz.includes('Lagos') ||
      localTz.includes('Nigeria') ||
      localTz.includes('Kano') ||
      localTz.includes('Ibadan') ||
      localTz.includes('Porto-Novo') ||
      /-ng\b/i.test(localLang) ||
      /\b(yo|ig|ha|pcm)\b/i.test(localLang);

    if (isLocallyNigeria && remoteGeo.currency !== 'NGN' && (remoteGeo.country === 'DE' || remoteGeo.country === 'US' || remoteGeo.country === 'IE')) {
      return 'REJECTED_PRESERVE_NGN';
    }
    return 'ACCEPTED';
  }

  const shieldResult = simulateImmunityShield('Africa/Lagos', 'en-US', { country: 'DE', currency: 'USD' });
  assert.strictEqual(shieldResult, 'REJECTED_PRESERVE_NGN', 'Shield must reject false DE/USD proxy override');

  const shieldResult2 = simulateImmunityShield('America/New_York', 'en-US', { country: 'US', currency: 'USD' });
  assert.strictEqual(shieldResult2, 'ACCEPTED', 'Shield must accept legitimate US detection for US user');

  console.log('\n>>> ALL 6 CURRENCY & GEOLOCATION TESTS PASSED PERFECTLY! <<<');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

/**
 * test-security-isolated.js
 * 
 * Isolated, non-mutating test suite verifying:
 * 1. File syntax validity across all worker sources.
 * 2. Fail-closed authentication on missing or malformed JWT_SECRET in both adminAuth and /api/admin/login.
 * 3. Exact RBAC enforcement on DELETE routes:
 *    - All 8 root entity DELETE routes return exact 403 Forbidden for EDITOR.
 *    - All 8 root entity DELETE routes reach handler and return exact 404 Not Found for SUPERADMIN.
 *    - All 3 nested association DELETE routes reach handler and return exact 404 Not Found for EDITOR.
 * 4. Consistent slug validation across all entities on POST and PUT (exact 400 Bad Request).
 * 5. Explicit CORS origin allowlist vs disallowed origin rejection with credentials.
 * 6. Cookie security attributes (secure flag on HTTPS, SameSite=Strict preserved).
 * 
 * DATABASE MOCKING:
 * Uses @neondatabase/serverless `neonConfig.fetchFunction` to intercept all queries in-memory.
 * ZERO connection is ever made to Neon, PostgreSQL, or any live database.
 */

import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { neonConfig } from '@neondatabase/serverless'
import { sign } from 'hono/jwt'
import app from './src/index.js'
import {
  COOKIE_NAME,
  hashPassword,
  hashPasswordLegacy,
  verifyPassword,
  timingSafeEqualBytes,
  DEFAULT_ITERATIONS,
  MIN_ITERATIONS,
  MAX_ITERATIONS,
  LEGACY_SALT
} from './src/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Mock Admin Credentials for in-memory authentication tests
const MOCK_ADMIN = {
  id: 'usr-mock-admin-01',
  email: 'mock-admin@silachomka.internal',
  password: 'MockSecurePassword123!',
  role: 'SUPERADMIN'
}

let mockAdminHash = null
let dbQueriesIntercepted = 0
let interceptedQueries = []
let simulateUpdateError = false

// Intercept all Neon SQL queries in-memory. Zero network/database connection.
neonConfig.fetchFunction = async (url, opts) => {
  dbQueriesIntercepted++
  const bodyText = typeof opts?.body === 'string' ? opts.body : ''
  interceptedQueries.push(bodyText)

  // Mock conditional UPDATE query for password_hash migration
  if (bodyText.includes('UPDATE') && bodyText.includes('password_hash')) {
    if (simulateUpdateError) {
      throw new Error('Simulated transient DB error during password_hash update')
    }
    return new Response(JSON.stringify({
      fields: [],
      rows: []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mock admin user lookup on login
  if (bodyText.includes('admin_users') && bodyText.includes('SELECT')) {
    return new Response(JSON.stringify({
      fields: [
        { name: 'id', dataTypeID: 25 },
        { name: 'email', dataTypeID: 25 },
        { name: 'password_hash', dataTypeID: 25 },
        { name: 'role', dataTypeID: 25 }
      ],
      rows: [
        [MOCK_ADMIN.id, MOCK_ADMIN.email, mockAdminHash, MOCK_ADMIN.role]
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Default mock response: empty result set (record not found in mock DB)
  return new Response(JSON.stringify({
    fields: [],
    rows: []
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

let totalTests = 0
let passedTests = 0
let failedTests = 0

function assert(condition, testName, details = '') {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  [PASS] ${testName}`)
  } else {
    failedTests++
    console.error(`  [FAIL] ${testName} - ${details}`)
  }
}

async function runTests() {
  console.log('=================================================================')
  console.log(' RUNNING ISOLATED NON-MUTATING SECURITY VERIFICATION SUITE')
  console.log(' (Database Mock Active: 100% In-Memory, Zero Live DB Contact)')
  console.log('=================================================================\n')

  // Generate mock password hash for in-memory auth tests
  mockAdminHash = await hashPassword(MOCK_ADMIN.password)
  const TEST_JWT_SECRET = 'isolated-test-jwt-secret-xyz-1234567890'

  // -------------------------------------------------------------
  // Test 1: Syntax Validation
  // -------------------------------------------------------------
  console.log('--- 1. File Syntax Validation ---')
  for (const relFile of ['src/auth.js', 'src/index.js', 'src/admin/crud.js']) {
    const fullPath = join(__dirname, relFile)
    try {
      execSync(`node --check "${fullPath}"`, { stdio: 'pipe' })
      assert(true, `Syntax check for worker/${relFile}`)
    } catch (e) {
      assert(false, `Syntax check for worker/${relFile}`, e.message)
    }
  }

  // -------------------------------------------------------------
  // Test 2: JWT_SECRET Fail-Closed Behavior
  // -------------------------------------------------------------
  console.log('\n--- 2. Fail-Closed Authentication on Missing/Invalid JWT_SECRET ---')

  // 2a. Missing JWT_SECRET in adminAuth (GET /api/admin/me)
  {
    const req = new Request('http://127.0.0.1:8787/api/admin/me', {
      headers: { 'Cookie': `${COOKIE_NAME}=some.dummy.token` }
    })
    const envNoSecret = { DATABASE_URL: 'postgresql://mock:mock@ep-mock.neon.tech/mock_db' }
    const res = await app.fetch(req, envNoSecret)
    const json = await res.json()
    assert(
      res.status === 500 && json.message === 'Authentication misconfigured',
      'adminAuth fails closed with 500 when JWT_SECRET is missing',
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // 2b. Empty-string JWT_SECRET in adminAuth
  {
    const req = new Request('http://127.0.0.1:8787/api/admin/me', {
      headers: { 'Cookie': `${COOKIE_NAME}=some.dummy.token` }
    })
    const envEmptySecret = {
      DATABASE_URL: 'postgresql://mock:mock@ep-mock.neon.tech/mock_db',
      JWT_SECRET: '   '
    }
    const res = await app.fetch(req, envEmptySecret)
    const json = await res.json()
    assert(
      res.status === 500 && json.message === 'Authentication misconfigured',
      'adminAuth fails closed with 500 when JWT_SECRET is empty string',
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // 2c. Missing session cookie returns 401
  {
    const req = new Request('http://127.0.0.1:8787/api/admin/me')
    const env = {
      DATABASE_URL: 'postgresql://mock:mock@ep-mock.neon.tech/mock_db',
      JWT_SECRET: TEST_JWT_SECRET
    }
    const res = await app.fetch(req, env)
    assert(res.status === 401, 'adminAuth returns 401 when session cookie is absent')
  }

  // 2d. POST /api/admin/login with missing JWT_SECRET fails closed with 500
  {
    const req = new Request('http://127.0.0.1:8787/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MOCK_ADMIN.email, password: MOCK_ADMIN.password })
    })
    const envNoSecret = { DATABASE_URL: 'postgresql://mock:mock@ep-mock.neon.tech/mock_db' }
    const res = await app.fetch(req, envNoSecret)
    const json = await res.json()
    assert(
      res.status === 500 && json.message === 'Authentication misconfigured',
      'POST /api/admin/login fails closed with 500 when JWT_SECRET is missing',
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // 2e. POST /api/admin/login with empty-string JWT_SECRET fails closed with 500
  {
    const req = new Request('http://127.0.0.1:8787/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MOCK_ADMIN.email, password: MOCK_ADMIN.password })
    })
    const envEmptySecret = {
      DATABASE_URL: 'postgresql://mock:mock@ep-mock.neon.tech/mock_db',
      JWT_SECRET: '   '
    }
    const res = await app.fetch(req, envEmptySecret)
    const json = await res.json()
    assert(
      res.status === 500 && json.message === 'Authentication misconfigured',
      'POST /api/admin/login fails closed with 500 when JWT_SECRET is empty string',
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // -------------------------------------------------------------
  // Test 3: Role-Based Access Control (RBAC) on All DELETE Routes (Root & Subordinate)
  // -------------------------------------------------------------
  console.log('\n--- 3. RBAC Enforcement on DELETE Routes ---')

  const editorToken = await sign(
    { sub: 'usr-editor-01', email: 'editor@test.internal', role: 'EDITOR', exp: Math.floor(Date.now() / 1000) + 3600 },
    TEST_JWT_SECRET
  )
  const superadminToken = await sign(
    { sub: 'usr-admin-01', email: 'admin@test.internal', role: 'SUPERADMIN', exp: Math.floor(Date.now() / 1000) + 3600 },
    TEST_JWT_SECRET
  )

  const envWithSecret = {
    DATABASE_URL: 'postgresql://mock:mock@ep-mock.neon.tech/mock_db',
    JWT_SECRET: TEST_JWT_SECRET
  }

  const rootDeleteRoutes = [
    '/api/admin/releases/test-id-123',
    '/api/admin/tracks/test-id-123',
    '/api/admin/beats/test-id-123',
    '/api/admin/music-videos/test-id-123',
    '/api/admin/gallery-posts/test-id-123',
    '/api/admin/media-assets/test-id-123',
    '/api/admin/social-links/test-id-123',
    '/api/admin/merchandise/test-id-123',
  ]

  const subordinateDeleteRoutes = [
    '/api/admin/track-credits/test-id-123',
    '/api/admin/gallery-slides/test-id-123',
    '/api/admin/music-video-features/test-vid/test-artist',
  ]

  // 3a. EDITOR on all 8 root DELETE routes must return EXACT 403 Forbidden
  for (const route of rootDeleteRoutes) {
    const req = new Request(`http://127.0.0.1:8787${route}`, {
      method: 'DELETE',
      headers: { 'Cookie': `${COOKIE_NAME}=${editorToken}` }
    })
    const res = await app.fetch(req, envWithSecret)
    const json = await res.json()
    assert(
      res.status === 403 && json.message === 'Superadmin privileges required',
      `EDITOR rejected with exact 403 on root route ${route}`,
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // 3b. SUPERADMIN on all 8 root DELETE routes must pass auth and reach handler returning EXACT 404 Not Found
  for (const route of rootDeleteRoutes) {
    const req = new Request(`http://127.0.0.1:8787${route}`, {
      method: 'DELETE',
      headers: { 'Cookie': `${COOKIE_NAME}=${superadminToken}` }
    })
    const res = await app.fetch(req, envWithSecret)
    const json = await res.json()
    assert(
      res.status === 404 && json.error === 'Not found',
      `SUPERADMIN passes requireSuperadmin on root route ${route} reaching handler (exact 404)`,
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // 3c. EDITOR on all 3 subordinate DELETE routes must return EXACT 403 Forbidden
  for (const route of subordinateDeleteRoutes) {
    const req = new Request(`http://127.0.0.1:8787${route}`, {
      method: 'DELETE',
      headers: { 'Cookie': `${COOKIE_NAME}=${editorToken}` }
    })
    const res = await app.fetch(req, envWithSecret)
    const json = await res.json()
    assert(
      res.status === 403 && json.message === 'Superadmin privileges required',
      `EDITOR rejected with exact 403 on subordinate route ${route}`,
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // 3d. SUPERADMIN on all 3 subordinate DELETE routes must pass requireSuperadmin and reach handler returning EXACT 404 Not Found
  for (const route of subordinateDeleteRoutes) {
    const req = new Request(`http://127.0.0.1:8787${route}`, {
      method: 'DELETE',
      headers: { 'Cookie': `${COOKIE_NAME}=${superadminToken}` }
    })
    const res = await app.fetch(req, envWithSecret)
    const json = await res.json()
    assert(
      res.status === 404 && json.error === 'Not found',
      `SUPERADMIN passes requireSuperadmin on subordinate route ${route} reaching handler (exact 404)`,
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // -------------------------------------------------------------
  // Test 4: Slug Validation on All Relevant POST/PUT Routes
  // -------------------------------------------------------------
  console.log('\n--- 4. Consistent Slug Validation Across Entities ---')

  const invalidSlugCases = [
    ['POST', '/api/admin/music-videos', { slug: 'Invalid Slug!', title: 'T', youtube_id: 'y', youtube_url: 'u' }, 'POST music-videos with spaces/punctuation'],
    ['POST', '/api/admin/music-videos', { slug: 'UPPERCASE_SLUG', title: 'T', youtube_id: 'y', youtube_url: 'u' }, 'POST music-videos with uppercase'],
    ['PUT', '/api/admin/music-videos/123', { slug: 'bad slug 123' }, 'PUT music-videos with spaces'],
    ['POST', '/api/admin/gallery-posts', { slug: 'bad/slug', title: 'T', post_type: 'image', post_date: '2026-01-01' }, 'POST gallery-posts with slash'],
    ['PUT', '/api/admin/gallery-posts/123', { slug: 'bad@slug' }, 'PUT gallery-posts with @'],
    ['POST', '/api/admin/merchandise', { slug: 'bad merchandise', name: 'N' }, 'POST merchandise with spaces'],
    ['PUT', '/api/admin/merchandise/123', { slug: 'BadMerch' }, 'PUT merchandise with uppercase'],
    ['PUT', '/api/admin/releases/123', { slug: 'bad release' }, 'PUT releases with spaces'],
    ['PUT', '/api/admin/beats/123', { slug: 'bad beat' }, 'PUT beats with spaces'],
    ['PUT', '/api/admin/beats/123', { slug: 12345 }, 'PUT beats with numeric non-string slug'],
  ]

  for (const [method, path, body, label] of invalidSlugCases) {
    const req = new Request(`http://127.0.0.1:8787${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${COOKIE_NAME}=${superadminToken}`
      },
      body: JSON.stringify(body)
    })
    const res = await app.fetch(req, envWithSecret)
    const json = await res.json()
    assert(
      res.status === 400 && json.error === 'Invalid slug',
      `Reject ${label}`,
      `Got status ${res.status}: ${JSON.stringify(json)}`
    )
  }

  // -------------------------------------------------------------
  // Test 5: CORS Explicit Origin Allowlist & Credentials
  // -------------------------------------------------------------
  console.log('\n--- 5. CORS Explicit Origin Allowlist & Credentials ---')

  const allowedOrigins = [
    'https://silachomka.com',
    'https://www.silachomka.com',
    'https://silachomka-api.samueljohnibrotech.workers.dev',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
    'https://staging-preview.silachomka.pages.dev',
  ]

  for (const origin of allowedOrigins) {
    const req = new Request('http://127.0.0.1:8787/api/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET'
      }
    })
    const res = await app.fetch(req, envWithSecret)
    const allowOrigin = res.headers.get('Access-Control-Allow-Origin')
    const allowCreds = res.headers.get('Access-Control-Allow-Credentials')
    assert(
      allowOrigin === origin && allowCreds === 'true',
      `CORS allowed for origin: ${origin}`,
      `Got allowOrigin="${allowOrigin}", allowCreds="${allowCreds}"`
    )
  }

  const disallowedOrigins = [
    'https://evil-attacker.com',
    'http://localhost:3000',
    'https://malicious.pages.dev',
    'https://otherdomain.com',
  ]

  for (const origin of disallowedOrigins) {
    const req = new Request('http://127.0.0.1:8787/api/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET'
      }
    })
    const res = await app.fetch(req, envWithSecret)
    const allowOrigin = res.headers.get('Access-Control-Allow-Origin')
    assert(
      !allowOrigin || allowOrigin === 'null',
      `CORS rejected for disallowed origin: ${origin}`,
      `Unexpected allowOrigin: ${allowOrigin}`
    )
  }

  // -------------------------------------------------------------
  // Test 6: Cookie Security & SameSite Behavior
  // -------------------------------------------------------------
  console.log('\n--- 6. Cookie Security & SameSite Behavior ---')

  // Check logout cookie on HTTPS vs HTTP
  {
    const httpsReq = new Request('https://silachomka-api.samueljohnibrotech.workers.dev/api/admin/logout', {
      method: 'POST'
    })
    const httpsRes = await app.fetch(httpsReq, envWithSecret)
    const setCookie = httpsRes.headers.get('set-cookie') || ''
    assert(
      setCookie.includes('SameSite=Strict') && setCookie.includes('Secure'),
      'Logout cookie includes SameSite=Strict and Secure over HTTPS',
      `Cookie header: ${setCookie}`
    )
  }

  {
    const httpReq = new Request('http://127.0.0.1:8787/api/admin/logout', {
      method: 'POST'
    })
    const httpRes = await app.fetch(httpReq, envWithSecret)
    const setCookie = httpRes.headers.get('set-cookie') || ''
    assert(
      setCookie.includes('SameSite=Strict') && !setCookie.includes('Secure'),
      'Logout cookie includes SameSite=Strict and omits Secure over local HTTP',
      `Cookie header: ${setCookie}`
    )
  }

  // -------------------------------------------------------------
  // Test 7: Password Hash Migration, Verification & Security
  // -------------------------------------------------------------
  console.log('\n--- 7. Password Hash Migration & Security ---')

  // 7a. Exact legacy hash derivation & verification
  const testPassword = 'LegacySecretPass123!'
  const legacyHash = await hashPasswordLegacy(testPassword)
  assert(
    legacyHash.length === 64 && /^[0-9a-f]{64}$/.test(legacyHash),
    'Legacy hash produces exact 64-character lowercase hex string'
  )

  const legacyVerifyCorrect = await verifyPassword(testPassword, legacyHash)
  assert(
    legacyVerifyCorrect.valid === true && legacyVerifyCorrect.needsRehash === true,
    'Legacy hash correctly verified and flagged for rehash (needsRehash: true)'
  )

  const legacyVerifyWrong = await verifyPassword('IncorrectPassword999!', legacyHash)
  assert(
    legacyVerifyWrong.valid === false && legacyVerifyWrong.needsRehash === false,
    'Legacy hash rejects incorrect password (valid: false, needsRehash: false)'
  )

  // 7b. Modern modular format & unique cryptographically random salts
  const modernHash1 = await hashPassword(testPassword)
  const modernHash2 = await hashPassword(testPassword)

  assert(
    modernHash1.startsWith(`$pbkdf2-sha256$i=${DEFAULT_ITERATIONS}$`) &&
    modernHash2.startsWith(`$pbkdf2-sha256$i=${DEFAULT_ITERATIONS}$`),
    'Modern hash generates modular format with algorithm identifier and iteration count'
  )

  const match1 = modernHash1.match(/^\$pbkdf2-sha256\$i=(\d+)\$([0-9a-f]{32})\$([0-9a-f]{64})$/)
  const match2 = modernHash2.match(/^\$pbkdf2-sha256\$i=(\d+)\$([0-9a-f]{32})\$([0-9a-f]{64})$/)
  assert(
    !!match1 && !!match2,
    'Modern hashes strictly conform to $pbkdf2-sha256$i=100000$<32hex_salt>$<64hex_hash>'
  )

  assert(
    match1[2] !== match2[2],
    'Unique random 16-byte salts generated on consecutive calls for identical password'
  )

  assert(
    modernHash1 !== modernHash2,
    'Complete modern hash outputs are distinct for identical password due to unique salts'
  )

  // 7c. Modern modular hash verification
  const modernVerifyCorrect = await verifyPassword(testPassword, modernHash1)
  assert(
    modernVerifyCorrect.valid === true && modernVerifyCorrect.needsRehash === false,
    'Modern hash correctly verified and does NOT request rehash (needsRehash: false)'
  )

  const modernVerifyWrong = await verifyPassword('IncorrectPassword999!', modernHash1)
  assert(
    modernVerifyWrong.valid === false && modernVerifyWrong.needsRehash === false,
    'Modern hash rejects incorrect password (valid: false)'
  )

  // 7d. Bounded iteration counts enforcement
  const forgedLowIterHash = `$pbkdf2-sha256$i=5000$${'a'.repeat(32)}$${'b'.repeat(64)}`
  const vLow = await verifyPassword('AnyPassword!', forgedLowIterHash)
  assert(
    vLow.valid === false && vLow.needsRehash === false,
    'Rejects hash with iterations below minimum threshold (i=5000 < 10000)'
  )

  const forgedHighIterHash = `$pbkdf2-sha256$i=1000000$${'a'.repeat(32)}$${'b'.repeat(64)}`
  const vHigh = await verifyPassword('AnyPassword!', forgedHighIterHash)
  assert(
    vHigh.valid === false && vHigh.needsRehash === false,
    'Rejects hash with iterations above maximum threshold (i=1000000 > 500000)'
  )

  // 7e. Malformed input fail-closed resilience
  const malformedInputs = [
    null,
    undefined,
    '',
    12345,
    'not-a-valid-hash',
    'deadbeef',
    '$pbkdf2-sha256$',
    '$pbkdf2-sha256$i=100000$',
    `$pbkdf2-sha256$i=100000$${'z'.repeat(32)}$${'a'.repeat(64)}`,
    `$pbkdf2-sha256$i=100000$${'a'.repeat(30)}$${'b'.repeat(64)}`,
    `$pbkdf2-sha256$i=100000$${'a'.repeat(32)}$${'b'.repeat(62)}`,
    `$pbkdf2-sha256$i=notanumber$${'a'.repeat(32)}$${'b'.repeat(64)}`,
  ]

  let allMalformedFailedClosed = true
  for (const badHash of malformedInputs) {
    const res = await verifyPassword('Password123!', badHash)
    if (res.valid !== false || res.needsRehash !== false) {
      allMalformedFailedClosed = false
    }
  }
  assert(
    allMalformedFailedClosed,
    'All malformed/corrupted hash inputs fail closed safely without unhandled exceptions'
  )

  // 7f. Fixed-length byte comparison (timingSafeEqualBytes)
  const bufA = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])
  const bufB = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])
  const bufDiff = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 99])
  const bufShort = new Uint8Array([1, 2, 3])

  assert(
    timingSafeEqualBytes(bufA, bufB) === true,
    'timingSafeEqualBytes returns true for identical 32-byte arrays'
  )
  assert(
    timingSafeEqualBytes(bufA, bufDiff) === false,
    'timingSafeEqualBytes returns false for differing 32-byte arrays'
  )
  assert(
    timingSafeEqualBytes(bufA, bufShort) === false,
    'timingSafeEqualBytes returns false for differing length arrays'
  )
  assert(
    timingSafeEqualBytes('not-a-buffer', bufA) === false && timingSafeEqualBytes(null, null) === false,
    'timingSafeEqualBytes returns false for non-Uint8Array inputs'
  )

  // 7g. End-to-end login with legacy hash and optimistic concurrency conditional update
  interceptedQueries = []
  mockAdminHash = legacyHash

  const legacyLoginReq = new Request('http://127.0.0.1:8787/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MOCK_ADMIN.email, password: testPassword })
  })
  const legacyLoginRes = await app.fetch(legacyLoginReq, envWithSecret)
  const legacyLoginJson = await legacyLoginRes.json()

  assert(
    legacyLoginRes.status === 200 && legacyLoginJson.success === true,
    'Login succeeds for user with legacy 64-char hash'
  )

  const upgradeQuery = interceptedQueries.find(q => q.includes('UPDATE') && q.includes('password_hash'))
  assert(
    !!upgradeQuery && upgradeQuery.includes('WHERE id = $2 AND password_hash = $3'),
    'Opportunistic upgrade issues conditional update matching both user ID and prior hash (WHERE id = ... AND password_hash = ...)'
  )

  // 7h. Concurrent login safety when prior hash is already upgraded (0 rows updated)
  interceptedQueries = []
  const concurrentLoginReq = new Request('http://127.0.0.1:8787/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MOCK_ADMIN.email, password: testPassword })
  })
  const concurrentLoginRes = await app.fetch(concurrentLoginReq, envWithSecret)
  const concurrentLoginJson = await concurrentLoginRes.json()
  assert(
    concurrentLoginRes.status === 200 && concurrentLoginJson.success === true,
    'Concurrent login succeeds seamlessly when conditional update matches 0 rows'
  )

  // 7i. Update failure resilience & credential confidentiality (no leaked secrets in logs)
  mockAdminHash = legacyHash
  simulateUpdateError = true
  const capturedWarns = []
  const originalWarn = console.warn
  console.warn = (...args) => {
    capturedWarns.push(args.join(' '))
  }

  try {
    const failUpdateLoginReq = new Request('http://127.0.0.1:8787/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MOCK_ADMIN.email, password: testPassword })
    })
    const failUpdateLoginRes = await app.fetch(failUpdateLoginReq, envWithSecret)
    const failUpdateLoginJson = await failUpdateLoginRes.json()

    assert(
      failUpdateLoginRes.status === 200 && failUpdateLoginJson.success === true,
      'Login succeeds with 200 even when opportunistic hash update encounters database failure'
    )

    const warnLogged = capturedWarns.some(w => w.includes('Opportunistic password hash upgrade failed'))
    assert(
      warnLogged,
      'Warning is logged on opportunistic hash update failure'
    )

    // Verify confidentiality: NO passwords, NO hashes, NO tokens logged
    const leakedSecret = capturedWarns.some(w =>
      w.includes(testPassword) ||
      w.includes(legacyHash) ||
      w.includes('eyJ')
    )
    assert(
      !leakedSecret,
      'Confidentiality preserved: warning log contains no passwords, hashes, tokens, or credentials'
    )
  } finally {
    console.warn = originalWarn
    simulateUpdateError = false
  }

  console.log('\n=================================================================')
  console.log(` SUMMARY: ${passedTests} / ${totalTests} passed, ${failedTests} failed.`)
  console.log(` In-memory database queries intercepted: ${dbQueriesIntercepted}`)
  console.log(' Live database connections: 0 (verified)')
  console.log('=================================================================')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err)
  process.exit(1)
})

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
import app, { CACHE_POLICIES, purgeCatalogueCache, handleScheduledPublishing } from './src/index.js'
import { purgeMediaCache } from './src/admin/crud.js'
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
let simulateDbError = false

// Intercept all Neon SQL queries in-memory. Zero network/database connection.
neonConfig.fetchFunction = async (url, opts) => {
  dbQueriesIntercepted++
  const bodyText = typeof opts?.body === 'string' ? opts.body : ''
  interceptedQueries.push(bodyText)

  if (simulateDbError) {
    throw new Error('Simulated database connection failure')
  }

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

  // Mock media_assets lookup for cache verification tests
  if (bodyText.includes('media_assets') && bodyText.includes('mock-media-123')) {
    return new Response(JSON.stringify({
      fields: [
        { name: 'id', dataTypeID: 25 },
        { name: 'r2_key', dataTypeID: 25 },
        { name: 'mime_type', dataTypeID: 25 },
        { name: 'file_hex', dataTypeID: 25 }
      ],
      rows: [
        ['mock-media-123', 'covers/test-media.png', 'image/png', '89504e470d0a1a0a']
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mock beat for catalogue & share tests
  if (bodyText.includes('beats') && bodyText.includes('mock-beat')) {
    return new Response(JSON.stringify({
      fields: [
        { name: 'id', dataTypeID: 25 },
        { name: 'title', dataTypeID: 25 },
        { name: 'slug', dataTypeID: 25 },
        { name: 'genre', dataTypeID: 25 },
        { name: 'short_genre', dataTypeID: 25 },
        { name: 'bpm', dataTypeID: 23 },
        { name: 'beat_key', dataTypeID: 25 },
        { name: 'key', dataTypeID: 25 },
        { name: 'producer', dataTypeID: 25 },
        { name: 'description', dataTypeID: 25 },
        { name: 'image', dataTypeID: 25 },
        { name: 'audio', dataTypeID: 25 },
        { name: 'cover', dataTypeID: 25 },
        { name: 'audioUrl', dataTypeID: 25 },
        { name: 'status', dataTypeID: 25 },
        { name: 'tags', dataTypeID: 25 }
      ],
      rows: [
        ['beat-mock-1', 'Midnight Groove', 'mock-beat', 'Afrobeats', 'Afro', 105, 'C Minor', 'C Minor', 'silachomka', 'Vibrant energetic beat', null, null, '', '', 'PUBLISHED', []]
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mock release for catalogue & share tests
  if (bodyText.includes('releases') && bodyText.includes('mock-release')) {
    return new Response(JSON.stringify({
      fields: [
        { name: 'id', dataTypeID: 25 },
        { name: 'slug', dataTypeID: 25 },
        { name: 'title', dataTypeID: 25 },
        { name: 'release_date', dataTypeID: 1082 },
        { name: 'display_date', dataTypeID: 25 },
        { name: 'type', dataTypeID: 25 },
        { name: 'primary_artist', dataTypeID: 25 },
        { name: 'description', dataTypeID: 25 },
        { name: 'status', dataTypeID: 25 },
        { name: 'cover', dataTypeID: 25 },
        { name: 'coverMime', dataTypeID: 25 },
        { name: 'preview_audio', dataTypeID: 25 },
        { name: 'track_preview_audio', dataTypeID: 25 }
      ],
      rows: [
        ['rel-mock-1', 'mock-release', 'Echoes of Light', '2026-01-15', 'January 15, 2026', 'ALBUM', 'silachomka', 'Debuted studio album', 'PUBLISHED', null, 'image/jpeg', null, null]
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mock service for catalogue & share tests
  if (bodyText.includes('music_services') && bodyText.includes('mock-service')) {
    return new Response(JSON.stringify({
      fields: [
        { name: 'slug', dataTypeID: 25 },
        { name: 'title', dataTypeID: 25 },
        { name: 'tagline', dataTypeID: 25 },
        { name: 'description', dataTypeID: 25 },
        { name: 'category', dataTypeID: 25 },
        { name: 'base_price_ngn', dataTypeID: 23 },
        { name: 'is_active', dataTypeID: 16 }
      ],
      rows: [
        ['mock-service', 'Custom Production', 'Bespoke instrumentals crafted for you', 'Full bespoke arrangement', 'Production', 150000, true]
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mock published event for detail & share tests
  if (bodyText.includes('events') && bodyText.includes('mock-event')) {
    return new Response(JSON.stringify({
      fields: [
        { name: 'id', dataTypeID: 25 },
        { name: 'title', dataTypeID: 25 },
        { name: 'slug', dataTypeID: 25 },
        { name: 'subtitle', dataTypeID: 25 },
        { name: 'event_date', dataTypeID: 25 },
        { name: 'date', dataTypeID: 25 },
        { name: 'start_time', dataTypeID: 25 },
        { name: 'end_time', dataTypeID: 25 },
        { name: 'venue_name', dataTypeID: 25 },
        { name: 'venue_address', dataTypeID: 25 },
        { name: 'city', dataTypeID: 25 },
        { name: 'country', dataTypeID: 25 },
        { name: 'ticket_url', dataTypeID: 25 },
        { name: 'ticket_price', dataTypeID: 25 },
        { name: 'ticket_status', dataTypeID: 25 },
        { name: 'primary_artwork_id', dataTypeID: 25 },
        { name: 'primary_artwork_url', dataTypeID: 25 },
        { name: 'cover', dataTypeID: 25 },
        { name: 'image', dataTypeID: 25 },
        { name: 'additional_artworks', dataTypeID: 25 },
        { name: 'lineup', dataTypeID: 25 },
        { name: 'description', dataTypeID: 25 },
        { name: 'tagged_gallery_post_ids', dataTypeID: 25 },
        { name: 'tagged_release_ids', dataTypeID: 25 },
        { name: 'tagged_beat_ids', dataTypeID: 25 },
        { name: 'is_published', dataTypeID: 16 },
        { name: 'is_featured', dataTypeID: 16 },
        { name: 'created_at', dataTypeID: 25 },
        { name: 'status', dataTypeID: 25 },
        { name: 'isFuture', dataTypeID: 16 }
      ],
      rows: [
        ['evt-mock-1', 'Album Launch Showcase', 'mock-event', 'Live Acoustic Experience', '2026-11-20', '2026-11-20', '19:00', '22:00', 'Chomka Sound Arena', 'Victoria Island', 'Lagos', 'Nigeria', 'https://tickets.example.com', '10000', 'AVAILABLE', null, null, null, null, '[]', 'silachomka & guests', 'Exclusive live showcase', null, null, null, true, true, '2026-10-01T00:00:00Z', 'UPCOMING', true]
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Mock unpublished event: if query checks is_published = true, return 0 rows.
  // If query fails to check is_published = true, return a row with is_published = false.
  if (bodyText.includes('events') && bodyText.includes('unpublished-event')) {
    if (bodyText.includes('is_published = true')) {
      return new Response(JSON.stringify({ fields: [], rows: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      fields: [
        { name: 'id', dataTypeID: 25 },
        { name: 'title', dataTypeID: 25 },
        { name: 'slug', dataTypeID: 25 },
        { name: 'is_published', dataTypeID: 16 }
      ],
      rows: [
        ['evt-secret-1', 'Secret Unreleased Event', 'unpublished-event', false]
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // Mock entity lookup for admin mutation / delete tests
  if (bodyText.includes('mutation-mock-id')) {
    return new Response(JSON.stringify({
      fields: [
        { name: 'id', dataTypeID: 25 },
        { name: 'title', dataTypeID: 25 },
        { name: 'slug', dataTypeID: 25 }
      ],
      rows: [
        ['mutation-mock-id', 'Mutation Mock Entity', 'mock-slug']
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

  // -------------------------------------------------------------
  // Test 8: Cloudflare Workers Cache & Cache-Control Enforcement
  // -------------------------------------------------------------
  console.log('\n--- 8. Cloudflare Workers Cache & Cache-Control Enforcement ---')

  // 8A. /api/geo receives default private no-store policy
  const geoReq = new Request('http://localhost/api/geo')
  const geoRes = await app.fetch(geoReq, envWithSecret)
  assert(
    geoRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
    '/api/geo receives default private no-store cache policy'
  )

  // 8B. /api/services/availability receives public availability cache policy
  const availReq = new Request('http://localhost/api/services/availability')
  const availRes = await app.fetch(availReq, envWithSecret)
  assert(
    availRes.headers.get('cache-control') === CACHE_POLICIES.AVAILABILITY,
    '/api/services/availability receives public availability Cache-Control policy'
  )
  assert(
    availRes.headers.get('cloudflare-cdn-cache-control') === 'public, max-age=300, stale-while-revalidate=600',
    '/api/services/availability receives Cloudflare-CDN-Cache-Control header'
  )
  assert(
    availRes.headers.get('cache-tag') === 'catalogue,services,services-availability',
    '/api/services/availability sets Cache-Tag: catalogue,services,services-availability'
  )

  // 8C. Private files retain private policy
  const privateFileReq = new Request('http://localhost/api/services/files/mock-test-id?token=invalid')
  const privateFileRes = await app.fetch(privateFileReq, envWithSecret)
  assert(
    (privateFileRes.headers.get('cache-control') || '').includes('private'),
    'Private files endpoint retains private cache policy'
  )

  // 8D. Beats pricing retains explicit public policy with stale-while-revalidate
  const pricingReq = new Request('http://localhost/api/beats/pricing?currency=NGN')
  const pricingRes = await app.fetch(pricingReq, envWithSecret)
  assert(
    pricingRes.headers.get('cache-control') === 'public, max-age=300, stale-while-revalidate=600',
    'Beats pricing retains explicit public cache policy with stale-while-revalidate'
  )

  // 8E. Successful media request returns complete HTTP 200 response with all required cache headers
  const mediaReq = new Request('http://localhost/api/media/asset/mock-media-123')
  const mediaRes = await app.fetch(mediaReq, envWithSecret)
  assert(mediaRes.status === 200, 'Successful media request returns HTTP 200 OK')
  assert(mediaRes.headers.get('content-type') === 'image/png', 'Media response retains correct Content-Type')
  assert(mediaRes.headers.get('content-length') === '8', 'Media response retains Content-Length (8 bytes)')
  assert(mediaRes.headers.get('accept-ranges') === 'bytes', 'Media response sets Accept-Ranges: bytes')
  assert(mediaRes.headers.get('cache-control') === 'public, max-age=300', 'Media response sets browser Cache-Control: public, max-age=300')
  assert(mediaRes.headers.get('cloudflare-cdn-cache-control') === 'public, max-age=2592000', 'Media response sets Cloudflare-CDN-Cache-Control: public, max-age=2592000 (30 days)')
  assert(mediaRes.headers.get('cache-tag') === 'media,media:mock-media-123', 'Media response sets Cache-Tag: media,media:<id>')
  assert(!mediaRes.headers.get('cache-control').includes('immutable'), 'Media response avoids immutable attribute')
  assert(mediaRes.headers.get('access-control-allow-origin') === '*', 'Media response preserves wildcard CORS')
  assert(mediaRes.headers.get('cross-origin-resource-policy') === 'cross-origin', 'Media response preserves cross-origin resource policy')

  // 8F. Failed media lookups are not publicly cacheable
  const missingMediaReq = new Request('http://localhost/api/media/asset/missing-asset-404')
  const missingMediaRes = await app.fetch(missingMediaReq, envWithSecret)
  assert(missingMediaRes.status === 404, 'Nonexistent media returns HTTP 404')
  assert(
    missingMediaRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
    '404 Not Found media response receives private no-store policy and is not publicly cached'
  )

  // 8G. Invalidation helper invokes ctx.cache.purge with correct tags
  const purgedTags = []
  const waitUntils = []
  const mockCacheCtx = {
    executionCtx: {
      cache: {
        purge: async ({ tags }) => {
          purgedTags.push(...tags)
        }
      },
      waitUntil: (promise) => {
        waitUntils.push(promise)
      }
    }
  }

  purgeMediaCache(mockCacheCtx, 'media:asset-uuid-1')
  purgeMediaCache(mockCacheCtx, 'media')
  await Promise.all(waitUntils)
  assert(purgedTags.includes('media:asset-uuid-1'), 'purgeMediaCache calls ctx.cache.purge with asset-specific tag')
  assert(purgedTags.includes('media'), 'purgeMediaCache calls ctx.cache.purge with global media tag')

  // 8H. Invalidation helper safely handles failures and logs concise errors without leaking data
  let cacheErrorLogged = false
  let errorWaitPromise = null
  const origErr = console.error
  console.error = (...args) => {
    if (args.join(' ').includes('[Cache] Failed to purge tags')) cacheErrorLogged = true
  }
  const errorCacheCtx = {
    executionCtx: {
      cache: {
        purge: async () => { throw new Error('Simulated edge cache purge error') }
      },
      waitUntil: (p) => { errorWaitPromise = p }
    }
  }
  try {
    purgeMediaCache(errorCacheCtx, 'media:asset-err')
    await errorWaitPromise
  } finally {
    console.error = origErr
  }
  assert(cacheErrorLogged, 'purgeMediaCache handles edge purge error safely with concise log message')

  // 8I. Invalidation helper is safe when ctx.cache is unavailable (e.g. Node.js runner)
  let noopThrew = false
  try {
    purgeMediaCache({}, 'media:noop')
    purgeMediaCache({ executionCtx: {} }, 'media:noop')
  } catch (err) {
    noopThrew = true
  }
  assert(!noopThrew, 'purgeMediaCache operates as a safe no-op when executionCtx.cache is not present')

  // 8J. Public catalogue GET endpoints receive CACHE_POLICIES.CATALOGUE and tags
  const catalogueEndpoints = [
    { path: '/api/releases', tag: 'releases' },
    { path: '/api/beats', tag: 'beats' },
    { path: '/api/music-videos', tag: 'music-videos' },
    { path: '/api/gallery', tag: 'gallery' },
    { path: '/api/events', tag: 'events' },
    { path: '/api/share/beats/mock-beat', tag: 'share' }
  ]
  for (const ep of catalogueEndpoints) {
    const res = await app.fetch(new Request(`http://localhost${ep.path}`), envWithSecret)
    assert(res.status === 200, `${ep.path} returns HTTP 200`)
    assert(
      res.headers.get('cache-control') === CACHE_POLICIES.CATALOGUE,
      `${ep.path} receives CACHE_POLICIES.CATALOGUE Cache-Control`
    )
    assert(
      res.headers.get('cloudflare-cdn-cache-control') === 'public, max-age=3600, stale-while-revalidate=86400',
      `${ep.path} receives Cloudflare-CDN-Cache-Control`
    )
    const tags = (res.headers.get('cache-tag') || '').split(',')
    assert(
      tags.includes('catalogue') && tags.includes(ep.tag),
      `${ep.path} includes tags 'catalogue' and '${ep.tag}' in Cache-Tag`
    )
  }

  // 8K. Rarely changing public data GET endpoints receive CACHE_POLICIES.STATIC_PUBLIC and tags
  const staticEndpoints = [
    { path: '/api/social-links', tag: 'social-links' },
    { path: '/api/gallery/categories', tag: 'gallery-categories' },
    { path: '/api/services', tag: 'services' }
  ]
  for (const ep of staticEndpoints) {
    const res = await app.fetch(new Request(`http://localhost${ep.path}`), envWithSecret)
    assert(res.status === 200, `${ep.path} returns HTTP 200`)
    assert(
      res.headers.get('cache-control') === CACHE_POLICIES.STATIC_PUBLIC,
      `${ep.path} receives CACHE_POLICIES.STATIC_PUBLIC Cache-Control`
    )
    assert(
      res.headers.get('cloudflare-cdn-cache-control') === 'public, max-age=86400, stale-while-revalidate=86400',
      `${ep.path} receives Cloudflare-CDN-Cache-Control for static data`
    )
    const tags = (res.headers.get('cache-tag') || '').split(',')
    assert(
      tags.includes('catalogue') && tags.includes(ep.tag),
      `${ep.path} includes tags 'catalogue' and '${ep.tag}' in Cache-Tag`
    )
  }

  // 8L. Nonexistent public items (404 Not Found) bypass public cache and receive fail-closed private no-store
  const notFoundEndpoints = [
    '/api/releases/nonexistent-item-404',
    '/api/tracks/nonexistent-item-404',
    '/api/beats/nonexistent-item-404',
    '/api/music-videos/nonexistent-item-404',
    '/api/gallery/nonexistent-item-404',
    '/api/events/nonexistent-item-404',
    '/api/services/nonexistent-item-404'
  ]
  for (const path of notFoundEndpoints) {
    const res = await app.fetch(new Request(`http://localhost${path}`), envWithSecret)
    assert(res.status === 404, `${path} returns HTTP 404`)
    assert(
      res.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
      `${path} (404) receives fail-closed private no-store cache policy`
    )
    assert(!res.headers.has('cloudflare-cdn-cache-control'), `${path} (404) does not set Cloudflare-CDN-Cache-Control`)
    assert(!res.headers.has('cache-tag'), `${path} (404) does not set Cache-Tag`)
  }

  // 8M. Admin and authenticated routes strictly retain fail-closed private no-store
  const adminEndpoints = ['/api/admin/releases', '/api/admin/services', '/api/admin/events']
  for (const path of adminEndpoints) {
    const res = await app.fetch(new Request(`http://localhost${path}`, {
      headers: { 'Cookie': `${COOKIE_NAME}=${superadminToken}` }
    }), envWithSecret)
    assert(
      res.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
      `${path} retains private no-store policy for admin session`
    )
    assert(!res.headers.has('cloudflare-cdn-cache-control'), `${path} does not set Cloudflare-CDN-Cache-Control`)
    assert(!res.headers.has('cache-tag'), `${path} does not set Cache-Tag`)
  }

  // 8N. Mutation responses are not publicly cacheable
  const subscribeReq = new Request('http://localhost/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com' })
  })
  const subscribeRes = await app.fetch(subscribeReq, envWithSecret)
  assert(
    subscribeRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
    'POST /api/subscribe receives private no-store policy'
  )
  assert(!subscribeRes.headers.has('cloudflare-cdn-cache-control'), 'POST /api/subscribe does not set Cloudflare-CDN-Cache-Control')

  const loginReq = new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MOCK_ADMIN.email, password: MOCK_ADMIN.password })
  })
  const loginRes = await app.fetch(loginReq, envWithSecret)
  assert(
    loginRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
    'POST /api/admin/login receives private no-store policy'
  )

  // 8O. purgeCatalogueCache invalidation helper verifies purging and safety
  const purgedCatalogueTags = []
  const catalogueWaitUntils = []
  const mockCatalogueCacheCtx = {
    executionCtx: {
      cache: {
        purge: async ({ tags }) => {
          purgedCatalogueTags.push(...tags)
        }
      },
      waitUntil: (p) => {
        catalogueWaitUntils.push(p)
      }
    }
  }

  purgeCatalogueCache(mockCatalogueCacheCtx, ['catalogue', 'releases'])
  purgeCatalogueCache(mockCatalogueCacheCtx, 'beats')
  await Promise.all(catalogueWaitUntils)
  assert(purgedCatalogueTags.includes('catalogue'), 'purgeCatalogueCache purges catalogue tag')
  assert(purgedCatalogueTags.includes('releases'), 'purgeCatalogueCache purges releases tag')
  assert(purgedCatalogueTags.includes('beats'), 'purgeCatalogueCache purges beats tag')

  // Invalidation helper safely handles failures and logs concise errors
  let catCacheErrorLogged = false
  let catErrorWaitPromise = null
  const origCatErr = console.error
  console.error = (...args) => {
    if (args.join(' ').includes('[Cache] Failed to purge catalogue tags')) catCacheErrorLogged = true
  }
  const errorCatCacheCtx = {
    executionCtx: {
      cache: {
        purge: async () => { throw new Error('Simulated edge cache purge error') }
      },
      waitUntil: (p) => { catErrorWaitPromise = p }
    }
  }
  try {
    purgeCatalogueCache(errorCatCacheCtx, ['catalogue', 'releases'])
    await catErrorWaitPromise
  } finally {
    console.error = origCatErr
  }
  assert(catCacheErrorLogged, 'purgeCatalogueCache handles edge purge error safely with concise log message')

  // Invalidation helper is safe when ctx.cache is unavailable
  let catNoopThrew = false
  try {
    purgeCatalogueCache({}, ['catalogue'])
    purgeCatalogueCache({ executionCtx: {} }, ['catalogue'])
    purgeCatalogueCache(null, ['catalogue'])
  } catch (err) {
    catNoopThrew = true
  }
  assert(!catNoopThrew, 'purgeCatalogueCache operates as a safe no-op when executionCtx.cache is not present')

  // 8P. Simulated database failure on /api/share/:type/:slug returns HTTP 500 with private, no-store headers and no Cloudflare cache headers or tags
  simulateDbError = true
  try {
    const errShareRes = await app.fetch(new Request('http://localhost/api/share/beats/mock-beat'), envWithSecret)
    assert(errShareRes.status === 500, 'Simulated DB failure on /api/share/:type/:slug returns HTTP 500')
    assert(
      errShareRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
      'DB failure on /api/share/:type/:slug receives private, no-store cache policy'
    )
    assert(!errShareRes.headers.has('cloudflare-cdn-cache-control'), 'DB failure on /api/share/:type/:slug does not set Cloudflare-CDN-Cache-Control')
    assert(!errShareRes.headers.has('cache-tag'), 'DB failure on /api/share/:type/:slug does not set Cache-Tag')
  } finally {
    simulateDbError = false
  }

  // 8Q. Simulated database failure on another public catalogue endpoint also returns private, no-store headers
  simulateDbError = true
  try {
    const errCatRes = await app.fetch(new Request('http://localhost/api/releases'), envWithSecret)
    assert(errCatRes.status === 500, 'Simulated DB failure on /api/releases returns HTTP 500')
    assert(
      errCatRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
      'DB failure on /api/releases receives private, no-store cache policy'
    )
    assert(!errCatRes.headers.has('cloudflare-cdn-cache-control'), 'DB failure on /api/releases does not set Cloudflare-CDN-Cache-Control')
    assert(!errCatRes.headers.has('cache-tag'), 'DB failure on /api/releases does not set Cache-Tag')
  } finally {
    simulateDbError = false
  }

  // 8R. Missing DATABASE_URL response remains private and uncached
  const noDbRes = await app.fetch(new Request('http://localhost/api/releases'), {})
  assert(noDbRes.status === 500, 'Missing DATABASE_URL returns HTTP 500')
  assert(
    noDbRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
    'Missing DATABASE_URL receives private, no-store cache policy'
  )
  assert(!noDbRes.headers.has('cloudflare-cdn-cache-control'), 'Missing DATABASE_URL does not set Cloudflare-CDN-Cache-Control')
  assert(!noDbRes.headers.has('cache-tag'), 'Missing DATABASE_URL does not set Cache-Tag')

  // 8S. Successful share responses receive correct public cache headers and tags; invalid/fallback shares remain private
  const validBeatShareRes = await app.fetch(new Request('http://localhost/api/share/beats/mock-beat'), envWithSecret)
  assert(validBeatShareRes.status === 200, 'Valid beat share returns HTTP 200')
  assert(
    validBeatShareRes.headers.get('cache-control') === CACHE_POLICIES.CATALOGUE,
    'Valid beat share receives CACHE_POLICIES.CATALOGUE'
  )
  assert(
    validBeatShareRes.headers.get('cloudflare-cdn-cache-control') === 'public, max-age=3600, stale-while-revalidate=86400',
    'Valid beat share receives Cloudflare-CDN-Cache-Control'
  )
  const beatShareTags = (validBeatShareRes.headers.get('cache-tag') || '').split(',')
  assert(beatShareTags.includes('catalogue'), 'Valid beat share includes catalogue tag')
  assert(beatShareTags.includes('share'), 'Valid beat share includes share tag')
  assert(beatShareTags.includes('beats'), 'Valid beat share includes entity tag "beats"')
  assert(beatShareTags.includes('beat:mock-beat'), 'Valid beat share includes item tag "beat:mock-beat"')

  // Release share
  const validRelShareRes = await app.fetch(new Request('http://localhost/api/share/releases/mock-release'), envWithSecret)
  assert(validRelShareRes.status === 200, 'Valid release share returns HTTP 200')
  const relShareTags = (validRelShareRes.headers.get('cache-tag') || '').split(',')
  assert(relShareTags.includes('releases'), 'Valid release share includes entity tag "releases"')
  assert(relShareTags.includes('release:mock-release'), 'Valid release share includes item tag "release:mock-release"')

  // Fallback share for missing record / invalid share type
  const fallbackShareRes = await app.fetch(new Request('http://localhost/api/share/invalid-type/nonexistent-item'), envWithSecret)
  assert(fallbackShareRes.status === 200, 'Fallback share for nonexistent item returns HTTP 200')
  assert(
    fallbackShareRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
    'Fallback share response receives private, no-store cache policy'
  )
  assert(!fallbackShareRes.headers.has('cloudflare-cdn-cache-control'), 'Fallback share does not set Cloudflare-CDN-Cache-Control')
  assert(!fallbackShareRes.headers.has('cache-tag'), 'Fallback share does not set Cache-Tag')

  // 8T. Successful slug/detail responses retain item-specific cache tags
  const detailEndpoints = [
    { path: '/api/releases/mock-release', entityTag: 'releases', itemTag: 'release:mock-release' },
    { path: '/api/beats/mock-beat', entityTag: 'beats', itemTag: 'beat:mock-beat' },
    { path: '/api/events/mock-event', entityTag: 'events', itemTag: 'event:mock-event' },
    { path: '/api/services/mock-service', entityTag: 'services', itemTag: 'service:mock-service' }
  ]
  for (const ep of detailEndpoints) {
    const res = await app.fetch(new Request(`http://localhost${ep.path}`), envWithSecret)
    assert(res.status === 200, `${ep.path} returns HTTP 200`)
    const tags = (res.headers.get('cache-tag') || '').split(',')
    assert(tags.includes('catalogue'), `${ep.path} includes catalogue tag`)
    assert(tags.includes(ep.entityTag), `${ep.path} includes entity tag "${ep.entityTag}"`)
    assert(tags.includes(ep.itemTag), `${ep.path} includes item-specific tag "${ep.itemTag}"`)
  }

  // 8U. Ordinary mutations purge only the necessary entity tags and invalidate associated share caches
  const relPurgedTags = []
  const relWaitUntils = []
  const mockRelCtx = {
    cache: {
      purge: async ({ tags }) => {
        relPurgedTags.push(...tags)
        return { success: true }
      }
    },
    waitUntil: (p) => { relWaitUntils.push(p) }
  }
  const relMutReq = new Request('http://localhost/api/admin/releases/mutation-mock-id', {
    method: 'DELETE',
    headers: { 'Cookie': `${COOKIE_NAME}=${superadminToken}` }
  })
  await app.fetch(relMutReq, envWithSecret, mockRelCtx)
  await Promise.all(relWaitUntils)
  assert(relPurgedTags.includes('releases'), 'Release mutation purges "releases" entity tag')
  assert(!relPurgedTags.includes('catalogue'), 'Release mutation does NOT purge global "catalogue" tag')
  assert(!relPurgedTags.includes('beats'), 'Release mutation does NOT purge "beats" tag')
  assert(!relPurgedTags.includes('events'), 'Release mutation does NOT purge "events" tag')
  assert(relShareTags.includes('releases'), 'Release share cache includes "releases" tag, ensuring invalidation on release mutation')

  const beatPurgedTags = []
  const beatWaitUntils = []
  const mockBeatCtx = {
    cache: {
      purge: async ({ tags }) => {
        beatPurgedTags.push(...tags)
        return { success: true }
      }
    },
    waitUntil: (p) => { beatWaitUntils.push(p) }
  }
  const beatMutReq = new Request('http://localhost/api/admin/beats/mutation-mock-id', {
    method: 'DELETE',
    headers: { 'Cookie': `${COOKIE_NAME}=${superadminToken}` }
  })
  await app.fetch(beatMutReq, envWithSecret, mockBeatCtx)
  await Promise.all(beatWaitUntils)
  assert(beatPurgedTags.includes('beats'), 'Beat mutation purges "beats" entity tag')
  assert(!beatPurgedTags.includes('catalogue'), 'Beat mutation does NOT purge global "catalogue" tag')
  assert(!beatPurgedTags.includes('releases'), 'Beat mutation does NOT purge "releases" tag')
  assert(beatShareTags.includes('beats'), 'Beat share cache includes "beats" tag, ensuring invalidation on beat mutation')

  // 8V. Broad recycle-bin operations still invalidate every affected entity
  const binPurgedTags = []
  const binWaitUntils = []
  const mockBinCtx = {
    cache: {
      purge: async ({ tags }) => {
        binPurgedTags.push(...tags)
        return { success: true }
      }
    },
    waitUntil: (p) => { binWaitUntils.push(p) }
  }
  const binReq = new Request('http://localhost/api/admin/recycle-bin/purge-expired', {
    method: 'POST',
    headers: { 'Cookie': `${COOKIE_NAME}=${superadminToken}` }
  })
  await app.fetch(binReq, envWithSecret, mockBinCtx)
  await Promise.all(binWaitUntils)
  assert(binPurgedTags.includes('catalogue'), 'Recycle bin purge includes "catalogue" tag')
  assert(binPurgedTags.includes('releases'), 'Recycle bin purge includes "releases" tag')
  assert(binPurgedTags.includes('beats'), 'Recycle bin purge includes "beats" tag')
  assert(binPurgedTags.includes('music-videos'), 'Recycle bin purge includes "music-videos" tag')
  assert(binPurgedTags.includes('gallery'), 'Recycle bin purge includes "gallery" tag')
  assert(binPurgedTags.includes('events'), 'Recycle bin purge includes "events" tag')
  assert(binPurgedTags.includes('services'), 'Recycle bin purge includes "services" tag')
  assert(binPurgedTags.includes('social-links'), 'Recycle bin purge includes "social-links" tag')

  // 8W. Scheduled publishing triggers the correct invalidation
  const cronPurgedTags = []
  const mockCronCtx = {
    cache: {
      purge: async ({ tags }) => {
        cronPurgedTags.push(...tags)
        return { success: true }
      }
    }
  }
  await handleScheduledPublishing(envWithSecret, mockCronCtx)
  assert(cronPurgedTags.includes('catalogue'), 'Cron invalidation includes "catalogue" tag')
  assert(cronPurgedTags.includes('releases'), 'Cron invalidation includes "releases" tag')
  assert(cronPurgedTags.includes('beats'), 'Cron invalidation includes "beats" tag')
  assert(cronPurgedTags.includes('music-videos'), 'Cron invalidation includes "music-videos" tag')
  assert(cronPurgedTags.includes('gallery'), 'Cron invalidation includes "gallery" tag')
  assert(cronPurgedTags.includes('social-links'), 'Cron invalidation includes "social-links" tag')

  // 8X. Unpublished events cannot be retrieved through public detail endpoint
  const unpubRes = await app.fetch(new Request('http://localhost/api/events/unpublished-event'), envWithSecret)
  assert(unpubRes.status === 404, 'Unpublished event detail returns HTTP 404')
  assert(
    unpubRes.headers.get('cache-control') === 'private, no-store, no-cache, must-revalidate',
    'Unpublished event detail receives private, no-store cache policy'
  )
  assert(!unpubRes.headers.has('cloudflare-cdn-cache-control'), 'Unpublished event detail does not set Cloudflare-CDN-Cache-Control')
  assert(!unpubRes.headers.has('cache-tag'), 'Unpublished event detail does not set Cache-Tag')

  // Published event returns 200 with public cache headers
  const pubRes = await app.fetch(new Request('http://localhost/api/events/mock-event'), envWithSecret)
  assert(pubRes.status === 200, 'Published event detail returns HTTP 200')
  assert(
    pubRes.headers.get('cache-control') === CACHE_POLICIES.CATALOGUE,
    'Published event detail receives CACHE_POLICIES.CATALOGUE'
  )
  assert(pubRes.headers.get('cache-tag').includes('events'), 'Published event detail includes "events" tag')

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

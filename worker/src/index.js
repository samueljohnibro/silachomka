import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import { sign } from 'hono/jwt'
import { setCookie, deleteCookie } from 'hono/cookie'
import { adminAuth, hashPassword, verifyPassword, COOKIE_NAME } from './auth.js'

const app = new Hono()

// ==========================================
// Middleware & Globals
// ==========================================

const ALLOWED_ORIGINS = new Set([
  'https://silachomka.com',
  'https://www.silachomka.com',
  'https://silachomka.vercel.app',
  'https://silachomka-api.samueljohnibrotech.workers.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
])

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (ALLOWED_ORIGINS.has(origin)) return true
  if (/^https:\/\/[a-z0-9-]+\.silachomka\.pages\.dev$/.test(origin)) return true
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return true
  return false
}

app.use('*', cors({
  origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Middleware to inject DB connection
app.use('*', async (c, next) => {
  if (!c.env.DATABASE_URL) {
    return c.json({ error: 'DATABASE_URL secret is not configured' }, 500)
  }
  c.set('sql', neon(c.env.DATABASE_URL))
  await next()
})

// ==========================================
// Public API Routes
// ==========================================

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'silachomka-api worker foundation is live',
    timestamp: new Date().toISOString()
  })
})

// ------------------------------------------
// Geolocation & Currency Auto-Detection
// ------------------------------------------
app.get('/api/geo', (c) => {
  const country = c.req.header('cf-ipcountry') || c.req.raw?.cf?.country || null
  const countryCurrencyMap = {
    NG: 'NGN',
    GH: 'GHS',
    KE: 'KES',
    ZA: 'ZAR',
    TZ: 'TZS',
    UG: 'UGX',
    RW: 'RWF',
    ZM: 'ZMW',
    CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GQ: 'XAF', GA: 'XAF',
    BJ: 'XOF', BF: 'XOF', CI: 'XOF', GW: 'XOF', ML: 'XOF', NE: 'XOF', SN: 'XOF', TG: 'XOF',
    GB: 'GBP'
  }
  const detectedCurrency = country ? (countryCurrencyMap[country.toUpperCase()] || 'USD') : 'NGN'
  return c.json({
    country,
    currency: detectedCurrency
  })
})

// ------------------------------------------
// Media Serving (BYTEA / R2 fallback with HTTP Range support)
// ------------------------------------------
function decodeHexToBytes(hex) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(hex, 'hex')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

function serveBinaryResponse(c, bytes, contentType) {
  const total = bytes.length
  const rangeHeader = c.req.header('range') || c.req.header('Range')
  const baseHeaders = {
    'Content-Type': contentType || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  }

  if (rangeHeader && /^bytes=/i.test(rangeHeader)) {
    const match = rangeHeader.replace(/^bytes=/i, '').match(/^(\d*)-(\d*)/)
    if (match) {
      let start = match[1] ? parseInt(match[1], 10) : 0
      let end = match[2] ? parseInt(match[2], 10) : total - 1
      if (match[1] === '' && match[2] !== '') {
        const suffixLen = parseInt(match[2], 10)
        start = Math.max(0, total - suffixLen)
        end = total - 1
      }
      if (isNaN(start) || isNaN(end) || start >= total || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes */${total}`
          }
        })
      }
      end = Math.min(end, total - 1)
      const chunk = bytes.subarray(start, end + 1)
      return new Response(chunk, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Content-Length': String(chunk.length)
        }
      })
    }
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(total)
    }
  })
}

app.get('/api/media/asset/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')

  const rows = await sql`
    SELECT id, r2_key, mime_type, encode(file_data, 'hex') as file_hex
    FROM media_assets
    WHERE id = ${id} AND deleted_at IS NULL
  `
  if (rows.length === 0) return c.json({ error: 'Asset not found' }, 404)
  const asset = rows[0]

  if (asset.file_hex) {
    const bytes = decodeHexToBytes(asset.file_hex)
    return serveBinaryResponse(c, bytes, asset.mime_type || 'image/jpeg')
  }

  // Fallback: If bound to R2 bucket, stream from R2
  if (c.env?.MEDIA_BUCKET && asset.r2_key) {
    try {
      const object = await c.env.MEDIA_BUCKET.get(asset.r2_key)
      if (object) {
        const buf = await object.arrayBuffer()
        return serveBinaryResponse(
          c,
          new Uint8Array(buf),
          object.httpMetadata?.contentType || asset.mime_type || 'application/octet-stream'
        )
      }
    } catch (e) {
      console.warn('R2 read failed:', e.message)
    }
  }

  // Fallback: If asset has an r2_key matching static media, redirect to public origin
  if (asset.r2_key) {
    const siteOrigin = c.env?.PUBLIC_ORIGIN || 'https://silachomka.vercel.app'
    const cleanKey = asset.r2_key.replace(/^\//, '')
    return c.redirect(`${siteOrigin}/${cleanKey}`, 302)
  }

  return c.json({ error: 'Asset binary not found' }, 404)
})

app.get('/api/media/:folder/:file', async (c) => {
  const sql = c.get('sql')
  const storageKey = `${c.req.param('folder')}/${c.req.param('file')}`

  const rows = await sql`
    SELECT id, r2_key, mime_type, encode(file_data, 'hex') as file_hex
    FROM media_assets
    WHERE r2_key = ${storageKey} AND deleted_at IS NULL
  `
  if (rows.length === 0) return c.json({ error: 'Asset not found' }, 404)
  const asset = rows[0]

  if (asset.file_hex) {
    const bytes = decodeHexToBytes(asset.file_hex)
    return serveBinaryResponse(c, bytes, asset.mime_type || 'application/octet-stream')
  }

  // Fallback: If bound to R2 bucket, stream from R2
  if (c.env?.MEDIA_BUCKET && asset.r2_key) {
    try {
      const object = await c.env.MEDIA_BUCKET.get(asset.r2_key)
      if (object) {
        const buf = await object.arrayBuffer()
        return serveBinaryResponse(
          c,
          new Uint8Array(buf),
          object.httpMetadata?.contentType || asset.mime_type || 'application/octet-stream'
        )
      }
    } catch (e) {
      console.warn('R2 read failed:', e.message)
    }
  }

  if (asset.r2_key) {
    const siteOrigin = c.env?.PUBLIC_ORIGIN || 'https://silachomka.vercel.app'
    const cleanKey = asset.r2_key.replace(/^\//, '')
    return c.redirect(`${siteOrigin}/${cleanKey}`, 302)
  }

  return c.json({ error: 'Asset binary not found' }, 404)
})

// ------------------------------------------
// Public Subscriptions
// ------------------------------------------
app.post('/api/subscribe', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json().catch(() => ({}))

  // Anti-bot honeypot check: website_hp must be empty
  if (body.website_hp) {
    // Silently succeed to fool bots without adding data
    return c.json({ success: true, message: 'Subscribed successfully.' })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Please provide a valid email address.' }, 400)
  }

  const token = crypto.randomUUID().replace(/-/g, '')
  const source = (body.source || 'website').slice(0, 50)

  try {
    await sql`
      INSERT INTO subscribers (email, status, token, consent_given, source)
      VALUES (${email}, 'ACTIVE', ${token}, true, ${source})
      ON CONFLICT (email) DO UPDATE SET
        status = 'ACTIVE',
        consent_given = true,
        unsubscribed_at = NULL
    `
    return c.json({ success: true, message: 'You have subscribed to Silachomka updates!' })
  } catch (err) {
    return c.json({ error: 'Unable to complete subscription. Please try again.' }, 500)
  }
})

app.get('/api/unsubscribe', async (c) => {
  const sql = c.get('sql')
  const token = c.req.query('token')

  if (!token) {
    return c.html('<html><body style="font-family:sans-serif;background:#0d0d11;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;max-width:400px;padding:24px;border:1px solid #333;border-radius:8px;"><h2>Invalid Unsubscribe Link</h2><p style="color:#aaa;">Missing unsubscribe token.</p></div></body></html>', 400)
  }

  try {
    const result = await sql`
      UPDATE subscribers
      SET status = 'UNSUBSCRIBED', unsubscribed_at = NOW()
      WHERE token = ${token}
      RETURNING id, email
    `

    if (result.length === 0) {
      return c.html('<html><body style="font-family:sans-serif;background:#0d0d11;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;max-width:400px;padding:24px;border:1px solid #333;border-radius:8px;"><h2>Subscription Not Found</h2><p style="color:#aaa;">The requested subscription link was not found or has already expired.</p></div></body></html>', 404)
    }

    return c.html('<html><body style="font-family:sans-serif;background:#0d0d11;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;max-width:400px;padding:24px;border:1px solid #dfc27d;border-radius:8px;"><h2 style="color:#dfc27d;">Unsubscribed Successfully</h2><p style="color:#ddd;">You have been unsubscribed from Silachomka updates.</p><p style="color:#777;font-size:12px;">Email: ' + result[0].email + '</p><a href="https://silachomka.vercel.app" style="color:#dfc27d;text-decoration:none;font-weight:bold;">← Return to Silachomka</a></div></body></html>')
  } catch (err) {
    return c.html('<html><body style="font-family:sans-serif;background:#0d0d11;color:#fff;padding:40px;"><h2>Internal Server Error</h2></body></html>', 500)
  }
})

// ------------------------------------------
// Releases
// ------------------------------------------
function enrichReleasePreviews(rel) {
  if (!rel) return rel
  const urls = []
  if (rel.preview_audio_url) urls.push(rel.preview_audio_url)
  if (Array.isArray(rel.tracks)) {
    for (const t of rel.tracks) {
      if (t && t.preview_audio_url && !urls.includes(t.preview_audio_url)) {
        urls.push(t.preview_audio_url)
      }
    }
  }
  return {
    ...rel,
    preview_audio_url: rel.preview_audio_url || urls[0] || null,
    preview_audio_urls: urls
  }
}

app.get('/api/releases', async (c) => {
  const sql = c.get('sql')
  
  const releases = await sql`
    SELECT 
      r.id, r.slug, r.number, r.title, r.edition, r.release_date as "date", r.release_date as "release_date", r.display_date as "displayDate", r.type, 
      r.primary_artist as artist, r.feats_silachomka as "featssilachomka", r.produced_by_silachomka as "producedBysilachomka", 
      r.description, r.sources, r.platforms, r.status,
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id ELSE '/' || m.r2_key END as cover,
      CASE WHEN mp.file_data IS NOT NULL THEN '/api/media/asset/' || mp.id 
           WHEN mp.r2_key IS NOT NULL THEN '/' || mp.r2_key 
           ELSE NULL END as preview_audio_url,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', t.id,
            'title', CASE WHEN r.release_date > NOW() THEN 'Track ' || LPAD(t.track_number::text, 2, '0') ELSE t.title END,
            'track_number', t.track_number,
            'preview_audio_url', CASE WHEN tp.file_data IS NOT NULL THEN '/api/media/asset/' || tp.id
                                      WHEN tp.r2_key IS NOT NULL THEN '/' || tp.r2_key
                                      ELSE NULL END,
            'platforms', CASE WHEN r.release_date > NOW() THEN '{}'::jsonb ELSE t.platforms END,
            'featuring', (
              SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
              FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'FEATURING'
            ),
            'producers', (
              SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
              FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'PRODUCER'
            )
          ) ORDER BY t.track_number)
          FROM tracks t 
          LEFT JOIN media_assets tp ON t.preview_asset_id = tp.id
          WHERE t.release_id = r.id AND t.deleted_at IS NULL
        ),
        '[]'::json
      ) as tracks,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', mv.slug,
            'title', mv.title,
            'subtitle', mv.subtitle,
            'category', mv.category,
            'youtubeId', mv.youtube_id,
            'youtubeUrl', mv.youtube_url,
            'aspectRatio', mv.aspect_ratio,
            'links', mv.platforms
          ))
          FROM music_videos mv 
          WHERE mv.related_release_id = r.id 
            AND mv.deleted_at IS NULL 
            AND (mv.status = 'PUBLISHED' OR (mv.status = 'SCHEDULED' AND mv.scheduled_at <= NOW()))
        ),
        '[]'::json
      ) as videos,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', gp.slug,
            'title', gp.title,
            'caption', gp.caption,
            'category', gp.category,
            'type', gp.post_type,
            'date', gp.post_date,
            'displayDate', gp.display_date,
            'asset', CASE WHEN gpm.file_data IS NOT NULL THEN '/api/media/asset/' || gpm.id ELSE '/' || gpm.r2_key END,
            'src', CASE WHEN gpm.file_data IS NOT NULL THEN '/api/media/asset/' || gpm.id ELSE '/' || gpm.r2_key END,
            'mimeType', gpm.mime_type,
            'assetType', gpm.asset_type,
            'externalSocialUrl', gp.external_social_url,
            'externalSocialPlatform', gp.external_social_platform,
            'link', gp.legacy_link,
            'slides', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', gs.id,
                'sortOrder', gs.sort_order,
                'slideType', gs.slide_type,
                'asset', CASE WHEN gsm.file_data IS NOT NULL THEN '/api/media/asset/' || gsm.id ELSE '/' || gsm.r2_key END,
                'src', CASE WHEN gsm.file_data IS NOT NULL THEN '/api/media/asset/' || gsm.id ELSE '/' || gsm.r2_key END,
                'mimeType', gsm.mime_type,
                'assetType', gsm.asset_type
              ) ORDER BY gs.sort_order ASC), '[]'::json)
              FROM gallery_slides gs
              LEFT JOIN media_assets gsm ON gs.asset_id = gsm.id
              WHERE gs.post_id = gp.id
            )
          ))
          FROM gallery_posts gp
          LEFT JOIN media_assets gpm ON gp.primary_asset_id = gpm.id
          WHERE gp.related_release_id = r.id 
            AND gp.deleted_at IS NULL 
            AND (gp.status = 'PUBLISHED' OR (gp.status = 'SCHEDULED' AND gp.scheduled_at <= NOW()))
        ),
        '[]'::json
      ) as "associatedGallery"
    FROM releases r
    LEFT JOIN media_assets m ON r.cover_asset_id = m.id
    LEFT JOIN media_assets mp ON r.preview_asset_id = mp.id
    WHERE r.deleted_at IS NULL 
      AND (r.status = 'PUBLISHED' OR r.status = 'SCHEDULED')
    ORDER BY r.release_date DESC
  `
  return c.json(releases.map(enrichReleasePreviews))
})

app.get('/api/releases/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')
  
  const releases = await sql`
    SELECT 
      r.id, r.slug, r.number, r.title, r.edition, r.release_date as "date", r.release_date as "release_date", r.display_date as "displayDate", r.type, 
      r.primary_artist as artist, r.feats_silachomka as "featssilachomka", r.produced_by_silachomka as "producedBysilachomka", 
      r.description, r.sources, r.platforms, r.status,
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id ELSE '/' || m.r2_key END as cover,
      CASE WHEN mp.file_data IS NOT NULL THEN '/api/media/asset/' || mp.id 
           WHEN mp.r2_key IS NOT NULL THEN '/' || mp.r2_key 
           ELSE NULL END as preview_audio_url,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', t.id,
            'title', CASE WHEN r.release_date > NOW() THEN 'Track ' || LPAD(t.track_number::text, 2, '0') ELSE t.title END,
            'track_number', t.track_number,
            'preview_audio_url', CASE WHEN tp.file_data IS NOT NULL THEN '/api/media/asset/' || tp.id
                                      WHEN tp.r2_key IS NOT NULL THEN '/' || tp.r2_key
                                      ELSE NULL END,
            'platforms', CASE WHEN r.release_date > NOW() THEN '{}'::jsonb ELSE t.platforms END,
            'featuring', (
              SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
              FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'FEATURING'
            ),
            'producers', (
              SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
              FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'PRODUCER'
            )
          ) ORDER BY t.track_number)
          FROM tracks t 
          LEFT JOIN media_assets tp ON t.preview_asset_id = tp.id
          WHERE t.release_id = r.id AND t.deleted_at IS NULL
        ),
        '[]'::json
      ) as tracks,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', mv.slug,
            'title', mv.title,
            'subtitle', mv.subtitle,
            'category', mv.category,
            'youtubeId', mv.youtube_id,
            'youtubeUrl', mv.youtube_url,
            'aspectRatio', mv.aspect_ratio,
            'links', mv.platforms
          ))
          FROM music_videos mv 
          WHERE mv.related_release_id = r.id 
            AND mv.deleted_at IS NULL 
            AND (mv.status = 'PUBLISHED' OR (mv.status = 'SCHEDULED' AND mv.scheduled_at <= NOW()))
        ),
        '[]'::json
      ) as videos,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', gp.slug,
            'title', gp.title,
            'caption', gp.caption,
            'category', gp.category,
            'type', gp.post_type,
            'date', gp.post_date,
            'displayDate', gp.display_date,
            'asset', CASE WHEN gpm.file_data IS NOT NULL THEN '/api/media/asset/' || gpm.id ELSE '/' || gpm.r2_key END,
            'src', CASE WHEN gpm.file_data IS NOT NULL THEN '/api/media/asset/' || gpm.id ELSE '/' || gpm.r2_key END,
            'mimeType', gpm.mime_type,
            'assetType', gpm.asset_type,
            'externalSocialUrl', gp.external_social_url,
            'externalSocialPlatform', gp.external_social_platform,
            'link', gp.legacy_link,
            'slides', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', gs.id,
                'sortOrder', gs.sort_order,
                'slideType', gs.slide_type,
                'asset', CASE WHEN gsm.file_data IS NOT NULL THEN '/api/media/asset/' || gsm.id ELSE '/' || gsm.r2_key END,
                'src', CASE WHEN gsm.file_data IS NOT NULL THEN '/api/media/asset/' || gsm.id ELSE '/' || gsm.r2_key END,
                'mimeType', gsm.mime_type,
                'assetType', gsm.asset_type
              ) ORDER BY gs.sort_order ASC), '[]'::json)
              FROM gallery_slides gs
              LEFT JOIN media_assets gsm ON gs.asset_id = gsm.id
              WHERE gs.post_id = gp.id
            )
          ))
          FROM gallery_posts gp
          LEFT JOIN media_assets gpm ON gp.primary_asset_id = gpm.id
          WHERE gp.related_release_id = r.id 
            AND gp.deleted_at IS NULL 
            AND (gp.status = 'PUBLISHED' OR (gp.status = 'SCHEDULED' AND gp.scheduled_at <= NOW()))
        ),
        '[]'::json
      ) as "associatedGallery"
    FROM releases r
    LEFT JOIN media_assets m ON r.cover_asset_id = m.id
    LEFT JOIN media_assets mp ON r.preview_asset_id = mp.id
    WHERE (r.slug = ${slug} OR COALESCE(r.previous_slugs, '[]'::jsonb) @> to_jsonb(${slug}::text))
      AND r.deleted_at IS NULL 
      AND (r.status = 'PUBLISHED' OR r.status = 'SCHEDULED')
  `
  
  if (releases.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(enrichReleasePreviews(releases[0]))
})

app.get('/api/tracks/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const tracks = await sql`
    SELECT 
      t.id, t.title, t.track_number, t.platforms, t.preview_asset_id,
      CASE WHEN tp.file_data IS NOT NULL THEN '/api/media/asset/' || tp.id
           WHEN tp.r2_key IS NOT NULL THEN '/' || tp.r2_key
           ELSE NULL END as preview_audio_url,
      (
        SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
        FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'FEATURING'
      ) as featuring,
      (
        SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
        FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'PRODUCER'
      ) as producers
    FROM tracks t
    LEFT JOIN media_assets tp ON t.preview_asset_id = tp.id
    WHERE t.id = ${id} AND t.deleted_at IS NULL
  `
  if (tracks.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(tracks[0])
})

// ------------------------------------------
// Beats & Selar Pricing
// ------------------------------------------
const selarPricingCache = new Map()
const SELAR_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes cache

app.get('/api/beats/pricing', async (c) => {
  let reqCurrency = (c.req.query('currency') || 'NGN').toUpperCase().trim()
  if (reqCurrency === 'AUTO') {
    const country = c.req.header('cf-ipcountry') || c.req.raw?.cf?.country || null
    const countryCurrencyMap = {
      NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', TZ: 'TZS', UG: 'UGX', RW: 'RWF', ZM: 'ZMW',
      CM: 'XAF', CF: 'XAF', TD: 'XAF', CG: 'XAF', GQ: 'XAF', GA: 'XAF',
      BJ: 'XOF', BF: 'XOF', CI: 'XOF', GW: 'XOF', ML: 'XOF', NE: 'XOF', SN: 'XOF', TG: 'XOF',
      GB: 'GBP'
    }
    reqCurrency = country ? (countryCurrencyMap[country.toUpperCase()] || 'USD') : 'NGN'
  }
  const cacheKey = reqCurrency
  const now = Date.now()

  const cached = selarPricingCache.get(cacheKey)
  if (cached && (now - cached.timestamp < SELAR_CACHE_TTL_MS)) {
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    return c.json(cached.data)
  }

  try {
    let page = 1
    let allProducts = []
    let hasMore = true

    while (hasMore && page <= 5) {
      const selarRes = await fetch(`https://selar.com/api/v1/store/merchants/chomkamusicstudio/products?currency=${encodeURIComponent(reqCurrency)}&page=${page}`, {
        headers: { 'Accept': 'application/json' },
        cf: { cacheTtl: 300, cacheEverything: true }
      })
      if (!selarRes.ok) {
        throw new Error(`Selar API responded with status ${selarRes.status}`)
      }
      const json = await selarRes.json()
      const products = json?.data?.products || []
      allProducts.push(...products)
      hasMore = Boolean(json?.data?.has_more && products.length > 0)
      page++
    }

    if (allProducts.length === 0) {
      throw new Error('No products returned from Selar Store API')
    }

    const activeCurrency = allProducts[0].currency || reqCurrency
    const activeSymbol = allProducts[0].currency_code || '$'

    const productsBySlug = {}
    const byBeat = {}
    const defaultTiers = {}

    for (const p of allProducts) {
      const slug = p.url_slug
      const numericAmount = Number(p.amount)
      const formatted = `${p.currency_code}${numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
      })}`

      const prodObj = {
        code: p.code,
        name: p.name,
        amount: numericAmount,
        currency: p.currency,
        currencySymbol: p.currency_code,
        formatted,
        url: p.url
      }

      productsBySlug[slug] = prodObj
      if (p.code) {
        productsBySlug[p.code] = prodObj
      }

      // Pattern: chomkamusicstudio-{beatSlug}-{tier}
      const match = slug.match(/^chomkamusicstudio-(.+)-(basic|premium|ultimate)$/)
      if (match) {
        const beatSlug = match[1]
        const tier = match[2]
        if (!byBeat[beatSlug]) byBeat[beatSlug] = {}
        byBeat[beatSlug][tier] = prodObj
        if (!defaultTiers[tier]) {
          defaultTiers[tier] = prodObj
        }
      }
    }

    const payload = {
      success: true,
      currency: activeCurrency,
      currencySymbol: activeSymbol,
      supportedCurrencies: [
        "NGN", "USD", "GBP", "GHS", "KES", "ZAR", "TZS", "UGX", "XAF", "XOF", "RWF", "ZMW", "SLE"
      ],
      products: productsBySlug,
      byBeat,
      defaultTiers,
      cachedAt: new Date().toISOString()
    }

    selarPricingCache.set(cacheKey, { data: payload, timestamp: now })
    c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    return c.json(payload)
  } catch (err) {
    console.error('Failed to fetch Selar pricing:', err.message)
    if (cached) {
      return c.json({ ...cached.data, stale: true })
    }
    return c.json({
      success: false,
      error: 'Unable to retrieve authoritative Selar pricing',
      message: err.message
    }, 502)
  }
})

app.get('/api/beats', async (c) => {
  const sql = c.get('sql')
  const beats = await sql`
    SELECT 
      b.id as db_id, b.slug as id, b.title, b.genre, b.short_genre as "shortGenre", b.categories,
      b.bpm, b.beat_key as key, b.producer, b.description, b.mood,
      b.price_basic as "priceBasic", b.price_premium as "pricePremium", b.price_exclusive as "priceExclusive",
      CASE WHEN img.file_data IS NOT NULL THEN '/api/media/asset/' || img.id
           WHEN img.r2_key IS NOT NULL THEN '/' || img.r2_key
           ELSE NULL END as image,
      img.mime_type as "imageMimeType",
      CASE WHEN vid.file_data IS NOT NULL THEN
             '/api/media/asset/' || vid.id || CASE WHEN vid.mime_type = 'image/gif' OR vid.r2_key ILIKE '%.gif' THEN '?.gif' ELSE '' END
           WHEN vid.r2_key IS NOT NULL THEN '/' || vid.r2_key
           ELSE NULL END as video,
      vid.mime_type as "videoMimeType",
      CASE WHEN aud.file_data IS NOT NULL THEN '/api/media/asset/' || aud.id
           WHEN aud.r2_key IS NOT NULL THEN '/' || aud.r2_key
           ELSE NULL END as audio,
      json_build_object(
        'basic', b.selar_basic_url,
        'premium', b.selar_premium_url,
        'ultimate', b.selar_ultimate_url
      ) as selar
    FROM beats b
    LEFT JOIN media_assets img ON b.image_asset_id = img.id
    LEFT JOIN media_assets vid ON b.video_asset_id = vid.id
    LEFT JOIN media_assets aud ON b.audio_asset_id = aud.id
    WHERE b.deleted_at IS NULL 
      AND (b.status = 'PUBLISHED' OR (b.status = 'SCHEDULED' AND b.scheduled_at <= NOW()))
    ORDER BY b.created_at DESC
  `
  return c.json(beats)
})

app.get('/api/beats/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')
  const beats = await sql`
    SELECT 
      b.id as db_id, b.slug as id, b.title, b.genre, b.short_genre as "shortGenre", b.categories,
      b.bpm, b.beat_key as key, b.producer, b.description, b.mood,
      b.price_basic as "priceBasic", b.price_premium as "pricePremium", b.price_exclusive as "priceExclusive",
      CASE WHEN img.file_data IS NOT NULL THEN '/api/media/asset/' || img.id
           WHEN img.r2_key IS NOT NULL THEN '/' || img.r2_key
           ELSE NULL END as image,
      img.mime_type as "imageMimeType",
      CASE WHEN vid.file_data IS NOT NULL THEN
             '/api/media/asset/' || vid.id || CASE WHEN vid.mime_type = 'image/gif' OR vid.r2_key ILIKE '%.gif' THEN '?.gif' ELSE '' END
           WHEN vid.r2_key IS NOT NULL THEN '/' || vid.r2_key
           ELSE NULL END as video,
      vid.mime_type as "videoMimeType",
      CASE WHEN aud.file_data IS NOT NULL THEN '/api/media/asset/' || aud.id
           WHEN aud.r2_key IS NOT NULL THEN '/' || aud.r2_key
           ELSE NULL END as audio,
      json_build_object(
        'basic', b.selar_basic_url,
        'premium', b.selar_premium_url,
        'ultimate', b.selar_ultimate_url
      ) as selar
    FROM beats b
    LEFT JOIN media_assets img ON b.image_asset_id = img.id
    LEFT JOIN media_assets vid ON b.video_asset_id = vid.id
    LEFT JOIN media_assets aud ON b.audio_asset_id = aud.id
    WHERE b.slug = ${slug} 
      AND b.deleted_at IS NULL 
      AND (b.status = 'PUBLISHED' OR (b.status = 'SCHEDULED' AND b.scheduled_at <= NOW()))
  `
  if (beats.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(beats[0])
})

// ------------------------------------------
// Music Videos
// ------------------------------------------
app.get('/api/music-videos', async (c) => {
  const sql = c.get('sql')
  const videos = await sql`
    SELECT 
      v.slug as id, v.title, v.subtitle, v.category, v.youtube_id as "youtubeId", 
      v.youtube_url as "youtubeUrl", v.aspect_ratio as "aspectRatio", v.platforms as links,
      v.related_release_id as "relatedReleaseId",
      v.related_track_id as "relatedTrackId",
      COALESCE(
        (SELECT json_agg(f.artist_name) FROM music_video_features f WHERE f.video_id = v.id),
        '[]'::json
      ) as featuring
    FROM music_videos v
    WHERE v.deleted_at IS NULL 
      AND (v.status = 'PUBLISHED' OR (v.status = 'SCHEDULED' AND v.scheduled_at <= NOW()))
    ORDER BY v.created_at DESC
  `
  return c.json(videos)
})

app.get('/api/music-videos/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')
  const videos = await sql`
    SELECT 
      v.slug as id, v.title, v.subtitle, v.category, v.youtube_id as "youtubeId", 
      v.youtube_url as "youtubeUrl", v.aspect_ratio as "aspectRatio", v.platforms as links,
      COALESCE(
        (SELECT json_agg(f.artist_name) FROM music_video_features f WHERE f.video_id = v.id),
        '[]'::json
      ) as featuring
    FROM music_videos v
    WHERE v.slug = ${slug} 
      AND v.deleted_at IS NULL 
      AND (v.status = 'PUBLISHED' OR (v.status = 'SCHEDULED' AND v.scheduled_at <= NOW()))
  `
  if (videos.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(videos[0])
})

// ------------------------------------------
// Social Links
// ------------------------------------------
app.get('/api/social-links', async (c) => {
  const sql = c.get('sql')
  const links = await sql`
    SELECT name, handle, url, platform, category, role, link_type, show_on_gallery_posts
    FROM social_links
    WHERE is_active = true AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `
  return c.json({
    artist: links.filter(l => l.link_type === 'ARTIST'),
    ecosystem: links.filter(l => l.link_type === 'ECOSYSTEM'),
    galleryEligible: links.filter(l => l.show_on_gallery_posts === true)
  })
})

// ------------------------------------------
// Gallery
// ------------------------------------------
app.get('/api/gallery/categories', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT slug, label FROM gallery_categories ORDER BY label ASC`
  return c.json(rows)
})

app.get('/api/gallery', async (c) => {
  const sql = c.get('sql')
  const posts = await sql`
    SELECT 
      g.slug as id, g.title, g.caption, g.category, g.post_type as type,
      g.post_date as date, 
      COALESCE(to_char(g.post_date, 'FMDay, FMMonth FMDD, YYYY'), g.display_date) as "displayDate",
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id
           WHEN m.r2_key IS NOT NULL THEN '/' || m.r2_key
           ELSE NULL END as asset,
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id
           WHEN m.r2_key IS NOT NULL THEN '/' || m.r2_key
           ELSE NULL END as src,
      m.mime_type as "mimeType",
      m.asset_type as "assetType",
      g.legacy_link as link,
      g.external_social_url as "externalSocialUrl",
      g.external_social_platform as "externalSocialPlatform",
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', gs.id,
            'sortOrder', gs.sort_order,
            'slideType', gs.slide_type,
            'asset', CASE WHEN sm.file_data IS NOT NULL THEN '/api/media/asset/' || sm.id ELSE '/' || sm.r2_key END,
            'src', CASE WHEN sm.file_data IS NOT NULL THEN '/api/media/asset/' || sm.id ELSE '/' || sm.r2_key END,
            'mimeType', sm.mime_type,
            'assetType', sm.asset_type
          ) ORDER BY gs.sort_order ASC)
          FROM gallery_slides gs
          LEFT JOIN media_assets sm ON gs.asset_id = sm.id
          WHERE gs.post_id = g.id
        ),
        '[]'::json
      ) as slides
    FROM gallery_posts g
    LEFT JOIN media_assets m ON g.primary_asset_id = m.id
    WHERE g.deleted_at IS NULL 
      AND (g.status = 'PUBLISHED' OR (g.status = 'SCHEDULED' AND g.scheduled_at <= NOW()))
    ORDER BY g.post_date DESC
  `
  return c.json(posts)
})

app.get('/api/gallery/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')
  const posts = await sql`
    SELECT 
      g.slug as id, g.title, g.caption, g.category, g.post_type as type,
      g.post_date as date, 
      COALESCE(to_char(g.post_date, 'FMDay, FMMonth FMDD, YYYY'), g.display_date) as "displayDate",
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id
           WHEN m.r2_key IS NOT NULL THEN '/' || m.r2_key
           ELSE NULL END as asset,
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id
           WHEN m.r2_key IS NOT NULL THEN '/' || m.r2_key
           ELSE NULL END as src,
      m.mime_type as "mimeType",
      m.asset_type as "assetType",
      g.legacy_link as link,
      g.external_social_url as "externalSocialUrl",
      g.external_social_platform as "externalSocialPlatform",
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', gs.id,
            'sortOrder', gs.sort_order,
            'slideType', gs.slide_type,
            'asset', CASE WHEN sm.file_data IS NOT NULL THEN '/api/media/asset/' || sm.id ELSE '/' || sm.r2_key END,
            'src', CASE WHEN sm.file_data IS NOT NULL THEN '/api/media/asset/' || sm.id ELSE '/' || sm.r2_key END,
            'mimeType', sm.mime_type,
            'assetType', sm.asset_type
          ) ORDER BY gs.sort_order ASC)
          FROM gallery_slides gs
          LEFT JOIN media_assets sm ON gs.asset_id = sm.id
          WHERE gs.post_id = g.id
        ),
        '[]'::json
      ) as slides
    FROM gallery_posts g
    LEFT JOIN media_assets m ON g.primary_asset_id = m.id
    WHERE g.slug = ${slug} 
      AND g.deleted_at IS NULL 
      AND (g.status = 'PUBLISHED' OR (g.status = 'SCHEDULED' AND g.scheduled_at <= NOW()))
  `
  if (posts.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(posts[0])
})

// ------------------------------------------
// Music Services & Studio Orders (/api/services)
// ------------------------------------------
app.get('/api/services', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`
    SELECT id, slug, title, tagline, description, category, base_price_ngn as "basePriceNgn",
           is_hourly as "isHourly", hourly_rate_ngn as "hourlyRateNgn", deliverables,
           turnaround_days as "turnaroundDays", sort_order as "sortOrder", is_active as "isActive"
    FROM music_services
    WHERE is_active = true
    ORDER BY sort_order ASC, created_at ASC
  `
  return c.json(rows)
})

app.get('/api/services/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = String(c.req.param('slug') || '').trim().toLowerCase()
  const rows = await sql`
    SELECT id, slug, title, tagline, description, category, base_price_ngn as "basePriceNgn",
           is_hourly as "isHourly", hourly_rate_ngn as "hourlyRateNgn", deliverables,
           turnaround_days as "turnaroundDays", sort_order as "sortOrder", is_active as "isActive"
    FROM music_services
    WHERE slug = ${slug} AND is_active = true
  `
  if (rows.length === 0) return c.json({ error: 'Service not found' }, 404)
  return c.json(rows[0])
})

// Private client upload endpoint (stems, vocal audio, reference tracks)
// Client files are strictly isolated from public catalogue & public gallery
app.post('/api/services/upload', async (c) => {
  const sql = c.get('sql')
  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file provided' }, 400)
    }

    const fileName = file.name || 'unnamed-file'
    const fileSize = file.size || 0
    const mimeType = file.type || 'application/octet-stream'

    // 100MB limit per file
    if (fileSize > 100 * 1024 * 1024) {
      return c.json({ error: 'File size exceeds 100MB limit' }, 400)
    }

    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    const accessToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const fileHex = '\\x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

    const inserted = await sql`
      INSERT INTO service_private_files (
        file_name, file_size, mime_type, file_data, access_token
      ) VALUES (
        ${fileName}, ${fileSize}, ${mimeType}, ${fileHex}::bytea, ${accessToken}
      )
      RETURNING id, file_name, file_size, mime_type, access_token, created_at
    `
    const record = inserted[0]

    return c.json({
      success: true,
      file: {
        id: record.id,
        name: record.file_name,
        size: Number(record.file_size),
        type: record.mime_type,
        token: record.access_token,
        url: `/api/services/files/${record.id}?token=${record.access_token}`
      }
    })
  } catch (err) {
    console.error('Private file upload error:', err)
    return c.json({ error: 'Upload failed', message: err.message }, 500)
  }
})

// Secure private file download endpoint
app.get('/api/services/files/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const token = c.req.query('token')

  const rows = await sql`
    SELECT id, file_name, file_size, mime_type, encode(file_data, 'hex') as file_hex, access_token
    FROM service_private_files
    WHERE id = ${id}
  `
  if (rows.length === 0) return c.json({ error: 'File not found' }, 404)
  const file = rows[0]

  // Validate token or admin authentication
  let authorized = false
  if (token && token === file.access_token) {
    authorized = true
  } else {
    const cookieToken = getCookie(c, COOKIE_NAME)
    if (cookieToken && c.env?.JWT_SECRET) {
      try {
        const payload = await verify(cookieToken, c.env.JWT_SECRET)
        if (payload?.sub) authorized = true
      } catch {}
    }
  }

  if (!authorized) {
    return c.json({ error: 'Unauthorized: Valid access token required' }, 403)
  }

  if (file.file_hex) {
    const bytes = decodeHexToBytes(file.file_hex)
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.file_name)}"`,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, no-cache'
      }
    })
  }

  return c.json({ error: 'File data unavailable' }, 404)
})

// Create Service Order
app.post('/api/services/orders', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json().catch(() => ({}))

  const customerName = String(body.customerName || body.customer_name || '').trim()
  const customerEmail = String(body.customerEmail || body.customer_email || '').trim().toLowerCase()
  const customerPhone = String(body.customerPhone || body.customer_phone || '').trim()
  const customerMessage = String(body.customerMessage || body.customer_message || body.message || '').trim()
  const clientFiles = Array.isArray(body.clientFiles || body.client_files) ? (body.clientFiles || body.client_files) : []

  if (!customerName) {
    return c.json({ error: 'Customer name is required' }, 400)
  }
  if (!customerEmail || !customerEmail.includes('@')) {
    return c.json({ error: 'Valid customer email is required' }, 400)
  }

  // Multi-service cart order support (Req #20 & #21)
  const rawServices = Array.isArray(body.services) && body.services.length > 0
    ? body.services
    : (body.serviceSlug || body.service_slug)
      ? [{ slug: body.serviceSlug || body.service_slug, configuration: body.configuration || {} }]
      : []

  if (rawServices.length === 0) {
    return c.json({ error: 'At least one service must be selected' }, 400)
  }

  // Fetch all active studio services
  const dbServices = await sql`
    SELECT id, slug, title, category, base_price_ngn, is_hourly, hourly_rate_ngn, turnaround_days
    FROM music_services
    WHERE is_active = true
  `
  const serviceMap = new Map(dbServices.map(s => [s.slug, s]))

  const processedItems = []
  let hasPriceUponRequest = false
  let calculatedGrandTotal = 0

  for (const item of rawServices) {
    const slug = String(item.slug || item.serviceSlug || '').trim().toLowerCase()
    const s = serviceMap.get(slug)
    if (!s) {
      return c.json({ error: `Service '${slug}' is invalid or currently inactive` }, 400)
    }

    const cfg = item.configuration || {}
    let itemPrice = null

    if (s.is_hourly) {
      const hours = Math.max(1, parseInt(cfg.hours || 1, 10))
      cfg.hours = hours
      const rate = Number(s.hourly_rate_ngn || 25000)
      itemPrice = rate * hours
      calculatedGrandTotal += itemPrice
    } else if (s.base_price_ngn !== null && s.base_price_ngn !== undefined) {
      itemPrice = Number(s.base_price_ngn)
      calculatedGrandTotal += itemPrice
    } else {
      // Service #5: Price Upon Request (TBD)
      hasPriceUponRequest = true
      itemPrice = null
    }

    processedItems.push({
      serviceId: s.id,
      slug: s.slug,
      title: s.title,
      category: s.category,
      basePriceNgn: s.base_price_ngn ? Number(s.base_price_ngn) : null,
      isHourly: s.is_hourly,
      hourlyRateNgn: s.hourly_rate_ngn ? Number(s.hourly_rate_ngn) : null,
      calculatedPriceNgn: itemPrice,
      configuration: cfg
    })
  }

  const finalTotalNgn = hasPriceUponRequest ? null : calculatedGrandTotal
  const year = new Date().getFullYear()
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase()
  const orderNumber = `SC-SRV-${year}-${randomChars}`
  const initialStatus = finalTotalNgn === null ? 'IN_PROGRESS' : 'AWAITING_PAYMENT'

  const primaryService = processedItems[0]
  const aggregatedTitle = processedItems.map(i => i.title).join(' + ')
  const primarySlug = processedItems.length === 1 ? primaryService.slug : 'custom-session'

  const inserted = await sql`
    INSERT INTO service_orders (
      order_number, service_id, service_slug, service_title, customer_name, customer_email, customer_phone,
      customer_message, configuration, items, client_files, total_amount_ngn, currency, payment_status, order_status, deadline_timezone
    ) VALUES (
      ${orderNumber}, ${primaryService.serviceId}, ${primarySlug}, ${aggregatedTitle}, ${customerName}, ${customerEmail}, ${customerPhone || null},
      ${customerMessage || null}, ${JSON.stringify(primaryService.configuration)}::jsonb, ${JSON.stringify(processedItems)}::jsonb,
      ${JSON.stringify(clientFiles)}::jsonb, ${finalTotalNgn}, 'NGN', 'UNPAID', ${initialStatus}, 'WAT'
    )
    RETURNING id, order_number, service_slug, service_title, customer_name, customer_email, total_amount_ngn, currency, order_status, items, created_at
  `

  return c.json({
    success: true,
    order: {
      id: inserted[0].id,
      orderNumber: inserted[0].order_number,
      serviceSlug: inserted[0].service_slug,
      serviceTitle: inserted[0].service_title,
      customerName: inserted[0].customer_name,
      customerEmail: inserted[0].customer_email,
      totalAmountNgn: inserted[0].total_amount_ngn ? Number(inserted[0].total_amount_ngn) : null,
      currency: inserted[0].currency,
      orderStatus: inserted[0].order_status,
      items: inserted[0].items || processedItems,
      createdAt: inserted[0].created_at
    }
  }, 201)
})

// Get Customer Order Status
app.get('/api/services/orders/:orderNumber', async (c) => {
  const sql = c.get('sql')
  const orderNumber = String(c.req.param('orderNumber') || '').trim().toUpperCase()

  const rows = await sql`
    SELECT 
      o.id, o.order_number as "orderNumber", o.service_slug as "serviceSlug", o.service_title as "serviceTitle",
      o.customer_name as "customerName", o.customer_email as "customerEmail", o.customer_phone as "customerPhone",
      o.configuration, o.client_files as "clientFiles", o.total_amount_ngn as "totalAmountNgn", o.currency,
      o.payment_status as "paymentStatus", o.payment_reference as "paymentReference", o.payment_provider as "paymentProvider",
      o.order_status as "orderStatus", o.agreed_deadline as "agreedDeadline", o.deadline_timezone as "deadlineTimezone",
      o.deliverables, o.created_at as "createdAt", o.updated_at as "updatedAt",
      s.tagline as "serviceTagline", s.category as "serviceCategory", s.turnaround_days as "turnaroundDays"
    FROM service_orders o
    LEFT JOIN music_services s ON o.service_slug = s.slug
    WHERE o.order_number = ${orderNumber} OR o.id::text = ${orderNumber}
  `
  if (rows.length === 0) return c.json({ error: 'Order not found' }, 404)
  const o = rows[0]

  return c.json({
    orderNumber: o.orderNumber,
    serviceSlug: o.serviceSlug,
    serviceTitle: o.serviceTitle,
    serviceTagline: o.serviceTagline,
    serviceCategory: o.serviceCategory,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    configuration: o.configuration,
    clientFilesCount: Array.isArray(o.clientFiles) ? o.clientFiles.length : 0,
    totalAmountNgn: o.totalAmountNgn ? Number(o.totalAmountNgn) : null,
    currency: o.currency || 'NGN',
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    agreedDeadline: o.agreedDeadline,
    deadlineTimezone: o.deadlineTimezone || 'WAT',
    deliverables: (o.orderStatus === 'DELIVERED' || o.orderStatus === 'COMPLETED') ? o.deliverables : [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  })
})

// Initialize payment for service order

// Verify Paystack Payment Server-Side (Req #26 & #27)
app.post('/api/services/verify-payment', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json().catch(() => ({}))
  const reference = String(body.reference || '').trim()
  const orderNumber = String(body.orderNumber || body.order_number || '').trim().toUpperCase()

  if (!reference && !orderNumber) {
    return c.json({ error: 'Reference or order number is required' }, 400)
  }

  const rows = await sql`
    SELECT id, order_number, total_amount_ngn, payment_status, order_status, customer_email
    FROM service_orders
    WHERE order_number = ${orderNumber} OR payment_reference = ${reference}
  `
  if (rows.length === 0) return c.json({ error: 'Order not found' }, 404)
  const order = rows[0]

  // Idempotent duplicate check
  if (order.payment_status === 'PAID') {
    return c.json({
      success: true,
      alreadyPaid: true,
      orderNumber: order.order_number,
      orderStatus: order.order_status,
      paymentStatus: 'PAID'
    })
  }

  if (c.env?.PAYSTACK_SECRET_KEY && c.env.PAYSTACK_SECRET_KEY.startsWith('sk_')) {
    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          'Authorization': `Bearer ${c.env.PAYSTACK_SECRET_KEY}`
        }
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.status || verifyData.data?.status !== 'success') {
        return c.json({
          error: 'Payment verification failed',
          details: verifyData.data?.gateway_response || 'Transaction not confirmed'
        }, 400)
      }

      // Authoritative server amount check (Req #27)
      const expectedKobo = Math.round(Number(order.total_amount_ngn || 0) * 100)
      const actualKobo = Number(verifyData.data?.amount || 0)
      if (expectedKobo > 0 && actualKobo < expectedKobo) {
        return c.json({ error: 'Amount paid does not match authoritative order total' }, 400)
      }

      await sql`
        UPDATE service_orders
        SET payment_status = 'PAID', order_status = 'PAID', paid_at = NOW(),
            payment_reference = ${reference}, payment_provider = 'PAYSTACK', updated_at = NOW()
        WHERE id = ${order.id}
      `

      return c.json({
        success: true,
        orderNumber: order.order_number,
        paymentStatus: 'PAID',
        orderStatus: 'PAID',
        reference
      })
    } catch (e) {
      return c.json({ error: 'Error connecting to payment authority: ' + e.message }, 502)
    }
  }

  // Development/mock fallback verification
  await sql`
    UPDATE service_orders
    SET payment_status = 'PAID', order_status = 'PAID', paid_at = NOW(),
        payment_reference = COALESCE(payment_reference, ${reference}), updated_at = NOW()
    WHERE id = ${order.id}
  `

  return c.json({
    success: true,
    orderNumber: order.order_number,
    paymentStatus: 'PAID',
    orderStatus: 'PAID',
    reference
  })
})

// Paystack Webhook Handler (Req #26 & #27)
app.post('/api/services/webhook', async (c) => {
  const sql = c.get('sql')
  const signature = c.req.header('x-paystack-signature')
  const rawBody = await c.req.text()
  
  if (c.env?.PAYSTACK_SECRET_KEY && signature) {
    try {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(c.env.PAYSTACK_SECRET_KEY),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['verify']
      )
      const sigBytes = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
      const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody))
      if (!isValid) {
        return c.json({ error: 'Invalid webhook signature' }, 401)
      }
    } catch (e) {
      console.warn('Webhook signature check error:', e.message)
    }
  }

  const payload = JSON.parse(rawBody || '{}')
  if (payload.event === 'charge.success') {
    const data = payload.data || {}
    const orderNumber = data.metadata?.order_number
    const reference = data.reference

    if (orderNumber || reference) {
      await sql`
        UPDATE service_orders
        SET payment_status = 'PAID', order_status = 'PAID', paid_at = NOW(),
            payment_reference = ${reference}, payment_provider = 'PAYSTACK', updated_at = NOW()
        WHERE (order_number = ${orderNumber} OR payment_reference = ${reference})
          AND payment_status != 'PAID'
      `
    }
  }

  return c.json({ received: true })
})

app.post('/api/services/orders/:orderNumber/payment', async (c) => {
  const sql = c.get('sql')
  const orderNumber = String(c.req.param('orderNumber') || '').trim().toUpperCase()

  const rows = await sql`
    SELECT id, order_number, service_title, customer_name, customer_email, total_amount_ngn, currency, order_status, payment_status
    FROM service_orders
    WHERE order_number = ${orderNumber} OR id::text = ${orderNumber}
  `
  if (rows.length === 0) return c.json({ error: 'Order not found' }, 404)
  const order = rows[0]

  if (!order.total_amount_ngn || Number(order.total_amount_ngn) <= 0) {
    return c.json({
      error: 'Order price is not yet defined or requires creator review',
      message: 'The creator is reviewing your project details. You will receive an invoice once confirmed.'
    }, 400)
  }

  const amountKobo = Math.round(Number(order.total_amount_ngn) * 100)
  const reference = `PAY-${order.order_number}-${Date.now()}`

  if (c.env?.PAYSTACK_SECRET_KEY && c.env.PAYSTACK_SECRET_KEY.startsWith('sk_')) {
    try {
      const siteOrigin = c.env?.PUBLIC_ORIGIN || 'https://silachomka.vercel.app'
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: order.customer_email,
          amount: amountKobo,
          reference,
          callback_url: `${siteOrigin}/services/order/${order.order_number}?paid=true`,
          metadata: {
            order_number: order.order_number,
            service_title: order.service_title,
            customer_name: order.customer_name
          }
        })
      })
      const paystackData = await paystackRes.json()
      if (paystackData.status && paystackData.data?.authorization_url) {
        await sql`
          UPDATE service_orders
          SET payment_reference = ${reference}, payment_provider = 'PAYSTACK', updated_at = NOW()
          WHERE id = ${order.id}
        `
        return c.json({
          success: true,
          provider: 'PAYSTACK',
          authorizationUrl: paystackData.data.authorization_url,
          accessCode: paystackData.data.access_code,
          reference
        })
      }
    } catch (e) {
      console.warn('Paystack initialization fallback:', e.message)
    }
  }

  await sql`
    UPDATE service_orders
    SET payment_reference = ${reference}, updated_at = NOW()
    WHERE id = ${order.id}
  `
  return c.json({
    success: true,
    provider: 'DIRECT',
    reference,
    message: 'Payment reference created. Awaiting transfer or card confirmation.',
    amountNgn: Number(order.total_amount_ngn)
  })
})

// ------------------------------------------
// Dynamic Social Crawler Share Metadata (/api/share/:type/:slug)
// Ensures newly created beats, future releases & gallery posts immediately render accurate Open Graph / Twitter Cards
// ------------------------------------------
function escapeHtmlAttr(val) {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function resolvePublicMediaUrl(pathOrUrl, workerOrigin, siteOrigin, fallbackUrl = null) {
  if (!pathOrUrl) return fallbackUrl || `${siteOrigin}/beats-image.png`
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const clean = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  // Return same-domain absolute HTTPS URL for social unfurls
  return `${siteOrigin}${clean}`
}

function buildShareHtml({ title, description, url, image, type = 'website', audio = null, imageMime = 'image/jpeg' }) {
  const safeTitle = escapeHtmlAttr(title)
  const safeDesc = escapeHtmlAttr(description)
  const safeUrl = escapeHtmlAttr(url)
  const safeImg = escapeHtmlAttr(image)
  const safeType = escapeHtmlAttr(type)
  const detectedMime = imageMime || (/\.png($|\?)/i.test(image) ? 'image/png' : /\.gif($|\?)/i.test(image) ? 'image/gif' : /\.webp($|\?)/i.test(image) ? 'image/webp' : 'image/jpeg')
  const safeAudio = audio ? escapeHtmlAttr(audio) : null
  const audioMeta = safeAudio
    ? `\n    <meta property="og:audio" content="${safeAudio}" />\n    <meta property="og:audio:secure_url" content="${safeAudio}" />\n    <meta property="og:audio:type" content="audio/mpeg" />\n    <meta name="twitter:player:stream" content="${safeAudio}" />\n    <meta name="twitter:player:stream:content_type" content="audio/mpeg" />`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="${safeType}" />
    <meta property="og:site_name" content="silachomka" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:image" content="${safeImg}" />
    <meta property="og:image:secure_url" content="${safeImg}" />
    <meta property="og:image:type" content="${detectedMime}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${safeTitle}" />${audioMeta}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@silachomka" />
    <meta name="twitter:creator" content="@silachomka" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImg}" />
    <meta name="twitter:image:alt" content="${safeTitle}" />
  </head>
  <body style="background:#050507;color:#f5f3ef;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
    <div style="text-align:center;max-width:480px;padding:32px;">
      <h1 style="font-size:20px;margin-bottom:12px;">${safeTitle}</h1>
      <p style="color:#a39e93;font-size:14px;line-height:1.6;">${safeDesc}</p>
      <p style="margin-top:20px;"><a href="${safeUrl}" style="color:#dfc27d;text-decoration:none;">Open on silachomka →</a></p>
    </div>
  </body>
</html>`
}

app.get('/api/share/:type/:slug', async (c) => {
  const sql = c.get('sql')
  const shareType = c.req.param('type')
  const rawSlug = String(c.req.param('slug') || '').trim()
  const cleanSlug = rawSlug.replace(/\/+$/, '')
  const siteOrigin = c.env?.PUBLIC_ORIGIN || 'https://silachomka.vercel.app'
  const workerOrigin = new URL(c.req.url).origin

  if (shareType === 'beats' || shareType === 'beat') {
    const rows = await sql`
      SELECT b.slug, b.title, b.genre, b.short_genre, b.bpm, b.beat_key, b.producer, b.description,
             CASE WHEN img.file_data IS NOT NULL THEN '/api/media/asset/' || img.id
                  WHEN img.r2_key IS NOT NULL THEN '/' || img.r2_key
                  ELSE NULL END as image,
             CASE WHEN aud.file_data IS NOT NULL THEN '/api/media/asset/' || aud.id
                  WHEN aud.r2_key IS NOT NULL THEN '/' || aud.r2_key
                  ELSE NULL END as audio
      FROM beats b
      LEFT JOIN media_assets img ON b.image_asset_id = img.id
      LEFT JOIN media_assets aud ON b.audio_asset_id = aud.id
      WHERE (b.slug = ${cleanSlug} OR b.id::text = ${cleanSlug}) AND b.deleted_at IS NULL
        AND (b.status = 'PUBLISHED' OR (b.status = 'SCHEDULED' AND b.scheduled_at <= NOW()))
    `
    if (rows.length > 0) {
      const b = rows[0]
      const genreText = b.genre || b.short_genre || 'Instrumental'
      const metaParts = [genreText, b.bpm, b.beat_key].filter(Boolean).join(' • ')
      const desc = b.description
        ? `${b.title} (${metaParts}) — ${b.description}`
        : `Listen and license "${b.title}" (${metaParts}) produced by ${b.producer || 'silachomka'} at Chomka Music Studio.`
      const fallbackImg = `${siteOrigin}/beats/${b.slug}.jpg`
      const html = buildShareHtml({
        title: `${b.title} — Beat by ${b.producer || 'silachomka'} | silachomka`,
        description: desc,
        url: `${siteOrigin}/beats/${b.slug}`,
        image: resolvePublicMediaUrl(b.image, workerOrigin, siteOrigin, fallbackImg),
        type: 'music.song',
        audio: b.audio ? resolvePublicMediaUrl(b.audio, workerOrigin, siteOrigin) : null
      })
      return c.html(html)
    }
  }

  if (shareType === 'release' || shareType === 'releases') {
    const rows = await sql`
      SELECT r.slug, r.title, r.release_date, r.display_date, r.type, r.primary_artist, r.description, r.status,
             CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id
                  WHEN m.r2_key IS NOT NULL THEN '/' || m.r2_key
                  ELSE NULL END as cover,
             m.mime_type as "coverMime",
             CASE WHEN mp.file_data IS NOT NULL THEN '/api/media/asset/' || mp.id
                  WHEN mp.r2_key IS NOT NULL THEN '/' || mp.r2_key
                  ELSE NULL END as preview_audio,
             (SELECT CASE WHEN tp.file_data IS NOT NULL THEN '/api/media/asset/' || tp.id
                          WHEN tp.r2_key IS NOT NULL THEN '/' || tp.r2_key
                          ELSE NULL END
              FROM tracks t
              LEFT JOIN media_assets tp ON t.preview_asset_id = tp.id
              WHERE t.release_id = r.id AND t.deleted_at IS NULL AND t.preview_asset_id IS NOT NULL
              ORDER BY t.track_number LIMIT 1
             ) as track_preview_audio
      FROM releases r
      LEFT JOIN media_assets m ON r.cover_asset_id = m.id
      LEFT JOIN media_assets mp ON r.preview_asset_id = mp.id
      WHERE (r.slug = ${cleanSlug} OR r.id::text = ${cleanSlug} OR COALESCE(r.previous_slugs, '[]'::jsonb) @> to_jsonb(${cleanSlug}::text))
        AND r.deleted_at IS NULL
        AND (r.status = 'PUBLISHED' OR r.status = 'SCHEDULED')
    `
    if (rows.length > 0) {
      const r = rows[0]
      const relDate = r.release_date ? new Date(r.release_date) : null
      const isFuture = (relDate && relDate.getTime() > Date.now()) || r.status === 'SCHEDULED'
      let formattedDate = r.display_date
      if (!formattedDate && relDate && !isNaN(relDate.getTime())) {
        formattedDate = relDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      }
      const statusLead = isFuture
        ? `${r.title} — Coming soon${formattedDate ? ` on ${formattedDate}` : ''}.`
        : `${r.title} — Out now.`
      const customNote = r.description && !r.description.toLowerCase().includes('out now') && !r.description.toLowerCase().includes('coming soon')
        ? ` ${r.description}`
        : ''
      const desc = `${statusLead}${customNote}`.trim()
      const fallbackCover = `${siteOrigin}/covers/${r.slug}.jpg`
      const previewAudio = r.track_preview_audio || r.preview_audio || null
      const html = buildShareHtml({
        title: `${r.title} — ${r.primary_artist || 'silachomka'} | silachomka`,
        description: desc,
        url: `${siteOrigin}/release/${r.slug}`,
        image: resolvePublicMediaUrl(r.cover, workerOrigin, siteOrigin, fallbackCover),
        imageMime: r.coverMime || 'image/jpeg',
        type: 'music.album',
        audio: previewAudio ? resolvePublicMediaUrl(previewAudio, workerOrigin, siteOrigin) : null
      })
      return c.html(html)
    }
  }

  if (shareType === 'gallery') {
    const rows = await sql`
      SELECT g.slug, g.title, g.caption, g.display_date, g.post_date,
             CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id
                  WHEN m.r2_key IS NOT NULL THEN '/' || m.r2_key
                  ELSE NULL END as asset,
             m.mime_type as "mimeType"
      FROM gallery_posts g
      LEFT JOIN media_assets m ON g.primary_asset_id = m.id
      WHERE (g.slug = ${cleanSlug} OR g.id::text = ${cleanSlug}) AND g.deleted_at IS NULL
        AND (g.status = 'PUBLISHED' OR (g.status = 'SCHEDULED' AND g.scheduled_at <= NOW()))
    `
    if (rows.length > 0) {
      const g = rows[0]
      const isVideoAsset = g.mimeType?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(g.asset || '')
      const imagePath = (!isVideoAsset && g.asset) ? g.asset : '/media/gallery/post2_1.jpg'
      const html = buildShareHtml({
        title: `${g.title || 'Visual Archive'} — silachomka Gallery`,
        description: g.caption || `${g.title || 'Visual Archive'} (${g.display_date || ''}) — Official visual archive by silachomka.`,
        url: `${siteOrigin}/gallery/${g.slug}`,
        image: resolvePublicMediaUrl(imagePath, workerOrigin, siteOrigin),
        type: 'article'
      })
      return c.html(html)
    }
  }

  if (shareType === 'services' || shareType === 'service') {
    const rows = await sql`
      SELECT title, tagline, description, category, base_price_ngn
      FROM music_services
      WHERE slug = ${cleanSlug} AND is_active = true
    `
    if (rows.length > 0) {
      const s = rows[0]
      const desc = s.tagline || s.description || 'Professional music production and studio services by silachomka.'
      const html = buildShareHtml({
        title: `${s.title} — Music Services | silachomka`,
        description: desc,
        url: `${siteOrigin}/services`,
        image: `${siteOrigin}/beats-image.png`,
        type: 'website'
      })
      return c.html(html)
    }
  }

  // Fallback default share HTML
  return c.html(buildShareHtml({
    title: 'silachomka — Artist, Producer & Sound Architect',
    description: 'Official artist platform, discography, beat store, and visual archive of silachomka.',
    url: siteOrigin,
    image: `${siteOrigin}/media/gallery/post2_1.jpg`
  }))
})

// ==========================================
// Admin Auth Routes
// ==========================================

app.post('/api/admin/login', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json().catch(() => ({}))
  
  if (!body.email || !body.password) {
    return c.json({ error: 'Missing credentials' }, 400)
  }

  // 1. Fetch user by email
  const users = await sql`SELECT id, email, password_hash, role FROM admin_users WHERE email = ${body.email}`
  
  if (users.length === 0) {
    // Note: Since DB has 0 users right now, this route safely rejects access.
    return c.json({ error: 'Invalid credentials' }, 401)
  }
  
  const user = users[0]

  // 2. Verify password with format detection and constant-time byte comparison
  const { valid, needsRehash } = await verifyPassword(body.password, user.password_hash)
  
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  // Opportunistic hash upgrade for legacy or outdated hashes
  if (needsRehash) {
    try {
      const newHash = await hashPassword(body.password)
      // Conditional optimistic update matching both user ID and prior hash
      await sql`
        UPDATE admin_users
        SET password_hash = ${newHash}, updated_at = NOW()
        WHERE id = ${user.id} AND password_hash = ${user.password_hash}
      `
    } catch (upgradeErr) {
      // Preserve existing login behavior; NEVER log credentials, password, hash, or token values
      console.warn('Non-fatal: Opportunistic password hash upgrade failed during login')
    }
  }

  // 3. Generate JWT
  if (!c.env?.JWT_SECRET || typeof c.env.JWT_SECRET !== 'string' || c.env.JWT_SECRET.trim() === '') {
    console.error('Server configuration error: JWT_SECRET is missing or invalid')
    return c.json({ error: 'Internal Server Error', message: 'Authentication misconfigured' }, 500)
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  }
  const token = await sign(payload, c.env.JWT_SECRET)

  // 4. Set HttpOnly Cookie
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: c.req.url.startsWith('https://'),
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24
  })

  // 5. Update last login
  await sql`UPDATE admin_users SET last_login_at = NOW() WHERE id = ${user.id}`

  return c.json({ success: true, user: { email: user.email, role: user.role } })
})

app.post('/api/admin/logout', (c) => {
  deleteCookie(c, COOKIE_NAME, {
    path: '/',
    secure: c.req.url.startsWith('https://'),
    sameSite: 'Strict'
  })
  return c.json({ success: true })
})

app.get('/api/admin/me', adminAuth, (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// ==========================================
// Admin CRUD Routes
// ==========================================

import { adminApp, queueSubscriberNotifications } from './admin/crud.js'

// Mount the admin router under /api/admin
// The adminApp router internally protects all its routes with adminAuth
app.route('/api/admin', adminApp)

// ==========================================
// Scheduled Cron Handler (Publishing & 60-day Retention Purge)
// ==========================================

async function handleScheduledPublishing(env) {
  if (!env.DATABASE_URL) return
  const sql = neon(env.DATABASE_URL)

  try {
    // 1. Automatically promote scheduled releases whose release time has arrived
    const publishedReleases = await sql`
      UPDATE releases
      SET status = 'PUBLISHED', updated_at = NOW()
      WHERE status = 'SCHEDULED' AND scheduled_at <= NOW() AND deleted_at IS NULL
      RETURNING id, title
    `
    for (const r of publishedReleases) {
      await queueSubscriberNotifications(sql, 'release', r.id, r.title)
    }

    // 2. Automatically promote scheduled beats
    await sql`
      UPDATE beats
      SET status = 'PUBLISHED', updated_at = NOW()
      WHERE status = 'SCHEDULED' AND scheduled_at <= NOW() AND deleted_at IS NULL
    `

    // 3. Automatically promote scheduled music videos
    await sql`
      UPDATE music_videos
      SET status = 'PUBLISHED', updated_at = NOW()
      WHERE status = 'SCHEDULED' AND scheduled_at <= NOW() AND deleted_at IS NULL
    `

    // 4. Automatically promote scheduled gallery posts
    await sql`
      UPDATE gallery_posts
      SET status = 'PUBLISHED', updated_at = NOW()
      WHERE status = 'SCHEDULED' AND scheduled_at <= NOW() AND deleted_at IS NULL
    `

    // 5. Automated 60-day Recycle Bin purge
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    await Promise.all([
      sql`DELETE FROM releases WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
      sql`DELETE FROM tracks WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
      sql`DELETE FROM beats WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
      sql`DELETE FROM music_videos WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
      sql`DELETE FROM gallery_posts WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
      sql`DELETE FROM media_assets WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
      sql`DELETE FROM social_links WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
      sql`DELETE FROM merchandise WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo}`,
    ])
  } catch (err) {
    console.error('Scheduled cron execution error:', err.message)
  }
}

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(handleScheduledPublishing(env))
    } else {
      await handleScheduledPublishing(env)
    }
  }
}
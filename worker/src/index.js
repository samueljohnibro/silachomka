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
// Media Serving (BYTEA / R2 fallback)
// ------------------------------------------
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
    let bytes
    if (typeof Buffer !== 'undefined') {
      bytes = Buffer.from(asset.file_hex, 'hex')
    } else {
      const hex = asset.file_hex
      bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
    }
    return new Response(bytes, {
      headers: {
        'Content-Type': asset.mime_type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  // Fallback: If bound to R2 bucket, stream from R2
  if (c.env?.MEDIA_BUCKET && asset.r2_key) {
    try {
      const object = await c.env.MEDIA_BUCKET.get(asset.r2_key)
      if (object) {
        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || asset.mime_type || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*'
          }
        })
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
    let bytes
    if (typeof Buffer !== 'undefined') {
      bytes = Buffer.from(asset.file_hex, 'hex')
    } else {
      const hex = asset.file_hex
      bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
    }
    return new Response(bytes, {
      headers: {
        'Content-Type': asset.mime_type || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  // Fallback: If bound to R2 bucket, stream from R2
  if (c.env?.MEDIA_BUCKET && asset.r2_key) {
    try {
      const object = await c.env.MEDIA_BUCKET.get(asset.r2_key)
      if (object) {
        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || asset.mime_type || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*'
          }
        })
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
app.get('/api/releases', async (c) => {
  const sql = c.get('sql')
  
  const releases = await sql`
    SELECT 
      r.id, r.slug, r.number, r.title, r.edition, r.release_date as "date", r.display_date as "displayDate", r.type, 
      r.primary_artist as artist, r.feats_silachomka as "featssilachomka", r.produced_by_silachomka as "producedBysilachomka", 
      r.description, r.sources, r.platforms,
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id ELSE '/' || m.r2_key END as cover,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', t.id,
            'title', t.title,
            'platforms', t.platforms,
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
      ) as videos
    FROM releases r
    LEFT JOIN media_assets m ON r.cover_asset_id = m.id
    WHERE r.deleted_at IS NULL 
      AND (r.status = 'PUBLISHED' OR (r.status = 'SCHEDULED' AND r.scheduled_at <= NOW()))
    ORDER BY r.release_date DESC
  `
  return c.json(releases)
})

app.get('/api/releases/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')
  
  const releases = await sql`
    SELECT 
      r.id, r.slug, r.number, r.title, r.edition, r.release_date as "date", r.display_date as "displayDate", r.type, 
      r.primary_artist as artist, r.feats_silachomka as "featssilachomka", r.produced_by_silachomka as "producedBysilachomka", 
      r.description, r.sources, r.platforms,
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id ELSE '/' || m.r2_key END as cover,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', t.id,
            'title', t.title,
            'platforms', t.platforms,
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
            'link', gp.legacy_link,
            'slides', (
              SELECT COALESCE(json_agg(json_build_object(
                'id', gs.id,
                'sortOrder', gs.sort_order,
                'slideType', gs.slide_type,
                'asset', CASE WHEN gsm.file_data IS NOT NULL THEN '/api/media/asset/' || gsm.id ELSE '/' || gsm.r2_key END
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
    WHERE r.slug = ${slug} 
      AND r.deleted_at IS NULL 
      AND (r.status = 'PUBLISHED' OR (r.status = 'SCHEDULED' AND r.scheduled_at <= NOW()))
  `
  
  if (releases.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(releases[0])
})

app.get('/api/tracks/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const tracks = await sql`
    SELECT 
      t.id, t.title, t.track_number, t.platforms,
      (
        SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
        FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'FEATURING'
      ) as featuring,
      (
        SELECT COALESCE(json_agg(tc.credit_name), '[]'::json)
        FROM track_credits tc WHERE tc.track_id = t.id AND tc.role = 'PRODUCER'
      ) as producers
    FROM tracks t
    WHERE t.id = ${id} AND t.deleted_at IS NULL
  `
  if (tracks.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(tracks[0])
})

// ------------------------------------------
// Beats
// ------------------------------------------
app.get('/api/beats', async (c) => {
  const sql = c.get('sql')
  const beats = await sql`
    SELECT 
      b.id as db_id, b.slug as id, b.title, b.genre, b.short_genre as "shortGenre", b.categories,
      b.bpm, b.beat_key as key, b.producer,
      b.price_basic as "priceBasic", b.price_premium as "pricePremium", b.price_exclusive as "priceExclusive",
      CASE WHEN img.file_data IS NOT NULL THEN '/api/media/asset/' || img.id ELSE '/' || img.r2_key END as image,
      CASE WHEN vid.file_data IS NOT NULL THEN '/api/media/asset/' || vid.id ELSE '/' || vid.r2_key END as video,
      CASE WHEN aud.file_data IS NOT NULL THEN '/api/media/asset/' || aud.id ELSE '/' || aud.r2_key END as audio,
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
      b.bpm, b.beat_key as key, b.producer,
      b.price_basic as "priceBasic", b.price_premium as "pricePremium", b.price_exclusive as "priceExclusive",
      CASE WHEN img.file_data IS NOT NULL THEN '/api/media/asset/' || img.id ELSE '/' || img.r2_key END as image,
      CASE WHEN vid.file_data IS NOT NULL THEN '/api/media/asset/' || vid.id ELSE '/' || vid.r2_key END as video,
      CASE WHEN aud.file_data IS NOT NULL THEN '/api/media/asset/' || aud.id ELSE '/' || aud.r2_key END as audio,
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
    SELECT name, handle, url, platform, category, role, link_type
    FROM social_links
    WHERE is_active = true AND deleted_at IS NULL
    ORDER BY sort_order ASC
  `
  return c.json({
    artist: links.filter(l => l.link_type === 'ARTIST'),
    ecosystem: links.filter(l => l.link_type === 'ECOSYSTEM')
  })
})

// ------------------------------------------
// Gallery
// ------------------------------------------
app.get('/api/gallery', async (c) => {
  const sql = c.get('sql')
  const posts = await sql`
    SELECT 
      g.slug as id, g.title, g.caption, g.category, g.post_type as type,
      g.post_date as date, g.display_date as "displayDate",
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id ELSE '/' || m.r2_key END as asset,
      g.legacy_link as link,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', gs.id,
            'sortOrder', gs.sort_order,
            'slideType', gs.slide_type,
            'asset', CASE WHEN sm.file_data IS NOT NULL THEN '/api/media/asset/' || sm.id ELSE '/' || sm.r2_key END
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
      g.post_date as date, g.display_date as "displayDate",
      CASE WHEN m.file_data IS NOT NULL THEN '/api/media/asset/' || m.id ELSE '/' || m.r2_key END as asset,
      g.legacy_link as link,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', gs.id,
            'sortOrder', gs.sort_order,
            'slideType', gs.slide_type,
            'asset', CASE WHEN sm.file_data IS NOT NULL THEN '/api/media/asset/' || sm.id ELSE '/' || sm.r2_key END
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
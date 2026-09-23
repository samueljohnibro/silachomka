import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { neon } from '@neondatabase/serverless'
import { sign } from 'hono/jwt'
import { setCookie, deleteCookie } from 'hono/cookie'
import { adminAuth, hashPassword, COOKIE_NAME } from './auth.js'

const app = new Hono()

// ==========================================
// Middleware & Globals
// ==========================================

app.use('*', cors({
  origin: '*',
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

const JWT_SECRET = 'temporary-secret-key-change-in-production';

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

app.get('/api/releases', async (c) => {
  const sql = c.get('sql')
  
  // R2 is unavailable. We output media paths exactly as they are in the database (which match public/ paths)
  // We prepend '/' to the r2_key to make it a valid local path for the frontend.
  const releases = await sql`
    SELECT 
      r.id, r.slug, r.number, r.title, r.edition, r.release_date as "date", r.display_date as "displayDate", r.type, 
      r.primary_artist as artist, r.feats_silachomka as "featssilachomka", r.produced_by_silachomka as "producedBysilachomka", 
      r.description, r.sources, r.platforms,
      '/' || m.r2_key as cover,
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
          FROM tracks t WHERE t.release_id = r.id
        ),
        '[]'::json
      ) as tracks
    FROM releases r
    LEFT JOIN media_assets m ON r.cover_asset_id = m.id
    WHERE r.status = 'PUBLISHED'
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
      '/' || m.r2_key as cover,
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
          FROM tracks t WHERE t.release_id = r.id
        ),
        '[]'::json
      ) as tracks
    FROM releases r
    LEFT JOIN media_assets m ON r.cover_asset_id = m.id
    WHERE r.slug = ${slug} AND r.status = 'PUBLISHED'
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
    WHERE t.id = ${id}
  `
  if (tracks.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(tracks[0])
})

app.get('/api/beats', async (c) => {
  const sql = c.get('sql')
  const beats = await sql`
    SELECT 
      b.id as db_id, b.slug as id, b.title, b.genre, b.short_genre as "shortGenre", b.categories,
      b.bpm, b.beat_key as key, b.producer,
      '/' || img.r2_key as image,
      '/' || vid.r2_key as video,
      '/' || aud.r2_key as audio,
      json_build_object(
        'basic', b.selar_basic_url,
        'premium', b.selar_premium_url,
        'ultimate', b.selar_ultimate_url
      ) as selar
    FROM beats b
    LEFT JOIN media_assets img ON b.image_asset_id = img.id
    LEFT JOIN media_assets vid ON b.video_asset_id = vid.id
    LEFT JOIN media_assets aud ON b.audio_asset_id = aud.id
    WHERE b.status = 'PUBLISHED'
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
      '/' || img.r2_key as image,
      '/' || vid.r2_key as video,
      '/' || aud.r2_key as audio,
      json_build_object(
        'basic', b.selar_basic_url,
        'premium', b.selar_premium_url,
        'ultimate', b.selar_ultimate_url
      ) as selar
    FROM beats b
    LEFT JOIN media_assets img ON b.image_asset_id = img.id
    LEFT JOIN media_assets vid ON b.video_asset_id = vid.id
    LEFT JOIN media_assets aud ON b.audio_asset_id = aud.id
    WHERE b.slug = ${slug} AND b.status = 'PUBLISHED'
  `
  if (beats.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(beats[0])
})

app.get('/api/music-videos', async (c) => {
  const sql = c.get('sql')
  const videos = await sql`
    SELECT 
      v.slug as id, v.title, v.subtitle, v.category, v.youtube_id as "youtubeId", 
      v.youtube_url as "youtubeUrl", v.aspect_ratio as "aspectRatio", v.platforms as links,
      COALESCE(
        (SELECT json_agg(f.artist_name) FROM music_video_features f WHERE f.video_id = v.id),
        '[]'::json
      ) as featuring
    FROM music_videos v
    WHERE v.status = 'PUBLISHED'
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
    WHERE v.slug = ${slug} AND v.status = 'PUBLISHED'
  `
  if (videos.length === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(videos[0])
})

app.get('/api/social-links', async (c) => {
  const sql = c.get('sql')
  const links = await sql`
    SELECT name, handle, url, platform, category, role, link_type
    FROM social_links
    WHERE is_active = true
    ORDER BY sort_order ASC
  `
  return c.json({
    artist: links.filter(l => l.link_type === 'ARTIST'),
    ecosystem: links.filter(l => l.link_type === 'ECOSYSTEM')
  })
})

app.get('/api/gallery', async (c) => {
  const sql = c.get('sql')
  const posts = await sql`
    SELECT 
      g.slug as id, g.title, g.caption, g.category, g.post_type as type,
      g.post_date as date, g.display_date as "displayDate",
      '/' || m.r2_key as asset,
      g.legacy_link as link
    FROM gallery_posts g
    LEFT JOIN media_assets m ON g.primary_asset_id = m.id
    WHERE g.status = 'PUBLISHED'
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
      '/' || m.r2_key as asset,
      g.legacy_link as link
    FROM gallery_posts g
    LEFT JOIN media_assets m ON g.primary_asset_id = m.id
    WHERE g.slug = ${slug} AND g.status = 'PUBLISHED'
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

  // 2. Hash provided password and compare
  const incomingHash = await hashPassword(body.password)
  
  if (!user.password_hash || user.password_hash !== incomingHash) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  // 3. Generate JWT
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  }
  const token = await sign(payload, c.env.JWT_SECRET || JWT_SECRET)

  // 4. Set HttpOnly Cookie
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24
  })

  // 5. Update last login
  await sql`UPDATE admin_users SET last_login_at = NOW() WHERE id = ${user.id}`

  return c.json({ success: true, user: { email: user.email, role: user.role } })
})

app.post('/api/admin/logout', (c) => {
  deleteCookie(c, COOKIE_NAME, { path: '/' })
  return c.json({ success: true })
})

app.get('/api/admin/me', adminAuth, (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// ==========================================
// Admin CRUD Routes
// ==========================================

import { adminApp } from './admin/crud.js'

// Mount the admin router under /api/admin
// The adminApp router internally protects all its routes with adminAuth
app.route('/api/admin', adminApp)

export default app
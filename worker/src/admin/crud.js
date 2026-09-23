import { Hono } from 'hono'
import { adminAuth } from '../auth.js'

export const adminApp = new Hono()

// Apply authentication middleware to all routes in this sub-app
adminApp.use('*', adminAuth)

// Basic validator for slugs
const isValidSlug = (slug) => /^[a-z0-9-]+$/.test(slug)

// Helper for Audit Logs
async function logAudit(sql, userId, action, entityType, entityId, oldData, newData) {
  try {
    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (${userId}, ${action}, ${entityType}, ${entityId}, ${oldData ? JSON.stringify(oldData) : null}, ${newData ? JSON.stringify(newData) : null})
    `
  } catch (e) {
    console.error('Audit log failed', e)
  }
}

// ---------------------------------------------------------
// 1. RELEASES
// ---------------------------------------------------------
adminApp.get('/releases', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM releases ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.get('/releases/:id', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM releases WHERE id = ${c.req.param('id')}`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json(rows[0])
})

adminApp.post('/releases', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.title || !body.release_date || !body.type) return c.json({ error: 'Missing required fields' }, 400)
  if (!isValidSlug(body.slug)) return c.json({ error: 'Invalid slug' }, 400)

  try {
    const rows = await sql`
      INSERT INTO releases (slug, number, title, edition, release_date, display_date, type, primary_artist, feats_silachomka, produced_by_silachomka, description, cover_asset_id, sources, platforms, status)
      VALUES (${body.slug}, ${body.number || null}, ${body.title}, ${body.edition || 1}, ${body.release_date}, ${body.display_date || null}, ${body.type}, ${body.primary_artist || 'silachomka'}, ${body.feats_silachomka || false}, ${body.produced_by_silachomka !== false}, ${body.description || null}, ${body.cover_asset_id || null}, ${body.sources ? JSON.stringify(body.sources) : null}, ${body.platforms ? JSON.stringify(body.platforms) : null}, ${body.status || 'DRAFT'})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'releases', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/releases/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const existing = await sql`SELECT * FROM releases WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  try {
    const existing = await sql`SELECT * FROM releases WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE releases SET
slug = ${up.slug},
        number = ${up.number},
        title = ${up.title},
        edition = ${up.edition},
        release_date = ${up.release_date},
        display_date = ${up.display_date},
        type = ${up.type},
        primary_artist = ${up.primary_artist},
        feats_silachomka = ${up.feats_silachomka},
        produced_by_silachomka = ${up.produced_by_silachomka},
        description = ${up.description},
        cover_asset_id = ${up.cover_asset_id},
        sources = ${up.sources ? JSON.stringify(body.sources) : null},
        platforms = ${up.platforms ? JSON.stringify(body.platforms) : null},
        status = ${up.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'releases', id, e, rows[0])
    return c.json(rows[0])
  } catch (err) { return c.json({ error: err.message }, 400) }
})

adminApp.delete('/releases/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM releases WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM releases WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'releases', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 2. TRACKS
// ---------------------------------------------------------
adminApp.get('/tracks', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM tracks ORDER BY release_id, track_number ASC`
  return c.json(rows)
})

adminApp.get('/tracks/:id', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM tracks WHERE id = ${c.req.param('id')}`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json(rows[0])
})

adminApp.post('/tracks', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.release_id || !body.track_number || !body.title) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO tracks (release_id, track_number, title, platforms)
      VALUES (${body.release_id}, ${body.track_number}, ${body.title}, ${body.platforms ? JSON.stringify(body.platforms) : null})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'tracks', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/tracks/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await sql`SELECT * FROM tracks WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    const existing = await sql`SELECT * FROM tracks WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE tracks SET
track_number = ${up.track_number},
        title = ${up.title},
        platforms = ${up.platforms ? JSON.stringify(body.platforms) : null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'tracks', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/tracks/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM tracks WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM tracks WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'tracks', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 3. TRACK CREDITS
// ---------------------------------------------------------
adminApp.get('/track-credits', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM track_credits ORDER BY track_id, role, credit_name`
  return c.json(rows)
})

adminApp.post('/track-credits', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.track_id || !body.credit_name || !body.role) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO track_credits (track_id, credit_name, role)
      VALUES (${body.track_id}, ${body.credit_name}, ${body.role})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'track_credits', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/track-credits/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM track_credits WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM track_credits WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'track_credits', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 4. BEATS
// ---------------------------------------------------------
adminApp.get('/beats', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM beats ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.get('/beats/:id', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM beats WHERE id = ${c.req.param('id')}`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json(rows[0])
})

adminApp.post('/beats', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.title) return c.json({ error: 'Missing required fields' }, 400)
  if (!isValidSlug(body.slug)) return c.json({ error: 'Invalid slug' }, 400)

  try {
    const rows = await sql`
      INSERT INTO beats (slug, title, genre, short_genre, categories, bpm, beat_key, description, mood, producer, audio_asset_id, image_asset_id, video_asset_id, selar_basic_url, selar_premium_url, selar_ultimate_url, status)
      VALUES (${body.slug}, ${body.title}, ${body.genre || null}, ${body.short_genre || null}, ${body.categories ? JSON.stringify(body.categories) : null}, ${body.bpm || null}, ${body.beat_key || null}, ${body.description || null}, ${body.mood || null}, ${body.producer || 'silachomka'}, ${body.audio_asset_id || null}, ${body.image_asset_id || null}, ${body.video_asset_id || null}, ${body.selar_basic_url || null}, ${body.selar_premium_url || null}, ${body.selar_ultimate_url || null}, ${body.status || 'DRAFT'})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'beats', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/beats/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await sql`SELECT * FROM beats WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    const existing = await sql`SELECT * FROM beats WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE beats SET
slug = ${up.slug},
        title = ${up.title},
        genre = ${up.genre},
        short_genre = ${up.short_genre},
        categories = ${up.categories ? JSON.stringify(body.categories) : null},
        bpm = ${up.bpm},
        beat_key = ${up.beat_key},
        description = ${up.description},
        mood = ${up.mood},
        producer = ${up.producer},
        audio_asset_id = ${up.audio_asset_id},
        image_asset_id = ${up.image_asset_id},
        video_asset_id = ${up.video_asset_id},
        selar_basic_url = ${up.selar_basic_url},
        selar_premium_url = ${up.selar_premium_url},
        selar_ultimate_url = ${up.selar_ultimate_url},
        status = ${up.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'beats', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/beats/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM beats WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM beats WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'beats', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 5. MUSIC VIDEOS
// ---------------------------------------------------------
adminApp.get('/music-videos', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM music_videos ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.post('/music-videos', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.title || !body.youtube_id || !body.youtube_url) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO music_videos (slug, title, subtitle, category, youtube_id, youtube_url, aspect_ratio, platforms, related_release_id, related_track_id, status)
      VALUES (${body.slug}, ${body.title}, ${body.subtitle || null}, ${body.category || 'Visualizer'}, ${body.youtube_id}, ${body.youtube_url}, ${body.aspect_ratio || '16:9'}, ${body.platforms ? JSON.stringify(body.platforms) : null}, ${body.related_release_id || null}, ${body.related_track_id || null}, ${body.status || 'DRAFT'})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'music_videos', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/music-videos/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await sql`SELECT * FROM music_videos WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    const existing = await sql`SELECT * FROM music_videos WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE music_videos SET
slug = ${up.slug},
        title = ${up.title},
        subtitle = ${up.subtitle},
        category = ${up.category},
        youtube_id = ${up.youtube_id},
        youtube_url = ${up.youtube_url},
        aspect_ratio = ${up.aspect_ratio},
        platforms = ${up.platforms ? JSON.stringify(body.platforms) : null},
        related_release_id = ${up.related_release_id},
        related_track_id = ${up.related_track_id},
        status = ${up.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'music_videos', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/music-videos/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM music_videos WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM music_videos WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'music_videos', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 6. MUSIC VIDEO FEATURES
// ---------------------------------------------------------
adminApp.get('/music-video-features', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM music_video_features ORDER BY video_id, artist_name`
  return c.json(rows)
})

adminApp.post('/music-video-features', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.video_id || !body.artist_name) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO music_video_features (video_id, artist_name)
      VALUES (${body.video_id}, ${body.artist_name})
      RETURNING *
    `
    // No UUID here, compound key, we'll log against the video
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'music_videos', body.video_id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/music-video-features/:video_id/:artist_name', async (c) => {
  const sql = c.get('sql')
  const { video_id, artist_name } = c.req.param()
  
  try {
    const rows = await sql`DELETE FROM music_video_features WHERE video_id = ${video_id} AND artist_name = ${artist_name} RETURNING *`
    if (!rows.length) return c.json({ error: 'Not found' }, 404)
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'music_videos', video_id, rows[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 7. GALLERY POSTS
// ---------------------------------------------------------
adminApp.get('/gallery-posts', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM gallery_posts ORDER BY post_date DESC`
  return c.json(rows)
})

adminApp.post('/gallery-posts', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.title || !body.post_type || !body.post_date) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO gallery_posts (slug, title, caption, category, post_type, primary_asset_id, related_release_id, related_track_id, related_beat_id, legacy_link, tags, post_date, display_date, status)
      VALUES (${body.slug}, ${body.title}, ${body.caption || null}, ${body.category || 'portraits'}, ${body.post_type}, ${body.primary_asset_id || null}, ${body.related_release_id || null}, ${body.related_track_id || null}, ${body.related_beat_id || null}, ${body.legacy_link || null}, ${body.tags ? JSON.stringify(body.tags) : null}, ${body.post_date}, ${body.display_date || null}, ${body.status || 'DRAFT'})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'gallery_posts', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/gallery-posts/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await sql`SELECT * FROM gallery_posts WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    const existing = await sql`SELECT * FROM gallery_posts WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE gallery_posts SET
slug = ${up.slug},
        title = ${up.title},
        caption = ${up.caption},
        category = ${up.category},
        post_type = ${up.post_type},
        primary_asset_id = ${up.primary_asset_id},
        related_release_id = ${up.related_release_id},
        related_track_id = ${up.related_track_id},
        related_beat_id = ${up.related_beat_id},
        legacy_link = ${up.legacy_link},
        tags = ${up.tags ? JSON.stringify(body.tags) : null},
        post_date = ${up.post_date},
        display_date = ${up.display_date},
        status = ${up.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'gallery_posts', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/gallery-posts/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM gallery_posts WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM gallery_posts WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'gallery_posts', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 8. GALLERY SLIDES
// ---------------------------------------------------------
adminApp.get('/gallery-slides', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM gallery_slides ORDER BY post_id, sort_order ASC`
  return c.json(rows)
})

adminApp.post('/gallery-slides', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.post_id || !body.asset_id || body.sort_order === undefined) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO gallery_slides (post_id, asset_id, sort_order, slide_type)
      VALUES (${body.post_id}, ${body.asset_id}, ${body.sort_order}, ${body.slide_type || 'image'})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'gallery_slides', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/gallery-slides/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM gallery_slides WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM gallery_slides WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'gallery_slides', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 9. MEDIA ASSETS
// ---------------------------------------------------------
adminApp.get('/media-assets', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM media_assets ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.post('/media-assets', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.r2_key || !body.asset_type) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO media_assets (r2_key, original_filename, asset_type, mime_type, size_bytes, width, height, duration_seconds, alt_text, blurhash, uploaded_by)
      VALUES (${body.r2_key}, ${body.original_filename || null}, ${body.asset_type}, ${body.mime_type || null}, ${body.size_bytes || null}, ${body.width || null}, ${body.height || null}, ${body.duration_seconds || null}, ${body.alt_text || null}, ${body.blurhash || null}, ${c.get('user').sub})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'media_assets', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/media-assets/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await sql`SELECT * FROM media_assets WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    const existing = await sql`SELECT * FROM media_assets WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE media_assets SET
r2_key = ${up.r2_key},
        original_filename = ${up.original_filename},
        asset_type = ${up.asset_type},
        mime_type = ${up.mime_type},
        size_bytes = ${up.size_bytes},
        width = ${up.width},
        height = ${up.height},
        duration_seconds = ${up.duration_seconds},
        alt_text = ${up.alt_text},
        blurhash = ${up.blurhash},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'media_assets', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/media-assets/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM media_assets WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    // Media assets are restricted in most cases. If this fails due to FK, Neon driver throws an error.
    await sql`DELETE FROM media_assets WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'media_assets', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 10. SOCIAL LINKS
// ---------------------------------------------------------
adminApp.get('/social-links', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM social_links ORDER BY sort_order ASC`
  return c.json(rows)
})

adminApp.post('/social-links', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.name || !body.url) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO social_links (name, handle, url, platform, category, role, link_type, sort_order, is_active)
      VALUES (${body.name}, ${body.handle || null}, ${body.url}, ${body.platform || null}, ${body.category || null}, ${body.role || null}, ${body.link_type || 'ARTIST'}, ${body.sort_order || 0}, ${body.is_active !== false})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'social_links', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/social-links/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await sql`SELECT * FROM social_links WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    const existing = await sql`SELECT * FROM social_links WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE social_links SET
name = ${up.name},
        handle = ${up.handle},
        url = ${up.url},
        platform = ${up.platform},
        category = ${up.category},
        role = ${up.role},
        link_type = ${up.link_type},
        sort_order = ${up.sort_order},
        is_active = ${up.is_active},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'social_links', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/social-links/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM social_links WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM social_links WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'social_links', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 11. MERCHANDISE
// ---------------------------------------------------------
adminApp.get('/merchandise', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM merchandise ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.post('/merchandise', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.name) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO merchandise (slug, name, description, primary_asset_id, price_cents, currency, selar_url, status)
      VALUES (${body.slug}, ${body.name}, ${body.description || null}, ${body.primary_asset_id || null}, ${body.price_cents || null}, ${body.currency || null}, ${body.selar_url || null}, ${body.status || 'PLANNED'})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'merchandise', rows[0].id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/merchandise/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await sql`SELECT * FROM merchandise WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    const existing = await sql`SELECT * FROM merchandise WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const rows = await sql`
    UPDATE merchandise SET
slug = ${up.slug},
        name = ${up.name},
        description = ${up.description},
        primary_asset_id = ${up.primary_asset_id},
        price_cents = ${up.price_cents},
        currency = ${up.currency},
        selar_url = ${up.selar_url},
        status = ${up.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    RETURNING *
  `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'merchandise', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/merchandise/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM merchandise WHERE id = ${id}`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`DELETE FROM merchandise WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'merchandise', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

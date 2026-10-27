import { Hono } from 'hono'
import { adminAuth, requireSuperadmin } from '../auth.js'

export const adminApp = new Hono()

// Apply authentication middleware to all routes in this sub-app
adminApp.use('*', adminAuth)

// Basic validator for slugs
const isValidSlug = (slug) => typeof slug === 'string' && /^[a-z0-9-]+$/.test(slug)

// Canonical slug generator preserving historical conventions (& -> and, strip apostrophes/diacritics)
export function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Normalize beat genre to uppercase words with lowercase 'x' separator and 'TYPE BEAT' suffix
export function normalizeBeatGenre(raw) {
  if (!raw || !String(raw).trim()) return { genre: null, short_genre: null }
  const stripped = String(raw).trim().replace(/\s+type\s+beat$/i, '').trim()
  if (!stripped) return { genre: null, short_genre: null }
  const parts = stripped.split(/\s+[xX×]\s+/).map(p => p.trim().toUpperCase()).filter(Boolean)
  const shortGenre = parts.join(' x ')
  return {
    genre: `${shortGenre} TYPE BEAT`,
    short_genre: shortGenre
  }
}

async function resolveUniqueReleaseSlug(sql, baseSlug, excludeId = null) {
  let candidate = baseSlug
  let suffix = 2
  while (true) {
    const conflict = excludeId
      ? await sql`SELECT id FROM releases WHERE slug = ${candidate} AND id != ${excludeId} LIMIT 1`
      : await sql`SELECT id FROM releases WHERE slug = ${candidate} LIMIT 1`
    if (!conflict.length) return candidate
    candidate = `${baseSlug}-${suffix++}`
  }
}

async function inferGalleryPostType(sql, primaryAssetId, slides, fallbackType) {
  if (Array.isArray(slides) && slides.length > 1) {
    return 'carousel'
  }
  if (Array.isArray(slides) && slides.length === 1 && slides[0]?.slide_type === 'video') {
    return 'video'
  }
  const targetAssetId = primaryAssetId || (Array.isArray(slides) && slides[0]?.asset_id) || null
  if (targetAssetId) {
    try {
      const assetRows = await sql`SELECT asset_type, mime_type, r2_key FROM media_assets WHERE id = ${targetAssetId} LIMIT 1`
      if (assetRows.length) {
        const a = assetRows[0]
        if (
          a.asset_type === 'VIDEO' ||
          (a.mime_type && a.mime_type.toLowerCase().startsWith('video/')) ||
          /\.(mp4|webm|mov)$/i.test(a.r2_key || '')
        ) {
          return 'video'
        }
        return 'image'
      }
    } catch {}
  }
  if (fallbackType === 'video' || fallbackType === 'carousel' || fallbackType === 'image') {
    return fallbackType
  }
  return 'image'
}

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

// Helper to queue subscriber notifications on publication
export async function queueSubscriberNotifications(sql, contentType, contentId, contentTitle) {
  try {
    const activeSubs = await sql`SELECT id, email FROM subscribers WHERE status = 'ACTIVE'`
    for (const sub of activeSubs) {
      await sql`
        INSERT INTO subscriber_notifications (subscriber_id, content_type, content_id, content_title, status, error_message)
        VALUES (${sub.id}, ${contentType}, ${contentId}, ${contentTitle}, 'QUEUED_NO_SMTP_CONFIGURED', 'Notification queued; automated delivery awaiting external SMTP/Resend API configuration')
      `
    }
  } catch (err) {
    console.warn('Non-fatal: Failed to queue subscriber notifications:', err.message)
  }
}

// ---------------------------------------------------------
// 1. RELEASES
// ---------------------------------------------------------
adminApp.get('/releases', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM releases WHERE deleted_at IS NULL ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.get('/releases/:id', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM releases WHERE id = ${c.req.param('id')} AND deleted_at IS NULL`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json(rows[0])
})

adminApp.post('/releases', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (body.slug !== undefined && !isValidSlug(body.slug)) return c.json({ error: 'Invalid slug' }, 400)
  const rawSlug = body.slug || slugify(body.title)
  if (!rawSlug || !body.title || !body.release_date || !body.type) return c.json({ error: 'Missing required fields' }, 400)
  if (!isValidSlug(rawSlug)) return c.json({ error: 'Invalid slug' }, 400)

  const uniqueSlug = await resolveUniqueReleaseSlug(sql, rawSlug)

  // Automatic status determination from release_date / scheduled_at (preserving explicit DRAFT / ARCHIVED)
  const relDate = new Date(body.release_date)
  const schedDate = body.scheduled_at ? new Date(body.scheduled_at) : null
  const isFuture = (!isNaN(relDate.getTime()) && relDate > new Date()) || (schedDate && !isNaN(schedDate.getTime()) && schedDate > new Date())
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))
  const scheduledAt = isFuture ? (schedDate && !isNaN(schedDate.getTime()) ? schedDate.toISOString() : relDate.toISOString()) : (body.scheduled_at ? new Date(body.scheduled_at).toISOString() : null)

  try {
    const rows = await sql`
      INSERT INTO releases (slug, number, title, edition, release_date, display_date, type, primary_artist, feats_silachomka, produced_by_silachomka, description, cover_asset_id, preview_asset_id, sources, platforms, status, scheduled_at)
      VALUES (${uniqueSlug}, ${body.number || null}, ${body.title}, ${body.edition || 1}, ${body.release_date}, ${body.display_date || null}, ${body.type}, ${body.primary_artist || 'silachomka'}, ${body.feats_silachomka || false}, ${body.produced_by_silachomka !== false}, ${body.description || null}, ${body.cover_asset_id || null}, ${body.preview_asset_id || null}, ${body.sources ? JSON.stringify(body.sources) : null}, ${body.platforms ? JSON.stringify(body.platforms) : null}, ${status}, ${scheduledAt})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'releases', rows[0].id, null, rows[0])
    if (rows[0].status === 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'release', rows[0].id, rows[0].title)
    }
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/releases/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()

  if (body.slug !== undefined && !isValidSlug(body.slug)) {
    return c.json({ error: 'Invalid slug' }, 400)
  }

  const existing = await sql`SELECT * FROM releases WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  // When title changes, automatically regenerate slug from the new title
  const titleChanged = body.title !== undefined && String(body.title).trim() !== String(e.title || '').trim()
  if (titleChanged) {
    const baseSlug = slugify(body.title)
    if (baseSlug && isValidSlug(baseSlug)) {
      up.slug = await resolveUniqueReleaseSlug(sql, baseSlug, id)
    }
  } else if (body.slug !== undefined && body.slug !== e.slug) {
    up.slug = await resolveUniqueReleaseSlug(sql, body.slug, id)
  }

  const relDate = new Date(up.release_date)
  const schedDate = up.scheduled_at ? new Date(up.scheduled_at) : null
  const isFuture = (!isNaN(relDate.getTime()) && relDate > new Date()) || (schedDate && !isNaN(schedDate.getTime()) && schedDate > new Date())
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))
  const scheduledAt = isFuture ? (schedDate && !isNaN(schedDate.getTime()) ? schedDate.toISOString() : relDate.toISOString()) : (up.scheduled_at ? new Date(up.scheduled_at).toISOString() : null)

  const prevSlugsList = Array.isArray(e.previous_slugs) ? [...e.previous_slugs] : []
  if (e.slug && up.slug && up.slug !== e.slug && !prevSlugsList.includes(e.slug)) {
    prevSlugsList.push(e.slug)
  }

  try {
    const rows = await sql`
      UPDATE releases SET
        slug = ${up.slug},
        previous_slugs = ${JSON.stringify(prevSlugsList)}::jsonb,
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
        preview_asset_id = ${up.preview_asset_id || null},
        sources = ${up.sources ? JSON.stringify(body.sources !== undefined ? body.sources : e.sources) : null},
        platforms = ${up.platforms ? JSON.stringify(body.platforms !== undefined ? body.platforms : e.platforms) : null},
        status = ${status},
        scheduled_at = ${scheduledAt},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    if (up.slug !== e.slug) {
      await sql`
        UPDATE gallery_posts
        SET legacy_link = ${'/release/' + up.slug}
        WHERE legacy_link = ${'/release/' + e.slug}
      `
    }
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'releases', id, e, rows[0])
    if (rows[0].status === 'PUBLISHED' && e.status !== 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'release', rows[0].id, rows[0].title)
    }
    return c.json(rows[0])
  } catch (err) { return c.json({ error: err.message }, 400) }
})

adminApp.delete('/releases/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM releases WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    // Soft-delete for 60-day Recycle Bin retention
    await sql`UPDATE releases SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'SOFT_DELETE', 'releases', id, existing[0], null)
    return c.json({ success: true, message: 'Moved to Recycle Bin' })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 2. TRACKS
// ---------------------------------------------------------
adminApp.get('/tracks', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM tracks WHERE deleted_at IS NULL ORDER BY release_id, track_number ASC`
  return c.json(rows)
})

adminApp.get('/tracks/:id', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM tracks WHERE id = ${c.req.param('id')} AND deleted_at IS NULL`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json(rows[0])
})

adminApp.post('/tracks', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.release_id || !body.track_number || !body.title) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO tracks (release_id, track_number, title, preview_asset_id, platforms)
      VALUES (${body.release_id}, ${body.track_number}, ${body.title}, ${body.preview_asset_id || null}, ${body.platforms ? JSON.stringify(body.platforms) : null})
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
  const existing = await sql`SELECT * FROM tracks WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  try {
    const rows = await sql`
      UPDATE tracks SET
        track_number = ${up.track_number},
        title = ${up.title},
        preview_asset_id = ${up.preview_asset_id || null},
        platforms = ${up.platforms ? JSON.stringify(body.platforms !== undefined ? body.platforms : e.platforms) : null},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'tracks', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/tracks/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM tracks WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`UPDATE tracks SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'SOFT_DELETE', 'tracks', id, existing[0], null)
    return c.json({ success: true, message: 'Moved to Recycle Bin' })
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

adminApp.delete('/track-credits/:id', requireSuperadmin, async (c) => {
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
  const rows = await sql`SELECT * FROM beats WHERE deleted_at IS NULL ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.get('/beats/:id', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM beats WHERE id = ${c.req.param('id')} AND deleted_at IS NULL`
  if (!rows.length) return c.json({ error: 'Not found' }, 404)
  return c.json(rows[0])
})

adminApp.post('/beats', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.title) return c.json({ error: 'Missing required fields' }, 400)
  if (!isValidSlug(body.slug)) return c.json({ error: 'Invalid slug' }, 400)

  const normGenre = normalizeBeatGenre(body.genre || body.short_genre)
  const deriveBeatCategories = (shortGenre, existingCats) => {
    const cats = new Set(Array.isArray(existingCats) ? existingCats : [])
    const lower = String(shortGenre || '').toLowerCase()
    if (lower.includes('afro')) cats.add('afro')
    if (lower.includes('trap') || lower.includes('rap') || lower.includes('hip')) cats.add('trap')
    if (lower.includes('r&b') || lower.includes('rnb') || lower.includes('soul') || lower.includes('alt')) cats.add('rnb')
    return Array.from(cats)
  }
  const resolvedCategories = deriveBeatCategories(normGenre.short_genre, body.categories)
  const createdAt = body.created_at ? new Date(body.created_at).toISOString() : new Date().toISOString()
  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at).toISOString() : null
  const isFuture = (scheduledAt && new Date(scheduledAt) > new Date()) || (createdAt && new Date(createdAt) > new Date())
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))

  try {
    const priceBasic = body.price_basic !== undefined && body.price_basic !== '' && body.price_basic !== null ? Number(body.price_basic) : 15000.00
    const pricePremium = body.price_premium !== undefined && body.price_premium !== '' && body.price_premium !== null ? Number(body.price_premium) : 30000.00
    const priceExclusive = body.price_exclusive !== undefined && body.price_exclusive !== '' && body.price_exclusive !== null ? Number(body.price_exclusive) : 60000.00

    const rows = await sql`
      INSERT INTO beats (slug, title, genre, short_genre, categories, bpm, beat_key, description, mood, producer, audio_asset_id, image_asset_id, video_asset_id, selar_basic_url, selar_premium_url, selar_ultimate_url, status, scheduled_at, created_at, price_basic, price_premium, price_exclusive)
      VALUES (${body.slug}, ${body.title}, ${normGenre.genre}, ${normGenre.short_genre}, ${JSON.stringify(resolvedCategories)}, ${body.bpm || null}, ${body.beat_key || null}, ${body.description || null}, ${body.mood || null}, ${body.producer || 'silachomka'}, ${body.audio_asset_id || null}, ${body.image_asset_id || null}, ${body.video_asset_id || null}, ${body.selar_basic_url || null}, ${body.selar_premium_url || null}, ${body.selar_ultimate_url || null}, ${status}, ${scheduledAt}, ${createdAt}, ${priceBasic}, ${pricePremium}, ${priceExclusive})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'beats', rows[0].id, null, rows[0])
    if (rows[0].status === 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'beat', rows[0].id, rows[0].title)
    }
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/beats/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()

  if (body.slug !== undefined && !isValidSlug(body.slug)) {
    return c.json({ error: 'Invalid slug' }, 400)
  }

  const existing = await sql`SELECT * FROM beats WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }
  if (body.genre !== undefined || body.short_genre !== undefined) {
    const normGenre = normalizeBeatGenre(body.genre !== undefined ? body.genre : body.short_genre)
    up.genre = normGenre.genre
    up.short_genre = normGenre.short_genre
  }
  const createdAt = up.created_at ? new Date(up.created_at).toISOString() : e.created_at

  const scheduledAt = up.scheduled_at ? new Date(up.scheduled_at).toISOString() : null
  const isFuture = (scheduledAt && new Date(scheduledAt) > new Date()) || (createdAt && new Date(createdAt) > new Date())
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))

  try {
    const priceBasic = up.price_basic !== undefined && up.price_basic !== '' && up.price_basic !== null ? Number(up.price_basic) : (e.price_basic !== null ? e.price_basic : 15000.00)
    const pricePremium = up.price_premium !== undefined && up.price_premium !== '' && up.price_premium !== null ? Number(up.price_premium) : (e.price_premium !== null ? e.price_premium : 30000.00)
    const priceExclusive = up.price_exclusive !== undefined && up.price_exclusive !== '' && up.price_exclusive !== null ? Number(up.price_exclusive) : (e.price_exclusive !== null ? e.price_exclusive : 60000.00)

    const rows = await sql`
      UPDATE beats SET
        slug = ${up.slug},
        title = ${up.title},
        genre = ${up.genre},
        short_genre = ${up.short_genre},
        categories = ${up.categories ? JSON.stringify(body.categories !== undefined ? body.categories : e.categories) : null},
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
        status = ${status},
        scheduled_at = ${scheduledAt},
        created_at = ${createdAt},
        price_basic = ${priceBasic},
        price_premium = ${pricePremium},
        price_exclusive = ${priceExclusive},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'beats', id, existing[0], rows[0])
    if (rows[0].status === 'PUBLISHED' && e.status !== 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'beat', rows[0].id, rows[0].title)
    }
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/beats/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM beats WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`UPDATE beats SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'SOFT_DELETE', 'beats', id, existing[0], null)
    return c.json({ success: true, message: 'Moved to Recycle Bin' })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 5. MUSIC VIDEOS
// ---------------------------------------------------------
adminApp.get('/music-videos', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM music_videos WHERE deleted_at IS NULL ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.post('/music-videos', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.title || !body.youtube_id || !body.youtube_url) return c.json({ error: 'Missing required fields' }, 400)
  if (!isValidSlug(body.slug)) return c.json({ error: 'Invalid slug' }, 400)

  const createdAt = body.created_at ? new Date(body.created_at).toISOString() : new Date().toISOString()
  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at).toISOString() : null
  const isFuture = (scheduledAt && new Date(scheduledAt) > new Date()) || (createdAt && new Date(createdAt) > new Date())
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))

  try {
    const rows = await sql`
      INSERT INTO music_videos (slug, title, subtitle, category, youtube_id, youtube_url, aspect_ratio, platforms, related_release_id, related_track_id, status, scheduled_at, created_at)
      VALUES (${body.slug}, ${body.title}, ${body.subtitle || null}, ${body.category || 'Visualizer'}, ${body.youtube_id}, ${body.youtube_url}, ${body.aspect_ratio || '16:9'}, ${body.platforms ? JSON.stringify(body.platforms) : null}, ${body.related_release_id || null}, ${body.related_track_id || null}, ${status}, ${scheduledAt}, ${createdAt})
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'CREATE', 'music_videos', rows[0].id, null, rows[0])
    if (rows[0].status === 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'video', rows[0].id, rows[0].title)
    }
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/music-videos/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()

  if (body.slug !== undefined && !isValidSlug(body.slug)) {
    return c.json({ error: 'Invalid slug' }, 400)
  }

  const existing = await sql`SELECT * FROM music_videos WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }
  const createdAt = up.created_at ? new Date(up.created_at).toISOString() : e.created_at

  const scheduledAt = up.scheduled_at ? new Date(up.scheduled_at).toISOString() : null
  const isFuture = (scheduledAt && new Date(scheduledAt) > new Date()) || (createdAt && new Date(createdAt) > new Date())
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))

  try {
    const rows = await sql`
      UPDATE music_videos SET
        slug = ${up.slug},
        title = ${up.title},
        subtitle = ${up.subtitle},
        category = ${up.category},
        youtube_id = ${up.youtube_id},
        youtube_url = ${up.youtube_url},
        aspect_ratio = ${up.aspect_ratio},
        platforms = ${up.platforms ? JSON.stringify(body.platforms !== undefined ? body.platforms : e.platforms) : null},
        related_release_id = ${up.related_release_id},
        related_track_id = ${up.related_track_id},
        status = ${status},
        scheduled_at = ${scheduledAt},
        created_at = ${createdAt},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'music_videos', id, existing[0], rows[0])
    if (rows[0].status === 'PUBLISHED' && e.status !== 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'video', rows[0].id, rows[0].title)
    }
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/music-videos/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM music_videos WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`UPDATE music_videos SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'SOFT_DELETE', 'music_videos', id, existing[0], null)
    return c.json({ success: true, message: 'Moved to Recycle Bin' })
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
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'music_videos', body.video_id, null, rows[0])
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/music-video-features/:video_id/:artist_name', requireSuperadmin, async (c) => {
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
// 7. GALLERY POSTS & CATEGORIES
// ---------------------------------------------------------
function formatCanonicalDate(rawDate) {
  if (!rawDate) return null
  try {
    const str = String(rawDate).split('T')[0]
    const parts = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (parts) {
      const d = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])))
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    }
  } catch {}
  return null
}

function detectSocialPlatform(url, explicitPlatform) {
  if (explicitPlatform && String(explicitPlatform).trim()) return String(explicitPlatform).trim()
  if (!url || typeof url !== 'string') return null
  const lower = url.toLowerCase()
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'Instagram'
  if (lower.includes('x.com') || lower.includes('twitter.com')) return 'X'
  if (lower.includes('snapchat.com')) return 'Snapchat'
  if (lower.includes('tiktok.com')) return 'TikTok'
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube'
  if (lower.includes('threads.net')) return 'Threads'
  return null
}

function normalizeGalleryCategory(raw) {
  if (!raw) return { slug: 'portraits-style', label: 'Portraits & Style' };
  const str = String(raw).trim();
  const lower = str.toLowerCase();

  if (lower === 'portraits' || lower === 'portraits-style' || lower.includes('portrait')) {
    return { slug: 'portraits-style', label: 'Portraits & Style' };
  }
  if (lower === 'freestyles' || lower === 'freestyles-covers' || lower.includes('freestyle') || lower.includes('cover')) {
    return { slug: 'freestyles-covers', label: 'Freestyles & Covers' };
  }
  if (lower === 'bts' || lower === 'studio' || lower === 'studio-bts' || lower.includes('bts')) {
    return { slug: 'bts', label: 'Studio & BTS' };
  }
  if (lower === 'releases' || lower.includes('release')) {
    return { slug: 'releases', label: 'Releases' };
  }
  if (lower === 'videos' || lower.includes('video')) {
    return { slug: 'videos', label: 'Videos' };
  }

  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const label = str.charAt(0).toUpperCase() + str.slice(1);
  return { slug, label };
}

adminApp.get('/gallery-categories', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT slug, label FROM gallery_categories ORDER BY label ASC`
  const labelMap = new Map()
  for (const row of rows) {
    if (!row || !row.label) continue
    const norm = normalizeGalleryCategory(row.label || row.slug)
    if (!labelMap.has(norm.label.toLowerCase())) {
      labelMap.set(norm.label.toLowerCase(), norm)
    }
  }
  const deduped = Array.from(labelMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  return c.json(deduped)
})

adminApp.post('/gallery-categories', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  const rawLabel = (body.label || body.name || '').trim()
  if (!rawLabel) return c.json({ error: 'Category label is required' }, 400)
  const norm = normalizeGalleryCategory(rawLabel)
  const rows = await sql`
    INSERT INTO gallery_categories (slug, label)
    VALUES (${norm.slug}, ${norm.label})
    ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    RETURNING slug, label
  `
  return c.json(rows[0], 201)
})

adminApp.get('/gallery-posts', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM gallery_posts WHERE deleted_at IS NULL ORDER BY post_date DESC, created_at DESC`
  return c.json(rows)
})

adminApp.post('/gallery-posts', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()

  if (!body.post_date) return c.json({ error: 'Missing required field: post_date' }, 400)

  // Determine primary asset: use body.primary_asset_id or first slide's asset_id
  let primaryAssetId = body.primary_asset_id || null
  if (!primaryAssetId && Array.isArray(body.slides) && body.slides.length > 0) {
    primaryAssetId = body.slides[0].asset_id || null
  }

  // Automatically infer post_type from uploaded/attached media (single image, carousel, or video)
  const inferredPostType = await inferGalleryPostType(sql, primaryAssetId, body.slides, body.post_type)

  let slug = (body.slug || '').trim()
  if (!slug) {
    if (body.title && body.title.trim()) {
      slug = body.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    if (!slug) {
      const datePart = body.post_date ? String(body.post_date).split('T')[0] : new Date().toISOString().slice(0, 10)
      const typePart = inferredPostType.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const randPart = Math.random().toString(36).substring(2, 7)
      slug = `post-${datePart}-${typePart}-${randPart}`
    }
  }

  if (!isValidSlug(slug)) return c.json({ error: 'Invalid slug' }, 400)

  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at).toISOString() : null
  const postDateObj = body.post_date ? new Date(body.post_date) : null
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const isFuture = (scheduledAt && new Date(scheduledAt) > now) || (postDateObj && !isNaN(postDateObj.getTime()) && postDateObj > todayUtc && postDateObj > now)
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))

  // Derive canonical display date automatically
  const canonicalDisplayDate = formatCanonicalDate(body.post_date) || body.display_date || null

  // Ensure category is normalized and persisted to gallery_categories
  const normCat = normalizeGalleryCategory(body.category)
  try {
    await sql`
      INSERT INTO gallery_categories (slug, label)
      VALUES (${normCat.slug}, ${normCat.label})
      ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    `
  } catch {}

  const extSocialUrl = body.external_social_url ? String(body.external_social_url).trim() : null
  const extSocialPlatform = detectSocialPlatform(extSocialUrl, body.external_social_platform)

  try {
    const rows = await sql`
      INSERT INTO gallery_posts (slug, title, caption, category, post_type, primary_asset_id, related_release_id, related_track_id, related_beat_id, legacy_link, external_social_url, external_social_platform, tags, post_date, display_date, status, scheduled_at)
      VALUES (${slug}, ${body.title || null}, ${body.caption || null}, ${normCat.slug}, ${inferredPostType}, ${primaryAssetId}, ${body.related_release_id || null}, ${body.related_track_id || null}, ${body.related_beat_id || null}, ${body.legacy_link || null}, ${extSocialUrl}, ${extSocialPlatform}, ${body.tags ? JSON.stringify(body.tags) : null}, ${body.post_date}, ${canonicalDisplayDate}, ${status}, ${scheduledAt})
      RETURNING *
    `

    // If carousel/slides provided, insert them
    if (Array.isArray(body.slides) && body.slides.length > 0) {
      for (let i = 0; i < body.slides.length; i++) {
        const s = body.slides[i]
        if (s.asset_id) {
          const slideType = s.slide_type || (inferredPostType === 'video' && body.slides.length === 1 ? 'video' : 'image')
          await sql`
            INSERT INTO gallery_slides (post_id, asset_id, sort_order, slide_type)
            VALUES (${rows[0].id}, ${s.asset_id}, ${s.sort_order ?? i}, ${slideType})
          `
        }
      }
    }

    await logAudit(sql, c.get('user').sub, 'CREATE', 'gallery_posts', rows[0].id, null, rows[0])
    if (rows[0].status === 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'gallery', rows[0].id, rows[0].title || rows[0].slug)
    }
    return c.json(rows[0], 201)
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.put('/gallery-posts/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json()

  if (body.slug !== undefined && !isValidSlug(body.slug)) {
    return c.json({ error: 'Invalid slug' }, 400)
  }

  const existing = await sql`SELECT * FROM gallery_posts WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  const scheduledAt = up.scheduled_at ? new Date(up.scheduled_at).toISOString() : null
  const postDateObj = up.post_date ? new Date(up.post_date) : null
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const isFuture = (scheduledAt && new Date(scheduledAt) > now) || (postDateObj && !isNaN(postDateObj.getTime()) && postDateObj > todayUtc && postDateObj > now)
  const status = (body.is_draft === true || body.status === 'DRAFT') ? 'DRAFT' : (body.status === 'ARCHIVED' ? 'ARCHIVED' : (isFuture ? 'SCHEDULED' : 'PUBLISHED'))

  // Derive canonical display date automatically from post_date
  const canonicalDisplayDate = formatCanonicalDate(up.post_date) || up.display_date || null

  // Ensure category is normalized and persisted to gallery_categories
  const normCat = normalizeGalleryCategory(up.category)
  try {
    await sql`
      INSERT INTO gallery_categories (slug, label)
      VALUES (${normCat.slug}, ${normCat.label})
      ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label
    `
  } catch {}

  // Primary asset fallback to first slide if carousel
  let primaryAssetId = up.primary_asset_id || null
  if (!primaryAssetId && Array.isArray(body.slides) && body.slides.length > 0) {
    primaryAssetId = body.slides[0].asset_id || null
  }

  // Automatically infer post_type from media
  const inferredPostType = await inferGalleryPostType(sql, primaryAssetId, body.slides, up.post_type)

  const extSocialUrl = up.external_social_url ? String(up.external_social_url).trim() : null
  const extSocialPlatform = extSocialUrl ? detectSocialPlatform(extSocialUrl, up.external_social_platform) : null

  try {
    const rows = await sql`
      UPDATE gallery_posts SET
        slug = ${up.slug},
        title = ${up.title || null},
        caption = ${up.caption || null},
        category = ${normCat.slug},
        post_type = ${inferredPostType},
        primary_asset_id = ${primaryAssetId},
        related_release_id = ${up.related_release_id || null},
        related_track_id = ${up.related_track_id || null},
        related_beat_id = ${up.related_beat_id || null},
        legacy_link = ${up.legacy_link || null},
        external_social_url = ${extSocialUrl},
        external_social_platform = ${extSocialPlatform},
        tags = ${up.tags ? JSON.stringify(body.tags !== undefined ? body.tags : e.tags) : null},
        post_date = ${up.post_date},
        display_date = ${canonicalDisplayDate},
        status = ${status},
        scheduled_at = ${scheduledAt},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    // Update slides if provided
    if (Array.isArray(body.slides)) {
      await sql`DELETE FROM gallery_slides WHERE post_id = ${id}`
      for (let i = 0; i < body.slides.length; i++) {
        const s = body.slides[i]
        if (s.asset_id) {
          const slideType = s.slide_type || (inferredPostType === 'video' && body.slides.length === 1 ? 'video' : 'image')
          await sql`
            INSERT INTO gallery_slides (post_id, asset_id, sort_order, slide_type)
            VALUES (${id}, ${s.asset_id}, ${s.sort_order ?? i}, ${slideType})
          `
        }
      }
    }

    await logAudit(sql, c.get('user').sub, 'UPDATE', 'gallery_posts', id, existing[0], rows[0])
    if (rows[0].status === 'PUBLISHED' && e.status !== 'PUBLISHED') {
      await queueSubscriberNotifications(sql, 'gallery', rows[0].id, rows[0].title || rows[0].slug)
    }
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/gallery-posts/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM gallery_posts WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`UPDATE gallery_posts SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'SOFT_DELETE', 'gallery_posts', id, existing[0], null)
    return c.json({ success: true, message: 'Moved to Recycle Bin' })
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

adminApp.delete('/gallery-slides/:id', requireSuperadmin, async (c) => {
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
  const rows = await sql`
    SELECT id, r2_key, original_filename, asset_type, mime_type, size_bytes, 
      width, height, duration_seconds, alt_text, blurhash,
      asset_role, source_asset_id, original_size_bytes, original_mime_type, optimization_status,
      uploaded_by, created_at, updated_at,
      CASE WHEN file_data IS NOT NULL THEN true ELSE false END AS has_file_data
    FROM media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC
  `
  return c.json(rows)
})

adminApp.post('/media-assets', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.r2_key || !body.asset_type) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO media_assets (r2_key, original_filename, asset_type, mime_type, size_bytes, width, height, duration_seconds, alt_text, blurhash, asset_role, source_asset_id, original_size_bytes, original_mime_type, optimization_status, uploaded_by)
      VALUES (${body.r2_key}, ${body.original_filename || null}, ${body.asset_type}, ${body.mime_type || null}, ${body.size_bytes || null}, ${body.width || null}, ${body.height || null}, ${body.duration_seconds || null}, ${body.alt_text || null}, ${body.blurhash || null}, ${body.asset_role || 'OPTIMIZED_WEB'}, ${body.source_asset_id || null}, ${body.original_size_bytes || null}, ${body.original_mime_type || null}, ${body.optimization_status || 'OPTIMIZED'}, ${c.get('user').sub})
      RETURNING id, r2_key, original_filename, asset_type, mime_type, size_bytes, width, height, duration_seconds, alt_text, blurhash, asset_role, source_asset_id, original_size_bytes, original_mime_type, optimization_status, uploaded_by, created_at, updated_at
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

  const e = existing[0]
  const up = { ...e, ...body }

  try {
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
        asset_role = ${up.asset_role || 'OPTIMIZED_WEB'},
        source_asset_id = ${up.source_asset_id || null},
        original_size_bytes = ${up.original_size_bytes || null},
        original_mime_type = ${up.original_mime_type || null},
        optimization_status = ${up.optimization_status || 'OPTIMIZED'},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, r2_key, original_filename, asset_type, mime_type, size_bytes, width, height, duration_seconds, alt_text, blurhash, asset_role, source_asset_id, original_size_bytes, original_mime_type, optimization_status, uploaded_by, created_at, updated_at
    `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'media_assets', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024 // 100MB safe ceiling
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif',
  'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac',
  'mp4', 'mov', 'webm'
])

adminApp.post('/media-assets/upload', async (c) => {
  const sql = c.get('sql')
  const user = c.get('user')

  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    const assetType = formData.get('asset_type') || 'IMAGE'
    const assetRole = formData.get('asset_role') || 'OPTIMIZED_WEB'
    const sourceAssetId = formData.get('source_asset_id') || null
    const originalSizeBytes = formData.get('original_size_bytes') ? Number(formData.get('original_size_bytes')) : (file?.size || null)
    const originalMimeType = formData.get('original_mime_type') || file?.type || null
    const widthVal = formData.get('width') ? Number(formData.get('width')) : null
    const heightVal = formData.get('height') ? Number(formData.get('height')) : null
    const durationVal = formData.get('duration_seconds') ? Number(formData.get('duration_seconds')) : null
    const optimizationStatus = formData.get('optimization_status') || 'OPTIMIZED'

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file provided' }, 400)
    }

    if (file.size && file.size > MAX_UPLOAD_SIZE_BYTES) {
      return c.json({ error: 'File exceeds maximum allowed size (100 MB)' }, 400)
    }

    const filename = file.name || `upload-${Date.now()}`
    const cleanBasename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = cleanBasename.includes('.') ? cleanBasename.split('.').pop().toLowerCase() : ''

    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return c.json({ error: `Unsupported file extension: .${ext}` }, 400)
    }

    // Determine storage folder prefix
    const folder = assetType === 'AUDIO' ? 'beats' : assetType === 'VIDEO' ? 'beats' : 'covers'
    const storageKey = `${folder}/${cleanBasename}`

    // Read file bytes for database storage
    const buffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(buffer)
    // Convert to hex string for Postgres BYTEA (\\x prefix)
    let hex = ''
    if (typeof Buffer !== 'undefined') {
      hex = Buffer.from(buffer).toString('hex')
    } else {
      const hexTable = []
      for (let i = 0; i < 256; i++) {
        hexTable[i] = i.toString(16).padStart(2, '0')
      }
      const parts = new Array(fileBytes.length)
      for (let i = 0; i < fileBytes.length; i++) {
        parts[i] = hexTable[fileBytes[i]]
      }
      hex = parts.join('')
    }

    // If Cloudflare R2 bucket is bound in env, also write to R2
    if (c.env?.MEDIA_BUCKET) {
      await c.env.MEDIA_BUCKET.put(storageKey, buffer, {
        httpMetadata: { contentType: file.type || 'application/octet-stream' }
      })
    }

    // Determine MIME type
    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
      mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4',
      m4a: 'audio/mp4', mov: 'video/quicktime', webm: 'video/webm',
      aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac'
    }
    const detectedMime = file.type || mimeMap[ext] || (assetType === 'AUDIO' ? 'audio/mpeg' : assetType === 'VIDEO' ? 'video/mp4' : 'image/jpeg')

    // Check if asset with this r2_key already exists in DB
    const existing = await sql`SELECT id, r2_key, original_filename, asset_type, mime_type, size_bytes FROM media_assets WHERE r2_key = ${storageKey}`
    if (existing.length > 0) {
      const updated = await sql`
        UPDATE media_assets SET
          original_filename = ${filename},
          asset_type = ${assetType},
          mime_type = ${detectedMime},
          size_bytes = ${file.size || null},
          width = COALESCE(${widthVal}, width),
          height = COALESCE(${heightVal}, height),
          duration_seconds = COALESCE(${durationVal}, duration_seconds),
          asset_role = ${assetRole},
          source_asset_id = COALESCE(${sourceAssetId}, source_asset_id),
          original_size_bytes = COALESCE(${originalSizeBytes}, original_size_bytes),
          original_mime_type = COALESCE(${originalMimeType}, original_mime_type),
          optimization_status = ${optimizationStatus},
          file_data = decode(${hex}, 'hex'),
          deleted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing[0].id}
        RETURNING id, r2_key, original_filename, asset_type, mime_type, size_bytes, width, height, duration_seconds, asset_role, source_asset_id, original_size_bytes, original_mime_type, optimization_status, uploaded_by, created_at, updated_at,
          CASE WHEN file_data IS NOT NULL THEN true ELSE false END AS has_file_data
      `
      await logAudit(sql, user?.sub, 'UPDATE', 'media_assets', existing[0].id, existing[0], updated[0])
      const urlSuffix = detectedMime === 'image/gif' ? '?.gif' : ''
      return c.json({
        ...updated[0],
        url: `/api/media/asset/${updated[0].id}${urlSuffix}`
      })
    }

    const inserted = await sql`
      INSERT INTO media_assets (r2_key, original_filename, asset_type, mime_type, size_bytes, width, height, duration_seconds, asset_role, source_asset_id, original_size_bytes, original_mime_type, optimization_status, uploaded_by, file_data)
      VALUES (${storageKey}, ${filename}, ${assetType}, ${detectedMime}, ${file.size || null}, ${widthVal}, ${heightVal}, ${durationVal}, ${assetRole}, ${sourceAssetId}, ${originalSizeBytes}, ${originalMimeType}, ${optimizationStatus}, ${user?.sub || null}, decode(${hex}, 'hex'))
      RETURNING id, r2_key, original_filename, asset_type, mime_type, size_bytes, width, height, duration_seconds, asset_role, source_asset_id, original_size_bytes, original_mime_type, optimization_status, uploaded_by, created_at, updated_at,
        CASE WHEN file_data IS NOT NULL THEN true ELSE false END AS has_file_data
    `
    await logAudit(sql, user?.sub, 'CREATE', 'media_assets', inserted[0].id, null, inserted[0])
    const urlSuffix = detectedMime === 'image/gif' ? '?.gif' : ''
    return c.json({
      ...inserted[0],
      url: `/api/media/asset/${inserted[0].id}${urlSuffix}`
    }, 201)
  } catch (err) {
    return c.json({ error: err.message || 'File upload failed' }, 400)
  }
})

adminApp.delete('/media-assets/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM media_assets WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`UPDATE media_assets SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'media_assets', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 10. SOCIAL LINKS
// ---------------------------------------------------------
adminApp.get('/social-links', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM social_links WHERE deleted_at IS NULL ORDER BY sort_order ASC`
  return c.json(rows)
})

adminApp.post('/social-links', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.name || !body.url) return c.json({ error: 'Missing required fields' }, 400)

  try {
    const rows = await sql`
      INSERT INTO social_links (name, handle, url, platform, category, role, link_type, sort_order, is_active, show_on_gallery_posts)
      VALUES (${body.name}, ${body.handle || null}, ${body.url}, ${body.platform || null}, ${body.category || null}, ${body.role || null}, ${body.link_type || 'ARTIST'}, ${body.sort_order || 0}, ${body.is_active !== false}, ${body.show_on_gallery_posts === true})
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
  const existing = await sql`SELECT * FROM social_links WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  try {
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
        show_on_gallery_posts = ${up.show_on_gallery_posts === true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `
    await logAudit(sql, c.get('user').sub, 'UPDATE', 'social_links', id, existing[0], rows[0])
    return c.json(rows[0])
  } catch (e) { return c.json({ error: e.message }, 400) }
})

adminApp.delete('/social-links/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM social_links WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`UPDATE social_links SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'social_links', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 11. MERCHANDISE
// ---------------------------------------------------------
adminApp.get('/merchandise', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`SELECT * FROM merchandise WHERE deleted_at IS NULL ORDER BY created_at DESC`
  return c.json(rows)
})

adminApp.post('/merchandise', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  if (!body.slug || !body.name) return c.json({ error: 'Missing required fields' }, 400)
  if (!isValidSlug(body.slug)) return c.json({ error: 'Invalid slug' }, 400)

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

  if (body.slug !== undefined && !isValidSlug(body.slug)) {
    return c.json({ error: 'Invalid slug' }, 400)
  }

  const existing = await sql`SELECT * FROM merchandise WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  const e = existing[0]
  const up = { ...e, ...body }

  try {
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

adminApp.delete('/merchandise/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const existing = await sql`SELECT * FROM merchandise WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return c.json({ error: 'Not found' }, 404)

  try {
    await sql`UPDATE merchandise SET deleted_at = NOW() WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'merchandise', id, existing[0], null)
    return c.json({ success: true })
  } catch (e) { return c.json({ error: e.message }, 400) }
})

// ---------------------------------------------------------
// 12. RECYCLE BIN
// ---------------------------------------------------------
adminApp.get('/recycle-bin', async (c) => {
  const sql = c.get('sql')
  try {
    const rows = await sql`
      SELECT id, title, 'releases' AS table_name, deleted_at FROM releases WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT id, title, 'tracks' AS table_name, deleted_at FROM tracks WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT id, title, 'beats' AS table_name, deleted_at FROM beats WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT id, title, 'music_videos' AS table_name, deleted_at FROM music_videos WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT id, COALESCE(title, caption, id::text) AS title, 'gallery_posts' AS table_name, deleted_at FROM gallery_posts WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT id, COALESCE(original_filename, r2_key) AS title, 'media_assets' AS table_name, deleted_at FROM media_assets WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name AS title, 'social_links' AS table_name, deleted_at FROM social_links WHERE deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name AS title, 'merchandise' AS table_name, deleted_at FROM merchandise WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `
    return c.json(rows)
  } catch (err) {
    return c.json({ error: err.message }, 500)
  }
})

adminApp.post('/recycle-bin/restore', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  const { table, id } = body || {}
  const allowedTables = ['releases', 'tracks', 'beats', 'music_videos', 'gallery_posts', 'media_assets', 'social_links', 'merchandise']
  if (!allowedTables.includes(table) || !id) {
    return c.json({ error: 'Invalid table or id' }, 400)
  }

  try {
    let rows
    switch (table) {
      case 'releases':
        rows = await sql`
          UPDATE releases
          SET deleted_at = NULL,
              status = CASE
                WHEN (scheduled_at IS NOT NULL AND scheduled_at > NOW()) OR release_date > NOW() THEN 'SCHEDULED'
                ELSE 'PUBLISHED'
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `
        break
      case 'tracks':
        rows = await sql`UPDATE tracks SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`
        break
      case 'beats':
        rows = await sql`
          UPDATE beats
          SET deleted_at = NULL,
              status = CASE
                WHEN (scheduled_at IS NOT NULL AND scheduled_at > NOW()) OR created_at > NOW() THEN 'SCHEDULED'
                ELSE 'PUBLISHED'
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `
        break
      case 'music_videos':
        rows = await sql`
          UPDATE music_videos
          SET deleted_at = NULL,
              status = CASE
                WHEN (scheduled_at IS NOT NULL AND scheduled_at > NOW()) OR created_at > NOW() THEN 'SCHEDULED'
                ELSE 'PUBLISHED'
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `
        break
      case 'gallery_posts':
        rows = await sql`
          UPDATE gallery_posts
          SET deleted_at = NULL,
              status = CASE
                WHEN (scheduled_at IS NOT NULL AND scheduled_at > NOW()) OR post_date > CURRENT_DATE THEN 'SCHEDULED'
                ELSE 'PUBLISHED'
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
          RETURNING *
        `
        break
      case 'media_assets':
        rows = await sql`UPDATE media_assets SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`
        break
      case 'social_links':
        rows = await sql`UPDATE social_links SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`
        break
      case 'merchandise':
        rows = await sql`UPDATE merchandise SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`
        break
    }
    if (!rows || !rows.length) return c.json({ error: 'Item not found in recycle bin' }, 404)
    await logAudit(sql, c.get('user').sub, 'RESTORE', table, id, null, rows[0])
    return c.json({ success: true, item: rows[0] })
  } catch (err) {
    return c.json({ error: err.message }, 400)
  }
})

adminApp.delete('/recycle-bin/permanent', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json()
  const { table, id } = body || {}
  const allowedTables = ['releases', 'tracks', 'beats', 'music_videos', 'gallery_posts', 'media_assets', 'social_links', 'merchandise']
  if (!allowedTables.includes(table) || !id) {
    return c.json({ error: 'Invalid table or id' }, 400)
  }

  try {
    switch (table) {
      case 'releases':
        await sql`DELETE FROM releases WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
      case 'tracks':
        await sql`DELETE FROM tracks WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
      case 'beats':
        await sql`DELETE FROM beats WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
      case 'music_videos':
        await sql`DELETE FROM music_videos WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
      case 'gallery_posts':
        await sql`DELETE FROM gallery_posts WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
      case 'media_assets':
        await sql`DELETE FROM media_assets WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
      case 'social_links':
        await sql`DELETE FROM social_links WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
      case 'merchandise':
        await sql`DELETE FROM merchandise WHERE id = ${id} AND deleted_at IS NOT NULL`
        break
    }
    await logAudit(sql, c.get('user').sub, 'PERMANENT_DELETE', table, id, null, null)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: err.message }, 400)
  }
})

adminApp.post('/recycle-bin/purge-expired', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const r1 = await sql`DELETE FROM releases WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`
    const r2 = await sql`DELETE FROM tracks WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`
    const r3 = await sql`DELETE FROM beats WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`
    const r4 = await sql`DELETE FROM music_videos WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`
    const r5 = await sql`DELETE FROM gallery_posts WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`
    const r6 = await sql`DELETE FROM media_assets WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`
    const r7 = await sql`DELETE FROM social_links WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`
    const r8 = await sql`DELETE FROM merchandise WHERE deleted_at IS NOT NULL AND deleted_at < ${sixtyDaysAgo} RETURNING id`

    const total = (r1.length || 0) + (r2.length || 0) + (r3.length || 0) + (r4.length || 0) +
                  (r5.length || 0) + (r6.length || 0) + (r7.length || 0) + (r8.length || 0)

    await logAudit(sql, c.get('user').sub, 'PURGE_EXPIRED', 'recycle_bin', null, null, { purgedCount: total })
    return c.json({ success: true, count: total })
  } catch (err) {
    return c.json({ error: err.message }, 400)
  }
})

// ---------------------------------------------------------
// 13. SUBSCRIBERS
// ---------------------------------------------------------
adminApp.get('/subscribers', async (c) => {
  const sql = c.get('sql')
  try {
    const rows = await sql`
      SELECT id, email, status, consent_given, source, created_at, unsubscribed_at
      FROM subscribers
      ORDER BY created_at DESC
    `
    return c.json(rows)
  } catch (err) {
    return c.json({ error: err.message }, 500)
  }
})

adminApp.delete('/subscribers/:id', requireSuperadmin, async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  try {
    await sql`DELETE FROM subscribers WHERE id = ${id}`
    await logAudit(sql, c.get('user').sub, 'DELETE', 'subscribers', id, null, null)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: err.message }, 400)
  }
})

adminApp.get('/subscriber-notifications', async (c) => {
  const sql = c.get('sql')
  try {
    const rows = await sql`
      SELECT sn.id, sn.content_type, sn.content_id, sn.content_title, sn.status,
             sn.error_message, sn.sent_at, sn.created_at, s.email
      FROM subscriber_notifications sn
      LEFT JOIN subscribers s ON sn.subscriber_id = s.id
      ORDER BY sn.created_at DESC
      LIMIT 100
    `
    return c.json(rows)
  } catch (err) {
    return c.json({ error: err.message }, 500)
  }
})

// ------------------------------------------
// Admin Music Services & Orders Management
// ------------------------------------------
adminApp.get('/services', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`
    SELECT id, slug, title, tagline, description, category, base_price_ngn as "basePriceNgn",
           is_hourly as "isHourly", hourly_rate_ngn as "hourlyRateNgn", deliverables,
           turnaround_days as "turnaroundDays", sort_order as "sortOrder", is_active as "isActive",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM music_services
    ORDER BY sort_order ASC, created_at ASC
  `
  return c.json(rows)
})

adminApp.post('/services', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json().catch(() => ({}))
  const title = String(body.title || '').trim()
  if (!title) return c.json({ error: 'Title is required' }, 400)
  const slug = String(body.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  if (!slug) return c.json({ error: 'Valid slug is required' }, 400)

  const basePrice = body.basePriceNgn !== undefined && body.basePriceNgn !== null && body.basePriceNgn !== '' ? Number(body.basePriceNgn) : null
  const hourlyRate = body.hourlyRateNgn !== undefined && body.hourlyRateNgn !== null && body.hourlyRateNgn !== '' ? Number(body.hourlyRateNgn) : null
  const deliverables = Array.isArray(body.deliverables) ? body.deliverables : []
  const category = String(body.category || 'PRODUCTION').toUpperCase()
  const isHourly = Boolean(body.isHourly)
  const turnaroundDays = body.turnaroundDays ? Number(body.turnaroundDays) : 3
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : 99
  const isActive = body.isActive !== false

  const rows = await sql`
    INSERT INTO music_services (
      slug, title, tagline, description, category,
      base_price_ngn, is_hourly, hourly_rate_ngn, deliverables,
      turnaround_days, sort_order, is_active, created_at, updated_at
    ) VALUES (
      ${slug}, ${title}, ${body.tagline || null}, ${body.description || null}, ${category},
      ${basePrice}, ${isHourly}, ${hourlyRate}, ${JSON.stringify(deliverables)}::jsonb,
      ${turnaroundDays}, ${sortOrder}, ${isActive}, NOW(), NOW()
    )
    RETURNING id, slug, title, tagline, description, category,
              base_price_ngn as "basePriceNgn", is_hourly as "isHourly",
              hourly_rate_ngn as "hourlyRateNgn", deliverables,
              turnaround_days as "turnaroundDays", sort_order as "sortOrder",
              is_active as "isActive", created_at as "createdAt"
  `
  return c.json(rows[0], 201)
})

adminApp.put('/services/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const basePrice = body.basePriceNgn !== undefined ? (body.basePriceNgn === null || body.basePriceNgn === '' ? null : Number(body.basePriceNgn)) : undefined
  const hourlyRate = body.hourlyRateNgn !== undefined ? (body.hourlyRateNgn === null || body.hourlyRateNgn === '' ? null : Number(body.hourlyRateNgn)) : undefined
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : undefined

  const updated = await sql`
    UPDATE music_services
    SET 
      slug = COALESCE(${body.slug}, slug),
      title = COALESCE(${body.title}, title),
      tagline = COALESCE(${body.tagline}, tagline),
      description = COALESCE(${body.description}, description),
      category = COALESCE(${body.category}, category),
      base_price_ngn = CASE WHEN ${basePrice !== undefined} THEN ${basePrice} ELSE base_price_ngn END,
      is_hourly = COALESCE(${body.isHourly}, is_hourly),
      hourly_rate_ngn = CASE WHEN ${hourlyRate !== undefined} THEN ${hourlyRate} ELSE hourly_rate_ngn END,
      deliverables = CASE WHEN ${body.deliverables !== undefined} THEN ${JSON.stringify(body.deliverables)}::jsonb ELSE deliverables END,
      turnaround_days = COALESCE(${body.turnaroundDays}, turnaround_days),
      sort_order = CASE WHEN ${sortOrder !== undefined} THEN ${sortOrder} ELSE sort_order END,
      is_active = COALESCE(${body.isActive}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, slug, title, base_price_ngn as "basePriceNgn", is_hourly as "isHourly", hourly_rate_ngn as "hourlyRateNgn", deliverables, turnaround_days as "turnaroundDays", sort_order as "sortOrder", is_active as "isActive"
  `
  if (updated.length === 0) return c.json({ error: 'Service not found' }, 404)
  return c.json(updated[0])
})

adminApp.delete('/services/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const rows = await sql`DELETE FROM music_services WHERE id = ${id} RETURNING id, slug, title`
  if (rows.length === 0) return c.json({ error: 'Service not found' }, 404)
  return c.json({ success: true, service: rows[0] })
})

// ------------------------------------------
// Admin Studio Availability & Scheduling (Req #10)
// ------------------------------------------
adminApp.get('/services/availability', async (c) => {
  const sql = c.get('sql')
  const rows = await sql`
    SELECT id, date_str as "dateStr", slots, is_closed as "isClosed", notes, updated_at as "updatedAt"
    FROM service_availability
    ORDER BY date_str ASC
  `
  return c.json(rows)
})

adminApp.post('/services/availability', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json().catch(() => ({}))
  const dateStr = String(body.dateStr || body.date || '').trim()
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return c.json({ error: 'Valid dateStr (YYYY-MM-DD) is required' }, 400)
  }
  const slots = Array.isArray(body.slots) ? body.slots : []
  const isClosed = Boolean(body.isClosed)
  const notes = String(body.notes || '').trim()

  const rows = await sql`
    INSERT INTO service_availability (date_str, slots, is_closed, notes, updated_at)
    VALUES (${dateStr}, ${JSON.stringify(slots)}::jsonb, ${isClosed}, ${notes}, NOW())
    ON CONFLICT (date_str) DO UPDATE SET
      slots = EXCLUDED.slots,
      is_closed = EXCLUDED.is_closed,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, date_str as "dateStr", slots, is_closed as "isClosed", notes, updated_at as "updatedAt"
  `
  return c.json(rows[0])
})

adminApp.delete('/services/availability/:dateStr', async (c) => {
  const sql = c.get('sql')
  const dateStr = String(c.req.param('dateStr') || '').trim()
  await sql`DELETE FROM service_availability WHERE date_str = ${dateStr}`
  return c.json({ success: true, dateStr })
})

adminApp.get('/service-orders', async (c) => {
  const sql = c.get('sql')
  const status = c.req.query('status')
  const service = c.req.query('service')
  const q = c.req.query('q')

  const rows = await sql`
    SELECT 
      o.id, o.order_number as "orderNumber", o.service_slug as "serviceSlug", o.service_title as "serviceTitle",
      o.customer_name as "customerName", o.customer_email as "customerEmail", o.customer_phone as "customerPhone",
      o.configuration, o.items as "items", o.customer_message as "customerMessage", o.client_files as "clientFiles", o.total_amount_ngn as "totalAmountNgn", o.currency,
      o.payment_status as "paymentStatus", o.payment_reference as "paymentReference", o.payment_provider as "paymentProvider",
      o.order_status as "orderStatus", o.agreed_deadline as "agreedDeadline", o.deadline_timezone as "deadlineTimezone",
      o.deliverables, o.admin_notes as "adminNotes", o.created_at as "createdAt", o.updated_at as "updatedAt"
    FROM service_orders o
    WHERE (${!status} OR o.order_status = ${status})
      AND (${!service} OR o.service_slug = ${service})
      AND (${!q} OR (
        o.order_number ILIKE ${'%' + q + '%'} OR 
        o.customer_name ILIKE ${'%' + q + '%'} OR 
        o.customer_email ILIKE ${'%' + q + '%'}
      ))
    ORDER BY o.created_at DESC
  `
  return c.json(rows)
})

adminApp.get('/service-orders/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const rows = await sql`
    SELECT 
      o.id, o.order_number as "orderNumber", o.service_slug as "serviceSlug", o.service_title as "serviceTitle",
      o.customer_name as "customerName", o.customer_email as "customerEmail", o.customer_phone as "customerPhone",
      o.configuration, o.client_files as "clientFiles", o.total_amount_ngn as "totalAmountNgn", o.currency,
      o.payment_status as "paymentStatus", o.payment_reference as "paymentReference", o.payment_provider as "paymentProvider",
      o.order_status as "orderStatus", o.agreed_deadline as "agreedDeadline", o.deadline_timezone as "deadlineTimezone",
      o.deliverables, o.admin_notes as "adminNotes", o.created_at as "createdAt", o.updated_at as "updatedAt"
    FROM service_orders o
    WHERE o.id::text = ${id} OR o.order_number = ${id}
  `
  if (rows.length === 0) return c.json({ error: 'Order not found' }, 404)
  return c.json(rows[0])
})

adminApp.put('/service-orders/:id', async (c) => {
  const sql = c.get('sql')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  const totalNgn = body.totalAmountNgn !== undefined ? (body.totalAmountNgn === null ? null : Number(body.totalAmountNgn)) : undefined
  const deadline = body.agreedDeadline !== undefined ? (body.agreedDeadline ? new Date(body.agreedDeadline) : null) : undefined

  const updated = await sql`
    UPDATE service_orders
    SET 
      order_status = COALESCE(${body.orderStatus}, order_status),
      payment_status = COALESCE(${body.paymentStatus}, payment_status),
      total_amount_ngn = CASE WHEN ${totalNgn !== undefined} THEN ${totalNgn} ELSE total_amount_ngn END,
      agreed_deadline = CASE WHEN ${deadline !== undefined} THEN ${deadline} ELSE agreed_deadline END,
      deadline_timezone = COALESCE(${body.deadlineTimezone}, deadline_timezone),
      admin_notes = CASE WHEN ${body.adminNotes !== undefined} THEN ${body.adminNotes} ELSE admin_notes END,
      deliverables = CASE WHEN ${body.deliverables !== undefined} THEN ${JSON.stringify(body.deliverables)}::jsonb ELSE deliverables END,
      updated_at = NOW()
    WHERE id::text = ${id} OR order_number = ${id}
    RETURNING 
      id, order_number as "orderNumber", order_status as "orderStatus", payment_status as "paymentStatus",
      total_amount_ngn as "totalAmountNgn", agreed_deadline as "agreedDeadline", deadline_timezone as "deadlineTimezone",
      deliverables, admin_notes as "adminNotes", updated_at as "updatedAt"
  `
  if (updated.length === 0) return c.json({ error: 'Order not found' }, 404)
  return c.json(updated[0])
})

// scripts/migrate-stage27.cjs
// Idempotent Stage 27 database inspection & data sync:
// 1. Sync any release whose title was renamed (specifically 'pipedown' with stale slug 'bite-me')
//    and update any gallery_posts.legacy_link referencing '/release/bite-me' -> '/release/pipedown'.
// 2. Preserve existing preview_asset_id by copying releases.preview_asset_id onto its first track
//    if that release's tracks do not yet have a preview_asset_id (Req #14).

const fs = require('fs');
const path = require('path');
const { neon } = require(path.join(__dirname, '..', 'worker', 'node_modules', '@neondatabase', 'serverless'));

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const devVarsPath = path.join(__dirname, '..', 'worker', '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf8');
    const match = content.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found');
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  const sql = neon(getDatabaseUrl());
  console.log('--- Stage 27 Database Inspection & Migration ---');

  // 1. Inspect releases
  const releases = await sql`
    SELECT id, slug, title, status, release_date, preview_asset_id, deleted_at
    FROM releases
    ORDER BY release_date DESC
  `;
  console.log(`Found ${releases.length} release(s):`);
  for (const r of releases) {
    console.log(`  - [${r.status}] title="${r.title}" slug="${r.slug}" preview_asset_id=${r.preview_asset_id || 'null'} deleted=${Boolean(r.deleted_at)}`);
  }

  // Check for any active release whose slug is stale relative to its title (e.g. 'pipedown' with slug 'bite-me')
  for (const r of releases) {
    if (r.deleted_at) continue;
    const expectedSlug = slugify(r.title);
    if (!expectedSlug) continue;

    if (r.slug !== expectedSlug) {
      // Check if another release has expectedSlug
      const conflict = await sql`SELECT id FROM releases WHERE slug = ${expectedSlug} AND id != ${r.id}`;
      let targetSlug = expectedSlug;
      if (conflict.length > 0) {
        let suffix = 2;
        while (true) {
          const candidate = `${expectedSlug}-${suffix}`;
          const c2 = await sql`SELECT id FROM releases WHERE slug = ${candidate} AND id != ${r.id}`;
          if (c2.length === 0) {
            targetSlug = candidate;
            break;
          }
          suffix++;
        }
      }

      const oldSlug = r.slug;
      await sql`
        UPDATE releases
        SET slug = ${targetSlug}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${r.id}
      `;
      console.log(`Updated release "${r.title}" slug: "${oldSlug}" -> "${targetSlug}"`);

      // Also update any gallery_posts.legacy_link referencing /release/<oldSlug>
      const updatedLinks = await sql`
        UPDATE gallery_posts
        SET legacy_link = ${`/release/${targetSlug}`}, updated_at = CURRENT_TIMESTAMP
        WHERE legacy_link = ${`/release/${oldSlug}`}
        RETURNING id, slug
      `;
      if (updatedLinks.length > 0) {
        console.log(`  Updated ${updatedLinks.length} gallery_posts.legacy_link from /release/${oldSlug} to /release/${targetSlug}`);
      }
    }
  }

  // 2. Req #14: Ensure any release with preview_asset_id has at least one track with that preview_asset_id
  for (const r of releases) {
    if (!r.preview_asset_id || r.deleted_at) continue;
    const relTracks = await sql`
      SELECT id, title, track_number, preview_asset_id
      FROM tracks
      WHERE release_id = ${r.id} AND deleted_at IS NULL
      ORDER BY track_number ASC
    `;
    if (relTracks.length > 0) {
      const hasTrackPreview = relTracks.some(t => Boolean(t.preview_asset_id));
      if (!hasTrackPreview) {
        const firstTrack = relTracks[0];
        await sql`
          UPDATE tracks
          SET preview_asset_id = ${r.preview_asset_id}, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${firstTrack.id}
        `;
        console.log(`Copied release "${r.title}" preview_asset_id (${r.preview_asset_id}) to Track #${firstTrack.track_number} ("${firstTrack.title}")`);
      }
    }
  }

  // 3. Inspect gallery_posts video / carousel post_type consistency
  const galleryPosts = await sql`
    SELECT g.id, g.slug, g.title, g.post_type, g.primary_asset_id, m.r2_key, m.original_filename, m.asset_type, m.mime_type,
           m.size_bytes, octet_length(m.file_data) AS bytea_len,
           encode(substring(m.file_data from 1 for 16), 'hex') AS header_hex,
           (SELECT COUNT(*)::int FROM gallery_slides gs WHERE gs.post_id = g.id) AS slide_count
    FROM gallery_posts g
    LEFT JOIN media_assets m ON g.primary_asset_id = m.id
    WHERE g.deleted_at IS NULL
  `;
  console.log(`Found ${galleryPosts.length} active gallery post(s):`);
  for (const gp of galleryPosts) {
    console.log(`  - slug="${gp.slug}" type="${gp.post_type}" asset_id="${gp.primary_asset_id}" r2="${gp.r2_key}" file="${gp.original_filename}" asset_type="${gp.asset_type}" mime="${gp.mime_type}" bytea_len=${gp.bytea_len} header_hex="${gp.header_hex}" slides=${gp.slide_count}`);
    // If a gallery post has 2+ slides, ensure post_type = 'carousel'
    // If a gallery post has 0/1 slides and primary asset is VIDEO, ensure post_type = 'video'
    let inferredType = gp.post_type;
    if (gp.slide_count > 1) {
      inferredType = 'carousel';
    } else if (gp.asset_type === 'VIDEO' || (gp.mime_type && gp.mime_type.startsWith('video/'))) {
      inferredType = 'video';
    } else if (gp.asset_type === 'IMAGE' || (gp.mime_type && gp.mime_type.startsWith('image/'))) {
      if (gp.post_type !== 'carousel') inferredType = 'image';
    }
    if (inferredType !== gp.post_type) {
      await sql`
        UPDATE gallery_posts
        SET post_type = ${inferredType}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${gp.id}
      `;
      console.log(`  Normalized gallery post "${gp.slug}" post_type: "${gp.post_type}" -> "${inferredType}"`);
    }
  }

  console.log('--- Stage 27 Migration Complete ---');
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});

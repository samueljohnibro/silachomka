// worker/db/migrate-catalogue.js
// Migration script to seed Neon PostgreSQL from existing src/data/*.js files
// Usage: node db/migrate-catalogue.js [--dry-run]
//
// IMPORTANT: This script reads the canonical JS data files and inserts records
// into the database. It does NOT upload media files to R2.
// Media asset references are created with R2 key placeholders based on the
// current public/ file paths. Actual R2 upload is handled separately.
//
// Run with --dry-run to see what would be inserted without touching the database.

import { readFileSync } from 'fs';
import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');

// ==========================================
// DATABASE CONNECTION
// ==========================================
function loadDatabaseUrl() {
  const devVarsPath = join(__dirname, '..', '.dev.vars');
  const content = readFileSync(devVarsPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*"?([^"]*)"?$/);
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in worker/.dev.vars');
}

// ==========================================
// DATA LOADERS (Dynamic import of src/data)
// ==========================================
const srcDataDir = join(__dirname, '..', '..', 'src', 'data');

async function loadReleases() {
  const mod = await import(`file://${join(srcDataDir, 'releases.js').replace(/\\/g, '/')}`);
  return mod.default;
}

async function loadBeats() {
  const mod = await import(`file://${join(srcDataDir, 'beats.js').replace(/\\/g, '/')}`);
  return mod.default;
}

async function loadVideos() {
  const mod = await import(`file://${join(srcDataDir, 'videos.js').replace(/\\/g, '/')}`);
  return mod.default;
}

async function loadSocials() {
  const mod = await import(`file://${join(srcDataDir, 'socials.js').replace(/\\/g, '/')}`);
  return { artist: mod.ARTIST_SOCIALS, ecosystem: mod.ECOSYSTEM_SOCIALS };
}

// ==========================================
// MEDIA ASSET HELPER
// ==========================================
// Creates a media_asset record for a public/ file path.
// Returns the UUID of the inserted (or existing) asset.
// r2_key is derived from the public path: /covers/horus.jpg -> covers/horus.jpg
const assetCache = new Map();

async function ensureMediaAsset(client, publicPath, assetType) {
  if (!publicPath || typeof publicPath !== 'string' || !publicPath.trim()) return null;

  // Strip leading slash to form R2 key
  const r2Key = publicPath.replace(/^\/+/, '');

  if (assetCache.has(r2Key)) return assetCache.get(r2Key);

  if (DRY_RUN) {
    const fakeId = `dry-run-${r2Key}`;
    assetCache.set(r2Key, fakeId);
    console.log(`  [DRY-RUN] Would create media_asset: ${r2Key} (${assetType})`);
    return fakeId;
  }

  // Determine mime type from extension
  const ext = r2Key.split('.').pop().toLowerCase();
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', mp3: 'audio/mpeg', mp4: 'video/mp4',
    webp: 'image/webp', webm: 'video/webm',
  };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  const result = await client.query(`
    INSERT INTO media_assets (r2_key, original_filename, asset_type, mime_type)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (r2_key) DO UPDATE SET r2_key = EXCLUDED.r2_key
    RETURNING id
  `, [r2Key, r2Key.split('/').pop(), assetType, mimeType]);

  const id = result.rows[0].id;
  assetCache.set(r2Key, id);
  return id;
}

// ==========================================
// MIGRATION: RELEASES + TRACKS + CREDITS
// ==========================================
async function migrateReleases(client, releases) {
  console.log(`\n=== RELEASES (${releases.length} records) ===`);

  for (const release of releases) {
    const coverAssetId = await ensureMediaAsset(client, release.cover, 'IMAGE');

    // Determine release type
    const type = release.type || (release.tracks.length <= 2 ? 'single' : 'ep');

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Release: "${release.title}" (${release.slug}), ${release.tracks.length} tracks`);
      for (const [ti, track] of release.tracks.entries()) {
        console.log(`    Track ${ti + 1}: "${track.title}" feat=[${(track.featuring || []).join(', ')}] prod=[${(track.producers || []).join(', ')}]`);
      }
      continue;
    }

    // Insert release
    const releaseResult = await client.query(`
      INSERT INTO releases (
        slug, legacy_slug, number, title, edition,
        release_date, display_date, type, primary_artist,
        feats_silachomka, produced_by_silachomka,
        description, cover_asset_id, sources, platforms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PUBLISHED')
      ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id
    `, [
      release.slug,
      release.slug, // legacy_slug = slug for migrated records
      release.number || null,
      release.title,
      release.edition || 1,
      release.date,
      release.displayDate || null,
      type,
      release.artist || 'silachomka',
      release.featssilachomka || false,
      release.producedBysilachomka !== undefined ? release.producedBysilachomka : true,
      release.description || null,
      coverAssetId,
      JSON.stringify(release.sources || null),
      JSON.stringify(release.platforms || null),
    ]);

    const releaseId = releaseResult.rows[0].id;

    // Insert tracks
    for (let ti = 0; ti < release.tracks.length; ti++) {
      const track = release.tracks[ti];

      const trackResult = await client.query(`
        INSERT INTO tracks (release_id, track_number, title, platforms)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (release_id, track_number) DO UPDATE SET title = EXCLUDED.title
        RETURNING id
      `, [
        releaseId,
        ti + 1,
        track.title,
        JSON.stringify(track.platforms || null),
      ]);

      const trackId = trackResult.rows[0].id;

      // Insert featuring credits
      const featuring = track.featuring || [];
      for (const name of featuring) {
        if (!name || !name.trim()) continue;
        await client.query(`
          INSERT INTO track_credits (track_id, credit_name, role)
          VALUES ($1, $2, 'FEATURING')
          ON CONFLICT (track_id, credit_name, role) DO NOTHING
        `, [trackId, name]);
      }

      // Insert producer credits
      const producers = track.producers || [];
      for (const name of producers) {
        if (!name || !name.trim()) continue;
        await client.query(`
          INSERT INTO track_credits (track_id, credit_name, role)
          VALUES ($1, $2, 'PRODUCER')
          ON CONFLICT (track_id, credit_name, role) DO NOTHING
        `, [trackId, name]);
      }
    }

    console.log(`  OK: "${release.title}" (${release.slug}) — ${release.tracks.length} tracks inserted`);
  }
}

// ==========================================
// MIGRATION: BEATS
// ==========================================
async function migrateBeats(client, beats) {
  console.log(`\n=== BEATS (${beats.length} records) ===`);

  for (const beat of beats) {
    const imageAssetId = await ensureMediaAsset(client, beat.image, 'IMAGE');
    const videoAssetId = await ensureMediaAsset(client, beat.video, 'VIDEO');
    const audioAssetId = await ensureMediaAsset(client, beat.audio, 'AUDIO');

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Beat: "${beat.title}" (${beat.id}), ${beat.bpm}, ${beat.key}`);
      continue;
    }

    await client.query(`
      INSERT INTO beats (
        slug, legacy_id, title, genre, short_genre, categories,
        bpm, beat_key, producer,
        image_asset_id, video_asset_id, audio_asset_id,
        selar_basic_url, selar_premium_url, selar_ultimate_url,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PUBLISHED')
      ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id
    `, [
      beat.id,
      beat.id, // legacy_id = id for migrated records
      beat.title,
      beat.genre || null,
      beat.shortGenre || null,
      JSON.stringify(beat.categories || null),
      beat.bpm || null,
      beat.key || null,
      beat.producer || 'silachomka',
      imageAssetId,
      videoAssetId,
      audioAssetId,
      beat.selar?.basic || null,
      beat.selar?.premium || null,
      beat.selar?.ultimate || null,
    ]);

    console.log(`  OK: "${beat.title}" (${beat.id})`);
  }
}

// ==========================================
// MIGRATION: MUSIC VIDEOS
// ==========================================
async function migrateVideos(client, videos) {
  console.log(`\n=== MUSIC VIDEOS (${videos.length} records) ===`);

  for (const video of videos) {
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Video: "${video.title}" (${video.id}), youtube=${video.youtubeId}`);
      continue;
    }

    const videoResult = await client.query(`
      INSERT INTO music_videos (
        slug, legacy_id, title, subtitle, category,
        youtube_id, youtube_url, aspect_ratio, platforms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED')
      ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id
    `, [
      video.id,
      video.id,
      video.title,
      video.subtitle || null,
      video.category || 'Visualizer',
      video.youtubeId,
      video.youtubeUrl,
      video.aspectRatio || '16:9',
      JSON.stringify(video.links || null),
    ]);

    const videoId = videoResult.rows[0].id;

    // Insert featuring artists
    const featuring = video.featuring || [];
    for (const name of featuring) {
      if (!name || !name.trim()) continue;
      await client.query(`
        INSERT INTO music_video_features (video_id, artist_name)
        VALUES ($1, $2)
        ON CONFLICT (video_id, artist_name) DO NOTHING
      `, [videoId, name]);
    }

    console.log(`  OK: "${video.title}" (${video.id})`);
  }
}

// ==========================================
// MIGRATION: SOCIAL LINKS
// ==========================================
async function migrateSocials(client, socials) {
  const allLinks = [
    ...socials.artist.map((s, i) => ({ ...s, link_type: 'ARTIST', sort_order: i })),
    ...socials.ecosystem.map((s, i) => ({ ...s, link_type: 'ECOSYSTEM', sort_order: i })),
  ];

  console.log(`\n=== SOCIAL LINKS (${allLinks.length} records) ===`);

  for (const link of allLinks) {
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Social: "${link.name}" (${link.link_type}) -> ${link.url}`);
      continue;
    }

    await client.query(`
      INSERT INTO social_links (
        name, handle, url, platform, category, role,
        link_type, sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      ON CONFLICT (name, link_type)
      DO UPDATE SET
        handle = EXCLUDED.handle,
        url = EXCLUDED.url,
        platform = EXCLUDED.platform,
        category = EXCLUDED.category,
        role = EXCLUDED.role,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `, [
      link.name,
      link.handle || null,
      link.url,
      link.platform || null,
      link.category || null,
      link.role || null,
      link.link_type,
      link.sort_order,
    ]);

    console.log(`  OK: "${link.name}" (${link.link_type})`);
  }
}

// ==========================================
// MAIN
// ==========================================
async function main() {
  console.log(`Silachomka Catalogue Migration${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log('='.repeat(50));

  // Load all data
  console.log('\nLoading src/data modules...');
  const [releases, beats, videos, socials] = await Promise.all([
    loadReleases(),
    loadBeats(),
    loadVideos(),
    loadSocials(),
  ]);

  console.log(`  Releases: ${releases.length}`);
  console.log(`  Beats: ${beats.length}`);
  console.log(`  Videos: ${videos.length}`);
  console.log(`  Social links: ${socials.artist.length} artist + ${socials.ecosystem.length} ecosystem`);

  if (DRY_RUN) {
    console.log('\n--- DRY RUN MODE: No database changes will be made ---');
    // Still run through the logic to show what would happen
    await migrateReleases(null, releases);
    await migrateBeats(null, beats);
    await migrateVideos(null, videos);
    await migrateSocials(null, socials);
    console.log('\n--- DRY RUN COMPLETE ---');
    return;
  }

  const databaseUrl = loadDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  try {
    await client.query('BEGIN');

    await migrateReleases(client, releases);
    await migrateBeats(client, beats);
    await migrateVideos(client, videos);
    await migrateSocials(client, socials);

    await client.query('COMMIT');
    console.log('\n=== ALL MIGRATIONS COMMITTED SUCCESSFULLY ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nMIGRATION FAILED — ROLLED BACK');
    console.error('Error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`  Media assets created: ${assetCache.size}`);
  console.log(`  Releases migrated: ${releases.length}`);
  console.log(`  Beats migrated: ${beats.length}`);
  console.log(`  Videos migrated: ${videos.length}`);
  console.log(`  Social links migrated: ${socials.artist.length + socials.ecosystem.length}`);
  console.log(`  Gallery posts: 0 (source array is empty)`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

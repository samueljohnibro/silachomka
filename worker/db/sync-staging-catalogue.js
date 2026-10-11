// worker/db/sync-staging-catalogue.js
// Safe, idempotent staging-only catalogue synchronizer.
// Imports historical content from src/data/*.js into the isolated Neon Staging database.
// Guarantees:
//  - Never touches production (enforces branch and endpoint checks)
//  - Idempotent: ON CONFLICT updates or ignores to prevent duplicates on repeat runs
//  - Preserves relational integrity (releases -> tracks -> credits, videos -> features, media assets)

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KNOWN_PROD_PROJECT_ID = 'silent-band-97824894';
const KNOWN_PROD_BRANCH_ID = 'br-holy-silence-b1nmyb1d';
const KNOWN_PROD_ENDPOINT_ID = 'ep-damp-feather-b1w95hnc';

const EXPECTED_STAGING_BRANCH_ID = 'br-mute-dust-b1ndcps9';
const EXPECTED_STAGING_ENDPOINT_ID = 'ep-square-morning-b1yc5ro7';

const STAGING_VARS_PATH = join(__dirname, '..', '.dev.vars.staging');
const PROD_VARS_PATH = join(__dirname, '..', '.dev.vars');

function loadStagingUrl() {
  if (!existsSync(STAGING_VARS_PATH)) {
    throw new Error('worker/.dev.vars.staging not found!');
  }
  const content = readFileSync(STAGING_VARS_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^STAGING_DATABASE_URL\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && m[1].trim()) return m[1].trim();
  }
  throw new Error('STAGING_DATABASE_URL missing in worker/.dev.vars.staging');
}

function verifyIsolation(stagingUrl) {
  if (existsSync(PROD_VARS_PATH)) {
    const prodContent = readFileSync(PROD_VARS_PATH, 'utf-8');
    for (const line of prodContent.split('\n')) {
      const m = line.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]*)"?$/);
      if (m && m[1].trim() && stagingUrl === m[1].trim()) {
        throw new Error('[FATAL] STAGING_DATABASE_URL matches production DATABASE_URL!');
      }
    }
  }

  const parsed = new URL(stagingUrl);
  const endpoint = parsed.host.split('.')[0].replace('-pooler', '');
  if (endpoint === KNOWN_PROD_ENDPOINT_ID) {
    throw new Error(`[FATAL] Endpoint matches production ${KNOWN_PROD_ENDPOINT_ID}!`);
  }
  if (endpoint !== EXPECTED_STAGING_ENDPOINT_ID) {
    throw new Error(`[FATAL] Endpoint ${endpoint} does not match expected staging ${EXPECTED_STAGING_ENDPOINT_ID}!`);
  }
}

// Data loaders
const srcDataDir = join(__dirname, '..', '..', 'src', 'data');

async function loadData() {
  const [relMod, beatMod, vidMod, socMod] = await Promise.all([
    import(`file:///${join(srcDataDir, 'releases.js').replace(/\\/g, '/')}`),
    import(`file:///${join(srcDataDir, 'beats.js').replace(/\\/g, '/')}`),
    import(`file:///${join(srcDataDir, 'videos.js').replace(/\\/g, '/')}`),
    import(`file:///${join(srcDataDir, 'socials.js').replace(/\\/g, '/')}`)
  ]);

  return {
    releases: relMod.default,
    beats: beatMod.default,
    videos: vidMod.default,
    socials: {
      artist: socMod.ARTIST_SOCIALS || [],
      ecosystem: socMod.ECOSYSTEM_SOCIALS || []
    }
  };
}

const assetCache = new Map();

async function ensureMediaAsset(sql, publicPath, assetType) {
  if (!publicPath || typeof publicPath !== 'string' || !publicPath.trim()) return null;
  const r2Key = publicPath.replace(/^\/+/, '');
  if (assetCache.has(r2Key)) return assetCache.get(r2Key);

  const ext = r2Key.split('.').pop().toLowerCase();
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', mp3: 'audio/mpeg', mp4: 'video/mp4',
    webp: 'image/webp', webm: 'video/webm'
  };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  const rows = await sql.query(`
    INSERT INTO media_assets (r2_key, original_filename, asset_type, mime_type)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (r2_key) DO UPDATE SET r2_key = EXCLUDED.r2_key
    RETURNING id
  `, [r2Key, r2Key.split('/').pop(), assetType, mimeType]);

  const id = rows[0].id;
  assetCache.set(r2Key, id);
  return id;
}

function createResilientQuery(rawSql) {
  return async function queryWithRetry(text, params, maxRetries = 5) {
    let lastErr = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await rawSql.query(text, params);
      } catch (err) {
        lastErr = err;
        const isNetworkErr = err?.message?.includes('fetch failed') || 
                             err?.sourceError?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                             err?.code === 'ETIMEDOUT' ||
                             err?.message?.includes('timeout') ||
                             err?.message?.includes('fetch');
        if (isNetworkErr && attempt < maxRetries) {
          const delay = attempt * 1500;
          console.warn(`    [Query Retry ${attempt}/${maxRetries}] Network glitch (${err.message}), retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
    throw lastErr;
  };
}

export async function runStagingSync() {
  console.log('=== STARTING STAGING CATALOGUE SYNCHRONIZATION ===\n');

  const stagingUrl = loadStagingUrl();
  verifyIsolation(stagingUrl);

  const rawSql = neon(stagingUrl);
  const sql = { query: createResilientQuery(rawSql) };

  // Dynamic Neon verification
  const meta = await sql.query(`
    SELECT 
      current_setting('neon.project_id', true) AS project_id,
      current_setting('neon.branch_id', true) AS branch_id,
      current_setting('neon.endpoint_id', true) AS endpoint_id
  `);

  if (!meta || meta.length === 0) {
    throw new Error('Failed to query Neon settings');
  }
  const reportedBranch = meta[0].branch_id;
  const reportedEndpoint = meta[0].endpoint_id;

  if (reportedBranch === KNOWN_PROD_BRANCH_ID || reportedEndpoint === KNOWN_PROD_ENDPOINT_ID) {
    throw new Error('[FATAL] Connected database reported production identifiers!');
  }
  if (reportedBranch !== EXPECTED_STAGING_BRANCH_ID) {
    throw new Error(`[FATAL] Branch ${reportedBranch} does not match expected staging branch ${EXPECTED_STAGING_BRANCH_ID}!`);
  }

  console.log(`[VERIFIED STAGING TARGET] Branch: ${reportedBranch} | Endpoint: ${reportedEndpoint}`);

  const data = await loadData();
  console.log(`Loaded historical sources: ${data.releases.length} releases, ${data.beats.length} beats, ${data.videos.length} videos, ${data.socials.artist.length + data.socials.ecosystem.length} socials.\n`);

  // 1. Sync Releases + Tracks + Credits
  console.log('--- Syncing Releases, Tracks & Credits ---');
  let syncedReleases = 0;
  let syncedTracks = 0;
  let syncedCredits = 0;

  for (const rel of data.releases) {
    const coverAssetId = await ensureMediaAsset(sql, rel.cover, 'IMAGE');
    const type = rel.type || (rel.tracks.length <= 2 ? 'single' : 'ep');

    const relRows = await sql.query(`
      INSERT INTO releases (
        slug, legacy_slug, number, title, edition,
        release_date, display_date, type, primary_artist,
        feats_silachomka, produced_by_silachomka,
        description, cover_asset_id, sources, platforms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PUBLISHED')
      ON CONFLICT (slug) DO UPDATE SET 
        title = EXCLUDED.title,
        cover_asset_id = EXCLUDED.cover_asset_id,
        description = EXCLUDED.description,
        release_date = EXCLUDED.release_date,
        type = EXCLUDED.type
      RETURNING id
    `, [
      rel.slug,
      rel.slug,
      rel.number || null,
      rel.title,
      rel.edition || 1,
      rel.date,
      rel.displayDate || null,
      type,
      rel.artist || 'silachomka',
      rel.featssilachomka || false,
      rel.producedBysilachomka !== undefined ? rel.producedBysilachomka : true,
      rel.description || null,
      coverAssetId,
      JSON.stringify(rel.sources || null),
      JSON.stringify(rel.platforms || null)
    ]);

    const releaseId = relRows[0].id;
    syncedReleases++;

    for (let ti = 0; ti < rel.tracks.length; ti++) {
      const track = rel.tracks[ti];
      const trackRows = await sql.query(`
        INSERT INTO tracks (release_id, track_number, title, platforms)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (release_id, track_number) DO UPDATE SET 
          title = EXCLUDED.title,
          platforms = EXCLUDED.platforms
        RETURNING id
      `, [
        releaseId,
        ti + 1,
        track.title,
        JSON.stringify(track.platforms || null)
      ]);

      const trackId = trackRows[0].id;
      syncedTracks++;

      const featuring = track.featuring || [];
      for (const name of featuring) {
        if (!name || !name.trim()) continue;
        await sql.query(`
          INSERT INTO track_credits (track_id, credit_name, role)
          VALUES ($1, $2, 'FEATURING')
          ON CONFLICT (track_id, credit_name, role) DO NOTHING
        `, [trackId, name.trim()]);
        syncedCredits++;
      }

      const producers = track.producers || [];
      for (const name of producers) {
        if (!name || !name.trim()) continue;
        await sql.query(`
          INSERT INTO track_credits (track_id, credit_name, role)
          VALUES ($1, $2, 'PRODUCER')
          ON CONFLICT (track_id, credit_name, role) DO NOTHING
        `, [trackId, name.trim()]);
        syncedCredits++;
      }
    }
  }
  console.log(`  Synced ${syncedReleases} releases, ${syncedTracks} tracks, ${syncedCredits} credits.`);

  // 2. Sync Beats
  console.log('--- Syncing Beats ---');
  let syncedBeats = 0;
  for (const b of data.beats) {
    const imageAssetId = await ensureMediaAsset(sql, b.image, 'IMAGE');
    const videoAssetId = await ensureMediaAsset(sql, b.video, 'VIDEO');
    const audioAssetId = await ensureMediaAsset(sql, b.audio, 'AUDIO');

    const bpmInt = b.bpm ? parseInt(b.bpm, 10) : null;

    await sql.query(`
      INSERT INTO beats (
        slug, legacy_id, title, genre, short_genre, categories,
        bpm, beat_key, producer,
        image_asset_id, video_asset_id, audio_asset_id,
        selar_basic_url, selar_premium_url, selar_ultimate_url,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PUBLISHED')
      ON CONFLICT (slug) DO UPDATE SET 
        title = EXCLUDED.title,
        genre = EXCLUDED.genre,
        short_genre = EXCLUDED.short_genre,
        bpm = EXCLUDED.bpm,
        beat_key = EXCLUDED.beat_key,
        producer = EXCLUDED.producer,
        image_asset_id = EXCLUDED.image_asset_id,
        video_asset_id = EXCLUDED.video_asset_id,
        audio_asset_id = EXCLUDED.audio_asset_id,
        selar_basic_url = EXCLUDED.selar_basic_url,
        selar_premium_url = EXCLUDED.selar_premium_url,
        selar_ultimate_url = EXCLUDED.selar_ultimate_url
    `, [
      b.id,
      b.id,
      b.title,
      b.genre || null,
      b.shortGenre || null,
      JSON.stringify(b.categories || null),
      isNaN(bpmInt) ? null : bpmInt,
      b.key || null,
      b.producer || 'silachomka',
      imageAssetId,
      videoAssetId,
      audioAssetId,
      b.selar?.basic || null,
      b.selar?.premium || null,
      b.selar?.ultimate || null
    ]);
    syncedBeats++;
  }
  console.log(`  Synced ${syncedBeats} beats.`);

  // 3. Sync Music Videos
  console.log('--- Syncing Music Videos ---');
  let syncedVideos = 0;
  let syncedVideoFeats = 0;
  for (const v of data.videos) {
    const vidRows = await sql.query(`
      INSERT INTO music_videos (
        slug, legacy_id, title, subtitle, category,
        youtube_id, youtube_url, aspect_ratio, platforms, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED')
      ON CONFLICT (slug) DO UPDATE SET 
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        category = EXCLUDED.category,
        youtube_id = EXCLUDED.youtube_id,
        youtube_url = EXCLUDED.youtube_url,
        aspect_ratio = EXCLUDED.aspect_ratio,
        platforms = EXCLUDED.platforms
      RETURNING id
    `, [
      v.id,
      v.id,
      v.title,
      v.subtitle || null,
      v.category || 'Visualizer',
      v.youtubeId,
      v.youtubeUrl,
      v.aspectRatio || '16:9',
      JSON.stringify(v.links || null)
    ]);

    const videoId = vidRows[0].id;
    syncedVideos++;

    const feats = v.featuring || [];
    for (const artist of feats) {
      if (!artist || !artist.trim()) continue;
      await sql.query(`
        INSERT INTO music_video_features (video_id, artist_name)
        VALUES ($1, $2)
        ON CONFLICT (video_id, artist_name) DO NOTHING
      `, [videoId, artist.trim()]);
      syncedVideoFeats++;
    }
  }
  console.log(`  Synced ${syncedVideos} music videos and ${syncedVideoFeats} features.`);

  // 4. Sync Social Links
  console.log('--- Syncing Social Links ---');
  let syncedSocials = 0;
  const allSocials = [
    ...data.socials.artist.map((s, i) => ({ ...s, link_type: 'ARTIST', sort_order: i })),
    ...data.socials.ecosystem.map((s, i) => ({ ...s, link_type: 'ECOSYSTEM', sort_order: i }))
  ];

  for (const s of allSocials) {
    await sql.query(`
      INSERT INTO social_links (
        name, handle, url, platform, category, role,
        link_type, sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      ON CONFLICT (name, link_type) DO UPDATE SET 
        handle = EXCLUDED.handle,
        url = EXCLUDED.url,
        platform = EXCLUDED.platform,
        category = EXCLUDED.category,
        role = EXCLUDED.role,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `, [
      s.name,
      s.handle || null,
      s.url,
      s.platform || null,
      s.category || null,
      s.role || null,
      s.link_type,
      s.sort_order
    ]);
    syncedSocials++;
  }
  console.log(`  Synced ${syncedSocials} social links.`);

  console.log('\n=== STAGING SYNCHRONIZATION COMPLETE ===');
  console.log(`Total Media Assets registered: ${assetCache.size}`);

  // Query and print final counts
  const finalTables = [
    'releases', 'tracks', 'track_credits', 'beats',
    'music_videos', 'music_video_features', 'social_links', 'media_assets'
  ];
  console.log('\nFinal Staging Database Table Row Counts:');
  for (const t of finalTables) {
    const r = await sql.query(`SELECT count(*)::int as c FROM ${t}`);
    console.log(`  ${t.padEnd(24)}: ${r[0].c}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runStagingSync().catch(err => {
    console.error('[SYNC ERROR]:', err);
    process.exit(1);
  });
}

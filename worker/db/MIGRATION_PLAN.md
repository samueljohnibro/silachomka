# Silachomka CMS: Data Migration Plan

## Overview
This document describes the migration tooling created to move the existing `src/data` catalogue records and `public/` media assets into the new Neon PostgreSQL + Cloudflare R2 backend.

## Migration Order

### Phase 1: Catalogue Data → Neon PostgreSQL
**Script**: `worker/db/migrate-catalogue.js`
**Prerequisite**: Schema must be applied (`worker/db/schema-proposal.sql`)

| Step | Source | Target Table(s) | Record Count |
|------|--------|-----------------|--------------|
| 1 | `src/data/releases.js` | `releases`, `tracks`, `track_credits`, `media_assets` | 18 releases, ~35 tracks |
| 2 | `src/data/beats.js` | `beats`, `media_assets` | 9 beats |
| 3 | `src/data/videos.js` | `music_videos`, `music_video_features` | 7 videos |
| 4 | `src/data/socials.js` | `social_links` | 12 artist + 4 ecosystem |
| 5 | `src/data/gallery.js` | `gallery_posts` | 0 (empty array) |

**How it works**:
1. Dynamically imports the ES module data files (same code the frontend uses)
2. For each release cover and beat media path, creates a `media_assets` row with an R2 key derived from the public path (e.g., `/covers/horus.jpg` → `covers/horus.jpg`)
3. Inserts releases with all metadata preserved exactly as-is
4. Inserts tracks with track numbers, then inserts `track_credits` rows for each `featuring` and `producers` array entry
5. Entire migration runs inside a single database transaction — any error rolls back everything
6. Uses `ON CONFLICT` clauses so the script is safely re-runnable

**Commands**:
```bash
cd worker
node db/migrate-catalogue.js --dry-run   # Preview without database changes
node db/migrate-catalogue.js             # Execute migration
```

### Phase 2: Media Files → Cloudflare R2
**Script**: `worker/db/migrate-assets.js`
**Prerequisite**: R2 bucket must be created, catalogue migration must be complete

| Source Directory | File Count | Types | Approximate Size |
|-----------------|------------|-------|-------------------|
| `public/covers/` | 19 files | `.jpg` | ~4.5 MB |
| `public/beats/` | 27 files | `.jpg`, `.gif`, `.mp3` | ~65 MB |
| Root `public/` | 3 files | `.png` | ~0.1 MB |

**Current status**: The script validates that all `media_assets` records have matching local files and reports file sizes. Actual R2 upload will be implemented once the bucket is provisioned.

**Commands**:
```bash
cd worker
node db/migrate-assets.js --dry-run   # Validate local files exist
node db/migrate-assets.js             # Validate and update size_bytes
```

## Field Mapping Reference

### releases.js → `releases` table
| JS Field | DB Column | Notes |
|----------|-----------|-------|
| `slug` | `slug` + `legacy_slug` | Both set to same value for migrated records |
| `number` | `number` | Nullable, only set for silachomka's own releases |
| `title` | `title` | Preserved exactly (e.g., "TWÈN", "SAVAGE.", "HORUS.") |
| `edition` | `edition` | Defaults to 1 |
| `date` | `release_date` | ISO date string |
| `displayDate` | `display_date` | Human-readable string |
| `type` | `type` | single/ep/album enum |
| `artist` | `primary_artist` | Defaults to "silachomka" |
| `featssilachomka` | `feats_silachomka` | Boolean |
| `producedBysilachomka` | `produced_by_silachomka` | Boolean |
| `description` | `description` | Auto-generated string from createRelease() |
| `cover` | `cover_asset_id` → `media_assets` | FK to media_assets via R2 key |
| `sources` | `sources` | JSONB array |
| `platforms` | `platforms` | JSONB object |

### releases.js tracks → `tracks` + `track_credits`
| JS Field | DB Column | Notes |
|----------|-----------|-------|
| Array index | `track_number` | 1-based |
| `title` | `title` | Preserved exactly |
| `platforms` | `platforms` | JSONB |
| `featuring[]` | `track_credits` rows with role=FEATURING | One row per artist |
| `producers[]` | `track_credits` rows with role=PRODUCER | One row per producer |

### beats.js → `beats` table
| JS Field | DB Column | Notes |
|----------|-----------|-------|
| `id` | `slug` + `legacy_id` | Both set to same value |
| `title` | `title` | Preserved exactly (e.g., "FÀNGUÀN") |
| `genre` | `genre` | Full genre string |
| `shortGenre` | `short_genre` | Often same as genre |
| `categories` | `categories` | JSONB array |
| `bpm` | `bpm` | String like "140 BPM" |
| `key` | `beat_key` | String like "F♯ major" |
| `image` | `image_asset_id` → `media_assets` | FK |
| `video` | `video_asset_id` → `media_assets` | FK |
| `audio` | `audio_asset_id` → `media_assets` | FK |
| `selar.basic` | `selar_basic_url` | Exact URL preserved |
| `selar.premium` | `selar_premium_url` | Exact URL preserved |
| `selar.ultimate` | `selar_ultimate_url` | Exact URL preserved |
| `producer` | `producer` | Defaults to "silachomka" |
| `status` | `status` | "available" → PUBLISHED |

### videos.js → `music_videos` + `music_video_features`
| JS Field | DB Column | Notes |
|----------|-----------|-------|
| `id` | `slug` + `legacy_id` | Both set to same value |
| `title` | `title` | Preserved exactly |
| `subtitle` | `subtitle` | Nullable |
| `category` | `category` | e.g., "Visualizer", "Lyric Video" |
| `youtubeId` | `youtube_id` | Raw YouTube video ID |
| `youtubeUrl` | `youtube_url` | Full youtu.be URL |
| `aspectRatio` | `aspect_ratio` | "16:9" or "9:16" |
| `links` | `platforms` | JSONB (youtube, audiomack, soundcloud) |
| `featuring[]` | `music_video_features` rows | One row per artist |

### socials.js → `social_links` table
| JS Field | DB Column | Notes |
|----------|-----------|-------|
| `name` | `name` | e.g., "chomkaMUSIC™" |
| `handle` | `handle` | e.g., "@silachomka" |
| `url` | `url` | Full URL |
| `platform` | `platform` | For ecosystem entries |
| `category` | `category` | "social" or "music" |
| `role` | `role` | For ecosystem entries |
| Array source | `link_type` | "ARTIST" or "ECOSYSTEM" |
| Array index | `sort_order` | Preserves display order |

## Fields NOT Migrated (By Design)
| Field | Reason |
|-------|--------|
| `showVisualTitle` (beats) | UI display preference, stays in frontend |
| `letterboxed` (beats) | UI display preference, stays in frontend |
| `ARTIST_PLATFORMS` (releases.js) | Static artist profile links, stays in code |
| `DEFAULT_PRODUCER`, `DEFAULT_SOURCE` (credits.js) | Constants, stays in code |
| `formatCreditsList()` etc. (credits.js) | Utility functions, stays in code |
| IndexedDB/localStorage data | Replaced by PostgreSQL — not migrated |

## What Needs Your Approval Before Migration

1. **Run the dry-run** to confirm the record counts and field mappings look correct
2. **Confirm R2 bucket name** — currently planned as `silachomka-media`
3. **Confirm gallery strategy** — gallery.js is empty; future gallery posts will be created via the Admin CMS
4. **Confirm the migration is one-way** — once data lives in Neon, the src/data files become redundant (but are not deleted yet)

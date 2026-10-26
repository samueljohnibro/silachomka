-- ==============================================================================
-- SILACHOMKA ADMIN CMS: PRODUCTION DATABASE MIGRATION SCRIPT
-- ==============================================================================
-- Target Engine: Neon PostgreSQL (PostgreSQL 16+)
-- File: worker/db/production-migration.sql
--
-- EXECUTION PHASES & TRANSACTION BOUNDARIES:
-- ------------------------------------------------------------------------------
-- PHASE 1: INITIAL ENUM INITIALIZATION (NON-TRANSACTIONAL / AUTONOMOUS)
--   - Uses guarded DO $$ blocks to create any missing custom enum types with
--     their full authoritative label sets.
--   - Guarantees all 8 types exist in pg_type before Phase 2 executes.
--
-- PHASE 2: TOP-LEVEL ENUM LABEL REPAIR (AUTONOMOUS / OUTSIDE PROCEDURAL BLOCKS)
--   - Executes standalone top-level ALTER TYPE ... ADD VALUE IF NOT EXISTS.
--   - Satisfies PostgreSQL requirement that ALTER TYPE ... ADD VALUE cannot
--     run from a function or DO block, and ensures new labels are committed
--     before the transactional schema phase attaches table defaults.
--
-- PHASE 3: ATOMIC MAIN SCHEMA DDL TRANSACTION (BEGIN ... COMMIT)
--   - Block 1: Preflight Data Integrity Assertions (Guarded Dynamic SQL)
--   - Block 2: Extension ("uuid-ossp")
--   - Block 3: Complete 13-Table DDL in Strict Dependency Order
--   - Block 4: Defensive Additive Column Alignment (ALTER TABLE ADD COLUMN)
--   - Block 5: Defensive Constraint & Foreign Key Repair (pg_constraint guards)
--   - Block 6: Non-Redundant Performance Indexes
--   - Block 7: Deep Post-Migration Schema & Constraint Assertions
--
-- CORE PRINCIPLES & SAFEGUARDS:
-- 1. STRICTLY NON-DESTRUCTIVE:
--    - Zero DROP TABLE, DROP TYPE, DROP COLUMN, DROP CONSTRAINT, or TRUNCATE.
--    - Zero data conversion or destruction; all existing records are preserved.
-- 2. DUAL-COMPATIBLE (FRESH & EXISTING):
--    - Fresh DB: Preflight dynamic checks succeed without compiling non-existent tables.
--    - Existing DB: Repairs missing columns, foreign keys, and unique constraints.
-- 3. PREFLIGHT CONFLICT & ORPHAN GUARDS:
--    - Inspects all 18 foreign key relationships using guarded dynamic SQL.
--    - Verifies unique column candidates have no duplicates before attaching constraints.
--    - Aborts immediately via RAISE EXCEPTION on referential or unique conflicts.
-- 4. CREDENTIAL PRIVACY:
--    - Zero admin user credentials or passwords embedded in this file.
-- ==============================================================================


-- ==============================================================================
-- PHASE 1: ENSURE ALL 8 CUSTOM ENUM TYPES EXIST IN PG_TYPE
-- ==============================================================================
-- Uses conditional DO $$ blocks to create each enum type if it does not yet exist.
-- On a fresh database, each type is created immediately with all authoritative labels.
-- On an existing database where the type already exists, this block safely skips.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'publish_status') THEN
        CREATE TYPE publish_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'UNAVAILABLE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'EDITOR');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
        CREATE TYPE asset_type AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'release_type') THEN
        CREATE TYPE release_type AS ENUM ('single', 'ep', 'album');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_role') THEN
        CREATE TYPE credit_role AS ENUM ('FEATURING', 'PRODUCER', 'WRITER', 'ENGINEER', 'DIRECTOR');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gallery_post_type') THEN
        CREATE TYPE gallery_post_type AS ENUM ('image', 'video', 'carousel');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
        CREATE TYPE product_status AS ENUM (
            'PLANNED', 'PRE_LAUNCH', 'AVAILABLE', 'LIMITED', 'SOLD_OUT', 
            'DISCONTINUED', 'ARCHIVED', 'NEEDS_CONFIRMATION'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'action_type') THEN
        CREATE TYPE action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'ARCHIVE');
    END IF;
END $$;


-- ==============================================================================
-- PHASE 2: TOP-LEVEL ENUM LABEL REPAIR FOR PRE-EXISTING ENUMS
-- ==============================================================================
-- In PostgreSQL, ALTER TYPE ... ADD VALUE cannot be executed from inside a function
-- or DO block. Because Phase 1 guarantees all 8 types now exist in pg_type, the
-- following top-level statements safely append any missing labels to pre-existing
-- enums. On fresh databases, these are immediate no-ops since all values exist.

-- 1. publish_status
ALTER TYPE publish_status ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE publish_status ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE publish_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE publish_status ADD VALUE IF NOT EXISTS 'UNAVAILABLE';

-- 2. user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPERADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'EDITOR';

-- 3. asset_type
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'IMAGE';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'VIDEO';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'AUDIO';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'DOCUMENT';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'OTHER';

-- 4. release_type
ALTER TYPE release_type ADD VALUE IF NOT EXISTS 'single';
ALTER TYPE release_type ADD VALUE IF NOT EXISTS 'ep';
ALTER TYPE release_type ADD VALUE IF NOT EXISTS 'album';

-- 5. credit_role
ALTER TYPE credit_role ADD VALUE IF NOT EXISTS 'FEATURING';
ALTER TYPE credit_role ADD VALUE IF NOT EXISTS 'PRODUCER';
ALTER TYPE credit_role ADD VALUE IF NOT EXISTS 'WRITER';
ALTER TYPE credit_role ADD VALUE IF NOT EXISTS 'ENGINEER';
ALTER TYPE credit_role ADD VALUE IF NOT EXISTS 'DIRECTOR';

-- 6. gallery_post_type
ALTER TYPE gallery_post_type ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE gallery_post_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE gallery_post_type ADD VALUE IF NOT EXISTS 'carousel';

-- 7. product_status
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'PLANNED';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'PRE_LAUNCH';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'AVAILABLE';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'LIMITED';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'SOLD_OUT';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'DISCONTINUED';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'NEEDS_CONFIRMATION';

-- 8. action_type
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'CREATE';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'UPDATE';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'DELETE';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'PUBLISH';
ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'ARCHIVE';


-- ==============================================================================
-- PHASE 3: ATOMIC MAIN SCHEMA DDL TRANSACTION
-- ==============================================================================
-- All structural changes, constraints, and indexes execute within a single transaction.
-- If any preflight assertion, table DDL, or constraint creation fails, all changes
-- in Phase 3 are rolled back atomically, leaving the database completely intact.

BEGIN;

-- ------------------------------------------------------------------------------
-- BLOCK 1: PREFLIGHT INTEGRITY & ORPHAN CHECKS (DYNAMIC SQL)
-- ------------------------------------------------------------------------------
-- Uses guarded dynamic SQL (EXECUTE) so queries referencing tables or columns
-- are NEVER evaluated at PL/pgSQL compile time on fresh/empty databases.
-- If pre-existing tables have orphaned foreign keys, the migration immediately aborts.

DO $$
DECLARE
    orphan_cnt INT := 0;
BEGIN
    -- 1. releases.cover_asset_id -> media_assets.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'releases' AND column_name = 'cover_asset_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_assets') THEN
        EXECUTE 'SELECT count(*) FROM releases WHERE cover_asset_id IS NOT NULL AND cover_asset_id NOT IN (SELECT id FROM media_assets)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned cover_asset_id references in releases table.', orphan_cnt;
        END IF;
    END IF;

    -- 2. tracks.release_id -> releases.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'release_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'releases') THEN
        EXECUTE 'SELECT count(*) FROM tracks WHERE release_id NOT IN (SELECT id FROM releases)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned release_id references in tracks table.', orphan_cnt;
        END IF;
    END IF;

    -- 3. track_credits.track_id -> tracks.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'track_credits' AND column_name = 'track_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tracks') THEN
        EXECUTE 'SELECT count(*) FROM track_credits WHERE track_id NOT IN (SELECT id FROM tracks)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned track_id references in track_credits table.', orphan_cnt;
        END IF;
    END IF;

    -- 4. beats.audio_asset_id -> media_assets.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beats' AND column_name = 'audio_asset_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_assets') THEN
        EXECUTE 'SELECT count(*) FROM beats WHERE audio_asset_id IS NOT NULL AND audio_asset_id NOT IN (SELECT id FROM media_assets)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned audio_asset_id references in beats table.', orphan_cnt;
        END IF;
    END IF;

    -- 5. beats.image_asset_id -> media_assets.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beats' AND column_name = 'image_asset_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_assets') THEN
        EXECUTE 'SELECT count(*) FROM beats WHERE image_asset_id IS NOT NULL AND image_asset_id NOT IN (SELECT id FROM media_assets)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned image_asset_id references in beats table.', orphan_cnt;
        END IF;
    END IF;

    -- 6. beats.video_asset_id -> media_assets.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beats' AND column_name = 'video_asset_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_assets') THEN
        EXECUTE 'SELECT count(*) FROM beats WHERE video_asset_id IS NOT NULL AND video_asset_id NOT IN (SELECT id FROM media_assets)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned video_asset_id references in beats table.', orphan_cnt;
        END IF;
    END IF;

    -- 7. music_videos.related_release_id -> releases.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'music_videos' AND column_name = 'related_release_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'releases') THEN
        EXECUTE 'SELECT count(*) FROM music_videos WHERE related_release_id IS NOT NULL AND related_release_id NOT IN (SELECT id FROM releases)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned related_release_id references in music_videos table.', orphan_cnt;
        END IF;
    END IF;

    -- 8. music_videos.related_track_id -> tracks.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'music_videos' AND column_name = 'related_track_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tracks') THEN
        EXECUTE 'SELECT count(*) FROM music_videos WHERE related_track_id IS NOT NULL AND related_track_id NOT IN (SELECT id FROM tracks)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned related_track_id references in music_videos table.', orphan_cnt;
        END IF;
    END IF;

    -- 9. music_video_features.video_id -> music_videos.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'music_video_features' AND column_name = 'video_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music_videos') THEN
        EXECUTE 'SELECT count(*) FROM music_video_features WHERE video_id NOT IN (SELECT id FROM music_videos)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned video_id references in music_video_features table.', orphan_cnt;
        END IF;
    END IF;

    -- 10. gallery_posts.primary_asset_id -> media_assets.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_posts' AND column_name = 'primary_asset_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_assets') THEN
        EXECUTE 'SELECT count(*) FROM gallery_posts WHERE primary_asset_id IS NOT NULL AND primary_asset_id NOT IN (SELECT id FROM media_assets)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned primary_asset_id references in gallery_posts table.', orphan_cnt;
        END IF;
    END IF;

    -- 11. gallery_posts.related_release_id -> releases.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_posts' AND column_name = 'related_release_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'releases') THEN
        EXECUTE 'SELECT count(*) FROM gallery_posts WHERE related_release_id IS NOT NULL AND related_release_id NOT IN (SELECT id FROM releases)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned related_release_id references in gallery_posts table.', orphan_cnt;
        END IF;
    END IF;

    -- 12. gallery_posts.related_track_id -> tracks.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_posts' AND column_name = 'related_track_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tracks') THEN
        EXECUTE 'SELECT count(*) FROM gallery_posts WHERE related_track_id IS NOT NULL AND related_track_id NOT IN (SELECT id FROM tracks)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned related_track_id references in gallery_posts table.', orphan_cnt;
        END IF;
    END IF;

    -- 13. gallery_posts.related_beat_id -> beats.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_posts' AND column_name = 'related_beat_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'beats') THEN
        EXECUTE 'SELECT count(*) FROM gallery_posts WHERE related_beat_id IS NOT NULL AND related_beat_id NOT IN (SELECT id FROM beats)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned related_beat_id references in gallery_posts table.', orphan_cnt;
        END IF;
    END IF;

    -- 14. gallery_slides.post_id -> gallery_posts.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_slides' AND column_name = 'post_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gallery_posts') THEN
        EXECUTE 'SELECT count(*) FROM gallery_slides WHERE post_id NOT IN (SELECT id FROM gallery_posts)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned post_id references in gallery_slides table.', orphan_cnt;
        END IF;
    END IF;

    -- 15. gallery_slides.asset_id -> media_assets.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_slides' AND column_name = 'asset_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_assets') THEN
        EXECUTE 'SELECT count(*) FROM gallery_slides WHERE asset_id NOT IN (SELECT id FROM media_assets)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned asset_id references in gallery_slides table.', orphan_cnt;
        END IF;
    END IF;

    -- 16. merchandise.primary_asset_id -> media_assets.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'merchandise' AND column_name = 'primary_asset_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_assets') THEN
        EXECUTE 'SELECT count(*) FROM merchandise WHERE primary_asset_id IS NOT NULL AND primary_asset_id NOT IN (SELECT id FROM media_assets)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned primary_asset_id references in merchandise table.', orphan_cnt;
        END IF;
    END IF;

    -- 17. media_assets.uploaded_by -> admin_users.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'media_assets' AND column_name = 'uploaded_by')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
        EXECUTE 'SELECT count(*) FROM media_assets WHERE uploaded_by IS NOT NULL AND uploaded_by NOT IN (SELECT id FROM admin_users)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned uploaded_by references in media_assets table.', orphan_cnt;
        END IF;
    END IF;

    -- 18. audit_logs.user_id -> admin_users.id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
        EXECUTE 'SELECT count(*) FROM audit_logs WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM admin_users)' INTO orphan_cnt;
        IF orphan_cnt > 0 THEN
            RAISE EXCEPTION '[PREFLIGHT ABORT] Found % orphaned user_id references in audit_logs table.', orphan_cnt;
        END IF;
    END IF;

    RAISE NOTICE '[PREFLIGHT PASSED] All 18 referential integrity checks passed cleanly.';
END $$;


-- ------------------------------------------------------------------------------
-- BLOCK 2: EXTENSIONS
-- ------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ------------------------------------------------------------------------------
-- BLOCK 3: TABLE DEFINITIONS IN STRICT DEPENDENCY ORDER
-- ------------------------------------------------------------------------------

-- Table 1: admin_users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role DEFAULT 'EDITOR',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: media_assets
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    r2_key VARCHAR(512) UNIQUE NOT NULL,
    original_filename VARCHAR(255),
    asset_type asset_type NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    width INT,
    height INT,
    duration_seconds FLOAT,
    alt_text VARCHAR(255),
    blurhash VARCHAR(100),
    uploaded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: releases
CREATE TABLE IF NOT EXISTS releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    legacy_slug VARCHAR(255) UNIQUE,
    number INT,
    title VARCHAR(255) NOT NULL,
    edition INT DEFAULT 1,
    release_date DATE NOT NULL,
    display_date VARCHAR(100),
    type release_type NOT NULL,
    primary_artist VARCHAR(255) DEFAULT 'silachomka',
    feats_silachomka BOOLEAN DEFAULT false,
    produced_by_silachomka BOOLEAN DEFAULT false,
    description TEXT,
    cover_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    sources JSONB,
    platforms JSONB,
    status publish_status DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: tracks
CREATE TABLE IF NOT EXISTS tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    track_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    platforms JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(release_id, track_number)
);

-- Table 5: track_credits
CREATE TABLE IF NOT EXISTS track_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    credit_name VARCHAR(255) NOT NULL,
    role credit_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(track_id, credit_name, role)
);

-- Table 6: beats
CREATE TABLE IF NOT EXISTS beats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    legacy_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    short_genre VARCHAR(100),
    categories JSONB,
    bpm VARCHAR(50),
    beat_key VARCHAR(50),
    description TEXT,
    mood VARCHAR(100),
    producer VARCHAR(255) DEFAULT 'silachomka',
    preview_info TEXT,
    audio_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    image_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    video_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
    selar_basic_url VARCHAR(512),
    selar_premium_url VARCHAR(512),
    selar_ultimate_url VARCHAR(512),
    status publish_status DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 7: music_videos
CREATE TABLE IF NOT EXISTS music_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    legacy_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    category VARCHAR(100) DEFAULT 'Visualizer',
    youtube_id VARCHAR(50) NOT NULL,
    youtube_url VARCHAR(512) NOT NULL,
    aspect_ratio VARCHAR(20) DEFAULT '16:9',
    platforms JSONB,
    related_release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
    related_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    status publish_status DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 8: music_video_features
CREATE TABLE IF NOT EXISTS music_video_features (
    video_id UUID NOT NULL REFERENCES music_videos(id) ON DELETE CASCADE,
    artist_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (video_id, artist_name)
);

-- Table 9: gallery_posts
CREATE TABLE IF NOT EXISTS gallery_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    legacy_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    caption TEXT,
    category VARCHAR(100) DEFAULT 'portraits',
    post_type gallery_post_type NOT NULL,
    primary_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    related_release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
    related_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    related_beat_id UUID REFERENCES beats(id) ON DELETE SET NULL,
    legacy_link VARCHAR(512),
    tags JSONB,
    post_date DATE NOT NULL,
    display_date VARCHAR(100),
    status publish_status DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 10: gallery_slides
CREATE TABLE IF NOT EXISTS gallery_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES gallery_posts(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    sort_order INT NOT NULL,
    slide_type VARCHAR(50) DEFAULT 'image',
    UNIQUE(post_id, sort_order)
);

-- Table 11: merchandise
CREATE TABLE IF NOT EXISTS merchandise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    price_cents INT,
    currency VARCHAR(3),
    selar_url VARCHAR(512),
    status product_status DEFAULT 'PLANNED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 12: social_links
CREATE TABLE IF NOT EXISTS social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    handle VARCHAR(100),
    url VARCHAR(512) NOT NULL,
    platform VARCHAR(50),
    category VARCHAR(50),
    role VARCHAR(100),
    link_type VARCHAR(50) DEFAULT 'ARTIST',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, link_type)
);

-- Table 13: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action action_type NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------------------------
-- BLOCK 4: DEFENSIVE COLUMN ALIGNMENT (FOR PRE-EXISTING TABLES)
-- ------------------------------------------------------------------------------

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'EDITOR';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS width INT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS height INT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS duration_seconds FLOAT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS alt_text VARCHAR(255);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS blurhash VARCHAR(100);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE releases ADD COLUMN IF NOT EXISTS legacy_slug VARCHAR(255);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS number INT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS edition INT DEFAULT 1;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS display_date VARCHAR(100);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS primary_artist VARCHAR(255) DEFAULT 'silachomka';
ALTER TABLE releases ADD COLUMN IF NOT EXISTS feats_silachomka BOOLEAN DEFAULT false;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS produced_by_silachomka BOOLEAN DEFAULT false;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_asset_id UUID;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS sources JSONB;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS platforms JSONB;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS status publish_status DEFAULT 'PUBLISHED';
ALTER TABLE releases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS platforms JSONB;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE beats ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS genre VARCHAR(100);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS short_genre VARCHAR(100);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS categories JSONB;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS bpm VARCHAR(50);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS beat_key VARCHAR(50);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS mood VARCHAR(100);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS producer VARCHAR(255) DEFAULT 'silachomka';
ALTER TABLE beats ADD COLUMN IF NOT EXISTS preview_info TEXT;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS audio_asset_id UUID;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS image_asset_id UUID;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS video_asset_id UUID;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS selar_basic_url VARCHAR(512);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS selar_premium_url VARCHAR(512);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS selar_ultimate_url VARCHAR(512);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS status publish_status DEFAULT 'PUBLISHED';
ALTER TABLE beats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255);
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Visualizer';
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS aspect_ratio VARCHAR(20) DEFAULT '16:9';
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS platforms JSONB;
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS related_release_id UUID;
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS related_track_id UUID;
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS status publish_status DEFAULT 'PUBLISHED';
ALTER TABLE music_videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS legacy_id VARCHAR(255);
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'portraits';
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS primary_asset_id UUID;
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS related_release_id UUID;
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS related_track_id UUID;
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS related_beat_id UUID;
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS legacy_link VARCHAR(512);
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS display_date VARCHAR(100);
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS status publish_status DEFAULT 'PUBLISHED';
ALTER TABLE gallery_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE gallery_slides ADD COLUMN IF NOT EXISTS slide_type VARCHAR(50) DEFAULT 'image';

ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS primary_asset_id UUID;
ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS price_cents INT;
ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS selar_url VARCHAR(512);
ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS status product_status DEFAULT 'PLANNED';
ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE social_links ADD COLUMN IF NOT EXISTS handle VARCHAR(100);
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS role VARCHAR(100);
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS link_type VARCHAR(50) DEFAULT 'ARTIST';
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE social_links ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- ------------------------------------------------------------------------------
-- BLOCK 5: DEFENSIVE CONSTRAINT & FOREIGN KEY REPAIR
-- ------------------------------------------------------------------------------
-- If tables pre-existed without foreign keys or unique constraints, safely attach
-- constraints checking pg_constraint first. Validates unique columns have no duplicates.

DO $$
DECLARE
    dup_cnt INT := 0;
BEGIN
    -- 1. Unique: releases.legacy_slug
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'releases' AND column_name = 'legacy_slug') THEN
        EXECUTE 'SELECT count(*) - count(DISTINCT legacy_slug) FROM releases WHERE legacy_slug IS NOT NULL' INTO dup_cnt;
        IF dup_cnt > 0 THEN
            RAISE EXCEPTION '[CONSTRAINT ABORT] Cannot add UNIQUE constraint: % duplicate legacy_slug in releases.', dup_cnt;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'releases_legacy_slug_key') THEN
            ALTER TABLE releases ADD CONSTRAINT releases_legacy_slug_key UNIQUE (legacy_slug);
        END IF;
    END IF;

    -- 2. Unique: beats.legacy_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beats' AND column_name = 'legacy_id') THEN
        EXECUTE 'SELECT count(*) - count(DISTINCT legacy_id) FROM beats WHERE legacy_id IS NOT NULL' INTO dup_cnt;
        IF dup_cnt > 0 THEN
            RAISE EXCEPTION '[CONSTRAINT ABORT] Cannot add UNIQUE constraint: % duplicate legacy_id in beats.', dup_cnt;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beats_legacy_id_key') THEN
            ALTER TABLE beats ADD CONSTRAINT beats_legacy_id_key UNIQUE (legacy_id);
        END IF;
    END IF;

    -- 3. Unique: music_videos.legacy_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'music_videos' AND column_name = 'legacy_id') THEN
        EXECUTE 'SELECT count(*) - count(DISTINCT legacy_id) FROM music_videos WHERE legacy_id IS NOT NULL' INTO dup_cnt;
        IF dup_cnt > 0 THEN
            RAISE EXCEPTION '[CONSTRAINT ABORT] Cannot add UNIQUE constraint: % duplicate legacy_id in music_videos.', dup_cnt;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_videos_legacy_id_key') THEN
            ALTER TABLE music_videos ADD CONSTRAINT music_videos_legacy_id_key UNIQUE (legacy_id);
        END IF;
    END IF;

    -- 4. Unique: gallery_posts.legacy_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_posts' AND column_name = 'legacy_id') THEN
        EXECUTE 'SELECT count(*) - count(DISTINCT legacy_id) FROM gallery_posts WHERE legacy_id IS NOT NULL' INTO dup_cnt;
        IF dup_cnt > 0 THEN
            RAISE EXCEPTION '[CONSTRAINT ABORT] Cannot add UNIQUE constraint: % duplicate legacy_id in gallery_posts.', dup_cnt;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_posts_legacy_id_key') THEN
            ALTER TABLE gallery_posts ADD CONSTRAINT gallery_posts_legacy_id_key UNIQUE (legacy_id);
        END IF;
    END IF;

    -- 5. Foreign Key: releases.cover_asset_id -> media_assets.id (ON DELETE RESTRICT)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'releases_cover_asset_id_fkey') THEN
        ALTER TABLE releases ADD CONSTRAINT releases_cover_asset_id_fkey 
          FOREIGN KEY (cover_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT;
    END IF;

    -- 6. Foreign Key: tracks.release_id -> releases.id (ON DELETE CASCADE)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_release_id_fkey') THEN
        ALTER TABLE tracks ADD CONSTRAINT tracks_release_id_fkey 
          FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE;
    END IF;

    -- 7. Foreign Key: track_credits.track_id -> tracks.id (ON DELETE CASCADE)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_credits_track_id_fkey') THEN
        ALTER TABLE track_credits ADD CONSTRAINT track_credits_track_id_fkey 
          FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE;
    END IF;

    -- 8. Foreign Keys: beats assets
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beats_audio_asset_id_fkey') THEN
        ALTER TABLE beats ADD CONSTRAINT beats_audio_asset_id_fkey 
          FOREIGN KEY (audio_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beats_image_asset_id_fkey') THEN
        ALTER TABLE beats ADD CONSTRAINT beats_image_asset_id_fkey 
          FOREIGN KEY (image_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beats_video_asset_id_fkey') THEN
        ALTER TABLE beats ADD CONSTRAINT beats_video_asset_id_fkey 
          FOREIGN KEY (video_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;
    END IF;

    -- 9. Foreign Keys: music_videos relations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_videos_related_release_id_fkey') THEN
        ALTER TABLE music_videos ADD CONSTRAINT music_videos_related_release_id_fkey 
          FOREIGN KEY (related_release_id) REFERENCES releases(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_videos_related_track_id_fkey') THEN
        ALTER TABLE music_videos ADD CONSTRAINT music_videos_related_track_id_fkey 
          FOREIGN KEY (related_track_id) REFERENCES tracks(id) ON DELETE SET NULL;
    END IF;

    -- 10. Foreign Key: music_video_features.video_id -> music_videos.id (ON DELETE CASCADE)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_video_features_video_id_fkey') THEN
        ALTER TABLE music_video_features ADD CONSTRAINT music_video_features_video_id_fkey 
          FOREIGN KEY (video_id) REFERENCES music_videos(id) ON DELETE CASCADE;
    END IF;

    -- 11. Foreign Keys: gallery_posts relations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_posts_primary_asset_id_fkey') THEN
        ALTER TABLE gallery_posts ADD CONSTRAINT gallery_posts_primary_asset_id_fkey 
          FOREIGN KEY (primary_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_posts_related_release_id_fkey') THEN
        ALTER TABLE gallery_posts ADD CONSTRAINT gallery_posts_related_release_id_fkey 
          FOREIGN KEY (related_release_id) REFERENCES releases(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_posts_related_track_id_fkey') THEN
        ALTER TABLE gallery_posts ADD CONSTRAINT gallery_posts_related_track_id_fkey 
          FOREIGN KEY (related_track_id) REFERENCES tracks(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_posts_related_beat_id_fkey') THEN
        ALTER TABLE gallery_posts ADD CONSTRAINT gallery_posts_related_beat_id_fkey 
          FOREIGN KEY (related_beat_id) REFERENCES beats(id) ON DELETE SET NULL;
    END IF;

    -- 12. Foreign Keys: gallery_slides relations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_slides_post_id_fkey') THEN
        ALTER TABLE gallery_slides ADD CONSTRAINT gallery_slides_post_id_fkey 
          FOREIGN KEY (post_id) REFERENCES gallery_posts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_slides_asset_id_fkey') THEN
        ALTER TABLE gallery_slides ADD CONSTRAINT gallery_slides_asset_id_fkey 
          FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT;
    END IF;

    -- 13. Foreign Key: merchandise.primary_asset_id (ON DELETE RESTRICT)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchandise_primary_asset_id_fkey') THEN
        ALTER TABLE merchandise ADD CONSTRAINT merchandise_primary_asset_id_fkey 
          FOREIGN KEY (primary_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT;
    END IF;

    -- 14. Foreign Key: media_assets.uploaded_by (ON DELETE SET NULL)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_uploaded_by_fkey') THEN
        ALTER TABLE media_assets ADD CONSTRAINT media_assets_uploaded_by_fkey 
          FOREIGN KEY (uploaded_by) REFERENCES admin_users(id) ON DELETE SET NULL;
    END IF;

    -- 15. Foreign Key: audit_logs.user_id (ON DELETE SET NULL)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey') THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL;
    END IF;

    -- 16. Composite unique constraints on child tables
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_release_id_track_number_key') THEN
        ALTER TABLE tracks ADD CONSTRAINT tracks_release_id_track_number_key UNIQUE (release_id, track_number);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_credits_track_id_credit_name_role_key') THEN
        ALTER TABLE track_credits ADD CONSTRAINT track_credits_track_id_credit_name_role_key UNIQUE (track_id, credit_name, role);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_slides_post_id_sort_order_key') THEN
        ALTER TABLE gallery_slides ADD CONSTRAINT gallery_slides_post_id_sort_order_key UNIQUE (post_id, sort_order);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_links_name_link_type_key') THEN
        ALTER TABLE social_links ADD CONSTRAINT social_links_name_link_type_key UNIQUE (name, link_type);
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- BLOCK 6: PERFORMANCE INDEXES (NON-REDUNDANT)
-- ------------------------------------------------------------------------------
-- Note: media_assets(r2_key) is intentionally omitted here as r2_key already has
-- a dedicated unique B-tree index created by its UNIQUE column constraint.

CREATE INDEX IF NOT EXISTS idx_releases_status_date ON releases(status, release_date DESC);
CREATE INDEX IF NOT EXISTS idx_beats_status_date ON beats(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_status_date ON gallery_posts(status, post_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);


-- ------------------------------------------------------------------------------
-- BLOCK 7: DEEP POST-MIGRATION SCHEMA & CONSTRAINT ASSERTIONS
-- ------------------------------------------------------------------------------
-- Rigorously validates table presence, essential column presence, custom enums,
-- and critical foreign key referential rules matching worker/db/verify-schema.js.

DO $$
DECLARE
    missing_count INT := 0;
    missing_list TEXT := '';
BEGIN
    -- 1. Validate all 13 Tables exist
    SELECT count(*), string_agg(expected_table, ', ') 
    INTO missing_count, missing_list
    FROM (
        SELECT unnest(ARRAY[
            'admin_users', 'media_assets', 'releases', 'tracks', 'track_credits',
            'beats', 'music_videos', 'music_video_features', 'gallery_posts',
            'gallery_slides', 'merchandise', 'social_links', 'audit_logs'
        ]) AS expected_table
    ) e
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = e.expected_table
    );

    IF missing_count > 0 THEN
        RAISE EXCEPTION '[VERIFICATION FAILED] Missing tables: %', missing_list;
    END IF;

    -- 2. Validate all 8 Custom Enums exist
    SELECT count(*), string_agg(expected_enum, ', ') 
    INTO missing_count, missing_list
    FROM (
        SELECT unnest(ARRAY[
            'publish_status', 'user_role', 'asset_type', 'release_type',
            'credit_role', 'gallery_post_type', 'product_status', 'action_type'
        ]) AS expected_enum
    ) e
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = e.expected_enum
    );

    IF missing_count > 0 THEN
        RAISE EXCEPTION '[VERIFICATION FAILED] Missing custom enums: %', missing_list;
    END IF;

    -- 3. Validate Critical Structural Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'email')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'releases' AND column_name = 'slug')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'release_id')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'track_credits' AND column_name = 'track_id')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beats' AND column_name = 'slug')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'music_videos' AND column_name = 'slug')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gallery_posts' AND column_name = 'slug')
       OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'media_assets' AND column_name = 'r2_key') THEN
        RAISE EXCEPTION '[VERIFICATION FAILED] Key structural columns missing on required tables.';
    END IF;

    -- 4. Validate Critical Cascading Foreign Keys
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tracks_release_id_fkey')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'track_credits_track_id_fkey')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_video_features_video_id_fkey')
       OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gallery_slides_post_id_fkey') THEN
        RAISE EXCEPTION '[VERIFICATION FAILED] Critical CASCADE foreign key constraints missing.';
    END IF;

    RAISE NOTICE '[VERIFICATION PASSED] All 13 tables, 8 enums, columns, and constraints verified successfully.';
END $$;

-- ============================================================================
-- STAGE 25 MIGRATION: PREVIEW AUDIO & GALLERY SOCIAL POST ELIGIBILITY
-- ============================================================================
ALTER TABLE releases 
ADD COLUMN IF NOT EXISTS preview_asset_id UUID REFERENCES media_assets(id);

ALTER TABLE social_links 
ADD COLUMN IF NOT EXISTS show_on_gallery_posts BOOLEAN DEFAULT false;

COMMIT;

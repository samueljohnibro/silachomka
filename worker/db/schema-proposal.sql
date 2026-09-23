-- worker/db/schema-proposal.sql
-- Proposed PostgreSQL Schema for Silachomka Admin CMS (V1)
-- Designed for Neon PostgreSQL

-- ==========================================
-- IDEMPOTENCY / SAFE REPEATABILITY
-- ==========================================
-- Safely drop tables and types if they exist so the script can be rerun during development
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS social_links CASCADE;
DROP TABLE IF EXISTS merchandise CASCADE;
DROP TABLE IF EXISTS gallery_slides CASCADE;
DROP TABLE IF EXISTS gallery_posts CASCADE;
DROP TABLE IF EXISTS music_video_features CASCADE;
DROP TABLE IF EXISTS music_videos CASCADE;
DROP TABLE IF EXISTS beats CASCADE;
DROP TABLE IF EXISTS track_credits CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS releases CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

DROP TYPE IF EXISTS publish_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS asset_type CASCADE;
DROP TYPE IF EXISTS release_type CASCADE;
DROP TYPE IF EXISTS credit_role CASCADE;
DROP TYPE IF EXISTS gallery_post_type CASCADE;
DROP TYPE IF EXISTS product_status CASCADE;
DROP TYPE IF EXISTS action_type CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS & DOMAINS
-- ==========================================
CREATE TYPE publish_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'UNAVAILABLE');
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'EDITOR');
CREATE TYPE asset_type AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER');
CREATE TYPE release_type AS ENUM ('single', 'ep', 'album');
CREATE TYPE credit_role AS ENUM ('FEATURING', 'PRODUCER', 'WRITER', 'ENGINEER', 'DIRECTOR');
CREATE TYPE gallery_post_type AS ENUM ('image', 'video', 'carousel');
CREATE TYPE product_status AS ENUM (
    'PLANNED', 
    'PRE_LAUNCH', 
    'AVAILABLE', 
    'LIMITED', 
    'SOLD_OUT', 
    'DISCONTINUED', 
    'ARCHIVED', 
    'NEEDS_CONFIRMATION'
);
CREATE TYPE action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'ARCHIVE');

-- ==========================================
-- 2. ADMIN USERS & AUTH
-- ==========================================
-- Auth implementation is deferred, but table exists for foreign keys and audit logs
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable temporarily pending auth design
    role user_role DEFAULT 'EDITOR',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. MEDIA ASSETS (R2 References)
-- ==========================================
-- True reusable media library mapping to Cloudflare R2
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    r2_key VARCHAR(512) UNIQUE NOT NULL,
    original_filename VARCHAR(255),
    asset_type asset_type NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    width INT,               -- For images/videos
    height INT,              -- For images/videos
    duration_seconds FLOAT,  -- For audio/videos
    alt_text VARCHAR(255),
    blurhash VARCHAR(100),
    uploaded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. MUSIC RELEASES & TRACKS
-- ==========================================
CREATE TABLE releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL, -- Current public identifier
    legacy_slug VARCHAR(255) UNIQUE,   -- Preserved from src/data migration
    number INT,
    title VARCHAR(255) NOT NULL,
    edition INT DEFAULT 1,
    release_date DATE NOT NULL,
    display_date VARCHAR(100),
    type release_type NOT NULL,
    primary_artist VARCHAR(255) DEFAULT 'silachomka',
    feats_silachomka BOOLEAN DEFAULT false,    -- Preserved from src/data
    produced_by_silachomka BOOLEAN DEFAULT false, -- Preserved from src/data
    description TEXT,
    cover_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    sources JSONB,
    platforms JSONB,
    status publish_status DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
    track_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    platforms JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(release_id, track_number)
);

CREATE TABLE track_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    credit_name VARCHAR(255) NOT NULL,
    role credit_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(track_id, credit_name, role)
);

-- ==========================================
-- 5. BEATS (Studio Store)
-- ==========================================
CREATE TABLE beats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL, -- Current public identifier
    legacy_id VARCHAR(255) UNIQUE,     -- Preserved from src/data migration
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    short_genre VARCHAR(100),
    categories JSONB,
    bpm VARCHAR(50),
    beat_key VARCHAR(50),
    description TEXT,                  -- Preserved business logic
    mood VARCHAR(100),                 -- Preserved business logic
    producer VARCHAR(255) DEFAULT 'silachomka',
    preview_info TEXT,                 -- Metadata for preview audio behavior
    audio_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    image_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    video_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
    selar_basic_url VARCHAR(512),      -- Preserved exactly as in src/data
    selar_premium_url VARCHAR(512),
    selar_ultimate_url VARCHAR(512),
    status publish_status DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. MUSIC VIDEOS & CINEMA
-- ==========================================
CREATE TABLE music_videos (
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

CREATE TABLE music_video_features (
    video_id UUID NOT NULL REFERENCES music_videos(id) ON DELETE CASCADE,
    artist_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (video_id, artist_name)
);

-- ==========================================
-- 7. GALLERY & VISUAL ARCHIVE
-- ==========================================
CREATE TABLE gallery_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    legacy_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    caption TEXT,
    category VARCHAR(100) DEFAULT 'portraits',
    post_type gallery_post_type NOT NULL,
    primary_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    -- Replaces raw link with proper relational mapping
    related_release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
    related_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
    related_beat_id UUID REFERENCES beats(id) ON DELETE SET NULL,
    legacy_link VARCHAR(512), -- Retained for unsupported legacy links
    tags JSONB,
    post_date DATE NOT NULL,
    display_date VARCHAR(100),
    status publish_status DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- For carousel posts
CREATE TABLE gallery_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES gallery_posts(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    sort_order INT NOT NULL,
    slide_type VARCHAR(50) DEFAULT 'image',
    UNIQUE(post_id, sort_order)
);

-- ==========================================
-- 8. MERCHANDISE & COMMERCE
-- ==========================================
CREATE TABLE merchandise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_asset_id UUID REFERENCES media_assets(id) ON DELETE RESTRICT,
    price_cents INT,                  -- Nullable, avoids inventing pricing
    currency VARCHAR(3),              -- Nullable, avoids inventing defaults
    selar_url VARCHAR(512),
    status product_status DEFAULT 'PLANNED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. SOCIAL & ECOSYSTEM LINKS
-- ==========================================
CREATE TABLE social_links (
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

-- ==========================================
-- 10. AUDIT LOGS
-- ==========================================
CREATE TABLE audit_logs (
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

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_releases_status_date ON releases(status, release_date DESC);
CREATE INDEX idx_beats_status_date ON beats(status, created_at DESC);
CREATE INDEX idx_gallery_posts_status_date ON gallery_posts(status, post_date DESC);
CREATE INDEX idx_media_assets_r2_key ON media_assets(r2_key);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

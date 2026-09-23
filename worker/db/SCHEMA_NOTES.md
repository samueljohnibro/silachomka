# Silachomka CMS: PostgreSQL Schema Design Notes (V1)

This document explains the design decisions, relational mapping, and migration strategy for moving the existing `src/data` mock-database to a production-grade Neon PostgreSQL schema managed by the new Cloudflare Worker Admin API.

## Core Design Principles
1. **Factual Preservation**: Zero invented data. Prices, currencies, and licensing terms have been made strictly nullable unless they reflect current business facts. `feats_silachomka` and `produced_by_silachomka` boolean fields are explicitly retained exactly as they exist in legacy code.
2. **Identifier Separation**: Slugs used for current routing are decoupled from migration/legacy IDs. New CMS records will only require a `slug`, whereas migrated records populate `legacy_slug`/`legacy_id` to ensure existing URLs remain completely undisturbed.
3. **Safe Repeatability**: The schema script includes comprehensive `DROP TABLE IF EXISTS ... CASCADE` blocks allowing developers to run the SQL repeatedly without conflict during early dev phases.
4. **V1 Scope Strictness**: Multi-tenant features and Campaign structures have been excluded. Focus remains purely on the core Silachomka catalogue.

---

## Table Breakdown & Migratability

### 1. `media_assets`
*   **Why it exists**: Provides a true reusable Media Library. Severing the dependency on IndexedDB base64 strings, this table stores metadata (`width`, `height`, `duration_seconds`) for files physically hosted in Cloudflare R2 via `r2_key`.
*   **Relationships**: Used as foreign keys (`cover_asset_id`, `audio_asset_id`) across Releases, Beats, and Gallery. Protects against orphaned R2 files.
*   **Safety**: Uses `ON DELETE RESTRICT` for active media, preventing admins from accidentally breaking live site covers/audio.

### 2. `releases`, `tracks`, and `track_credits`
*   **Why it exists**: Maps 1:1 with `src/data/releases.js`.
*   **Preserved Fields**: Explicitly carries over `feats_silachomka` and `produced_by_silachomka`. 
*   **Relationships**: `releases` -> `tracks` (1:M). `tracks` -> `track_credits` (1:M). Array features/producers transform securely into relational `track_credits`.

### 3. `beats`
*   **Why it exists**: Maps to `src/data/beats.js` and expanding business requirements.
*   **Expanded Metadata**: Now natively supports `description`, `mood`, `producer`, and `preview_info` as per authoritative business logic, completely avoiding invented data.
*   **Commercial Mapping**: Exactly matches the legacy schema for `selar_basic_url`, `selar_premium_url`, `selar_ultimate_url` without forcing artificial pricing columns.

### 4. `gallery_posts` & `gallery_slides`
*   **Why it exists**: Maps to `src/data/gallery.js`.
*   **Link Upgrades**: The ambiguous `link` string field has been upgraded. It now maintains proper relational nullable FKs (`related_release_id`, `related_track_id`, `related_beat_id`), while keeping `legacy_link` to preserve string-based URLs that do not map to the database.

### 5. `merchandise`
*   **Why it exists**: Lays the foundation for physical/digital commerce states.
*   **Factual Restraint**: `price_cents` and `currency` are inherently nullable. No default assumptions (like USD) are made.
*   **Lifecycle**: The `product_status` enum strictly mirrors the business model (`PLANNED`, `PRE_LAUNCH`, `AVAILABLE`, `LIMITED`, `SOLD_OUT`, `DISCONTINUED`, `ARCHIVED`, `NEEDS_CONFIRMATION`).

### 6. `admin_users` & `audit_logs`
*   **Why it exists**: Core infrastructure for CMS safety.
*   **Current State**: Auth logic is actively deferred until an API/Session design is finalized. The password column is safely nullable in this iteration.

---

## Data Migration Strategy (Deferred)
*   **No immediate execution**. 
*   When approved, the mapping will rely entirely on the newly created `legacy_slug` and `legacy_id` columns to orchestrate seamless synchronization from `src/data/*.js` into Neon without disrupting public routes.

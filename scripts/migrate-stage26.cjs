// scripts/migrate-stage26.cjs
const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));

const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim();

async function migrate() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Connected to database. Running Stage 26 migrations...');

  // 1. tracks.preview_asset_id (Track-level preview audio for future releases)
  await client.query(`
    ALTER TABLE tracks
    ADD COLUMN IF NOT EXISTS preview_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL;
  `);
  console.log('Added preview_asset_id to tracks table.');

  // 2. gallery_posts external social post embedding columns
  await client.query(`
    ALTER TABLE gallery_posts
    ADD COLUMN IF NOT EXISTS external_social_url TEXT,
    ADD COLUMN IF NOT EXISTS external_social_platform VARCHAR(50);
  `);
  console.log('Added external_social_url and external_social_platform to gallery_posts table.');

  // 3. media_assets optimization & role distinction columns
  await client.query(`
    ALTER TABLE media_assets
    ADD COLUMN IF NOT EXISTS asset_role VARCHAR(50) DEFAULT 'OPTIMIZED_WEB',
    ADD COLUMN IF NOT EXISTS source_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS original_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS original_mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS optimization_status VARCHAR(50) DEFAULT 'OPTIMIZED',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `);
  console.log('Added optimization and asset_role columns to media_assets table.');

  await client.end();
  console.log('Stage 26 DB migration completed successfully.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

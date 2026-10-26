// scripts/migrate-stage25.cjs
const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));

const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim();

async function migrate() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Connected to database. Running Stage 25 migrations...');

  // 1. releases.preview_asset_id
  await client.query(`
    ALTER TABLE releases 
    ADD COLUMN IF NOT EXISTS preview_asset_id UUID REFERENCES media_assets(id);
  `);
  console.log('Added preview_asset_id to releases table.');

  // 2. social_links.show_on_gallery_posts
  await client.query(`
    ALTER TABLE social_links 
    ADD COLUMN IF NOT EXISTS show_on_gallery_posts BOOLEAN DEFAULT false;
  `);
  console.log('Added show_on_gallery_posts to social_links table.');

  // 3. Mark core Silachomka social links as eligible for gallery posts
  // Only silachomka's direct profiles (Instagram, X, Threads, TikTok, YouTube)
  const updateRes = await client.query(`
    UPDATE social_links 
    SET show_on_gallery_posts = true 
    WHERE name IN ('Instagram', 'X (Twitter)', 'Threads', 'TikTok', 'YouTube')
      AND url LIKE '%silachomka%'
    RETURNING id, name, url, show_on_gallery_posts;
  `);
  console.log('Enabled gallery eligibility for core artist social links:', updateRes.rows);

  await client.end();
  console.log('Stage 25 DB migration completed successfully.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

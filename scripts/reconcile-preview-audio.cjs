const fs = require('fs');
const path = require('path');
const { neon } = require(path.resolve(__dirname, '../worker/node_modules/@neondatabase/serverless'));

const devVars = fs.readFileSync(path.join(__dirname, '../worker/.dev.vars'), 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(dbUrl);

(async () => {
  // Clear legacy preview_asset_id on releases table where tracks have no preview audio
  const updated = await sql`
    UPDATE releases 
    SET preview_asset_id = NULL 
    WHERE slug = 'pipedown'
    RETURNING id, slug, preview_asset_id
  `;
  console.log('Cleared preview_asset_id on pipedown:', updated);

  // Check all future releases
  const rels = await sql`
    SELECT r.id, r.slug, r.title, r.preview_asset_id,
      (SELECT count(*) FROM tracks t WHERE t.release_id = r.id AND t.preview_asset_id IS NOT NULL AND t.deleted_at IS NULL) as track_preview_count
    FROM releases r
    WHERE r.release_date > NOW()
  `;
  console.log('Future releases and track preview counts:', rels);
})();

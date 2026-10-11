import fs from 'fs';
import pg from '../worker/node_modules/pg/lib/index.js';

const env = fs.readFileSync('worker/.dev.vars.staging', 'utf8');
const dbUrl = env.match(/STAGING_DATABASE_URL=([^\r\n]+)/)[1].trim();
const client = new pg.Client({ connectionString: dbUrl });

async function main() {
  await client.connect();

  const noisemaker = await client.query("SELECT id FROM releases WHERE slug = 'noisemaker'");
  const savage = await client.query("SELECT id FROM releases WHERE slug = 'savage'");

  if (noisemaker.rows[0]) {
    const res1 = await client.query(
      "UPDATE music_videos SET related_release_id = $1 WHERE title ILIKE '%facto%'",
      [noisemaker.rows[0].id]
    );
    console.log(`Updated facto visualizer -> NOISEMAKER (${res1.rowCount} rows)`);
  }

  if (savage.rows[0]) {
    const res2 = await client.query(
      "UPDATE music_videos SET related_release_id = $1 WHERE title ILIKE '%I%m the Man%'",
      [savage.rows[0].id]
    );
    console.log(`Updated I'm the Man visualizers -> SAVAGE. (${res2.rowCount} rows)`);
  }

  const check = await client.query("SELECT id, title, related_release_id FROM music_videos WHERE related_release_id IS NOT NULL");
  console.log('Linked videos:', check.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

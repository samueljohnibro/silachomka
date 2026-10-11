// scripts/link-prod-videos.cjs
const fs = require('fs');
const { Client } = require('../worker/node_modules/pg');

const prodUrl = fs.readFileSync('worker/.dev.vars', 'utf8').match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim();
const client = new Client({ connectionString: prodUrl });

async function main() {
  await client.connect();

  const noisemaker = await client.query("SELECT id FROM releases WHERE slug = 'noisemaker'");
  const savage = await client.query("SELECT id FROM releases WHERE slug = 'savage'");

  if (noisemaker.rows[0]) {
    const res1 = await client.query(
      "UPDATE music_videos SET related_release_id = $1 WHERE title ILIKE '%facto%' AND related_release_id IS NULL",
      [noisemaker.rows[0].id]
    );
    console.log(`Linked facto visualizer -> NOISEMAKER (${res1.rowCount} rows updated)`);
  }

  if (savage.rows[0]) {
    const res2 = await client.query(
      "UPDATE music_videos SET related_release_id = $1 WHERE title ILIKE '%I%m the Man%' AND related_release_id IS NULL",
      [savage.rows[0].id]
    );
    console.log(`Linked I'm the Man visualizers -> SAVAGE. (${res2.rowCount} rows updated)`);
  }

  const check = await client.query("SELECT id, title, related_release_id FROM music_videos WHERE related_release_id IS NOT NULL");
  console.log('Linked production videos:', check.rows);

  await client.end();
}

main().catch(console.error);

// scripts/check-prod-videos.cjs
const fs = require('fs');
const { Client } = require('../worker/node_modules/pg');

const prodUrl = fs.readFileSync('worker/.dev.vars', 'utf8').match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim();
const client = new Client({ connectionString: prodUrl });

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, title, related_release_id FROM music_videos');
  console.log('Production music_videos:', res.rows);
  await client.end();
}

main().catch(console.error);

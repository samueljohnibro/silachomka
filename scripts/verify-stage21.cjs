const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));

async function verifyStage21() {
  const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
  const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);
  if (!match) throw new Error('DATABASE_URL not found');

  const client = new Client({ connectionString: match[1].trim() });
  await client.connect();

  console.log('=====================================================');
  console.log(' STAGE 21 AUTOMATED VERIFICATION SUITE');
  console.log('=====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // --- 1. Beats Schema & Pricing Verification ---
  console.log('\n--- 1. Beats Schema & Pricing ---');
  const beatColumnsRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'beats' AND column_name IN ('price_basic', 'price_premium', 'price_exclusive');
  `);
  assert(beatColumnsRes.rows.length === 3, 'Beats table contains price_basic, price_premium, and price_exclusive columns');

  const beatsSample = await client.query(`
    SELECT title, genre, short_genre, price_basic, price_premium, price_exclusive 
    FROM beats WHERE deleted_at IS NULL LIMIT 5;
  `);
  for (const b of beatsSample.rows) {
    assert(Number(b.price_basic) > 0, `Beat "${b.title}" has valid basic price: ₦${b.price_basic}`);
    assert(Number(b.price_premium) > 0, `Beat "${b.title}" has valid premium price: ₦${b.price_premium}`);
    assert(Number(b.price_exclusive) > 0, `Beat "${b.title}" has valid exclusive price: ₦${b.price_exclusive}`);
  }

  // --- 2. Beats Persistence Cycle Test (Save -> Reload -> Edit) ---
  console.log('\n--- 2. Beat Persistence Cycle Test ---');
  const testBeatSlug = 'test-beat-verify-' + Date.now();
  const insertBeatRes = await client.query(`
    INSERT INTO beats (slug, title, genre, short_genre, bpm, beat_key, producer, price_basic, price_premium, price_exclusive, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `, [
    testBeatSlug,
    'Verification Beat',
    'Afrobeat Type Beat',
    'Afrobeat',
    '112',
    'F# minor',
    'silachomka',
    20000.00,
    45000.00,
    90000.00,
    'DRAFT'
  ]);
  const createdBeat = insertBeatRes.rows[0];
  assert(createdBeat.slug === testBeatSlug, 'Beat inserted successfully with custom prices');
  assert(Number(createdBeat.price_basic) === 20000, 'Basic price saved correctly (₦20,000)');
  assert(Number(createdBeat.price_premium) === 45000, 'Premium price saved correctly (₦45,000)');
  assert(Number(createdBeat.price_exclusive) === 90000, 'Exclusive price saved correctly (₦90,000)');
  assert(createdBeat.genre === 'Afrobeat Type Beat', 'Normalized full genre saved as "Afrobeat Type Beat"');
  assert(createdBeat.short_genre === 'Afrobeat', 'Short genre saved as "Afrobeat"');

  // Update beat (simulate edit cycle)
  const updateBeatRes = await client.query(`
    UPDATE beats 
    SET price_basic = 22000.00, price_premium = 50000.00, price_exclusive = 100000.00
    WHERE id = $1
    RETURNING *;
  `, [createdBeat.id]);
  const updatedBeat = updateBeatRes.rows[0];
  assert(Number(updatedBeat.price_basic) === 22000, 'Basic price updated and persisted (₦22,000)');
  assert(Number(updatedBeat.price_premium) === 50000, 'Premium price updated and persisted (₦50,000)');
  assert(Number(updatedBeat.price_exclusive) === 100000, 'Exclusive price updated and persisted (₦100,000)');

  // Clean up test beat
  await client.query('DELETE FROM beats WHERE id = $1', [createdBeat.id]);
  console.log('  Cleaned up temporary test beat.');

  // --- 3. Releases Timestamp & Canonical Format Verification ---
  console.log('\n--- 3. Releases Date/Time & Canonical Format ---');
  const relDateCol = await client.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'releases' AND column_name = 'release_date';
  `);
  assert(relDateCol.rows[0].data_type === 'timestamp with time zone', 'releases.release_date is TIMESTAMP WITH TIME ZONE');

  const testReleaseSlug = 'test-release-verify-' + Date.now();
  const testTimestamp = '2026-11-15T18:30:00.000Z';
  const insertRelRes = await client.query(`
    INSERT INTO releases (slug, title, type, release_date, display_date, primary_artist, sources, description, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `, [
    testReleaseSlug,
    'Verification Album',
    'album',
    testTimestamp,
    'Sunday, 15th November, 2026',
    'silachomka',
    JSON.stringify(['chomkaMUSIC™']),
    'Verification Album is an official studio release by silachomka published under chomkaMUSIC™.',
    'DRAFT'
  ]);
  const createdRelease = insertRelRes.rows[0];
  assert(createdRelease.release_date.toISOString() === testTimestamp, 'Release timestamp with date and time preserved precisely');
  assert(createdRelease.display_date === 'Sunday, 15th November, 2026', 'Canonical display date formatted correctly');
  assert(createdRelease.description.includes('Verification Album is an official studio release by silachomka'), 'Canonical description pattern verified');

  // Clean up test release
  await client.query('DELETE FROM releases WHERE id = $1', [createdRelease.id]);
  console.log('  Cleaned up temporary test release.');

  // --- 4. Recycle Bin 8 Tables Check ---
  console.log('\n--- 4. Recycle Bin 8 Tables Verification ---');
  const tables = ['releases', 'tracks', 'beats', 'music_videos', 'gallery_posts', 'media_assets', 'social_links', 'merchandise'];
  for (const t of tables) {
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = 'deleted_at';
    `, [t]);
    assert(colCheck.rows.length === 1, `Table "${t}" has deleted_at soft-delete column`);
  }

  console.log('=====================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  await client.end();

  if (failed > 0) {
    process.exit(1);
  }
}

verifyStage21().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

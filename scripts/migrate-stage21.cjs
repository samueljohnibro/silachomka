const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));

async function migrate() {
  const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
  const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);
  if (!match) throw new Error('DATABASE_URL not found');

  const client = new Client({ connectionString: match[1].trim() });
  await client.connect();

  console.log('--- Applying Stage 21 Migration ---');

  // 1. Add pricing columns to beats
  console.log('Adding pricing columns to beats...');
  await client.query(`
    ALTER TABLE beats 
      ADD COLUMN IF NOT EXISTS price_basic NUMERIC(12, 2) DEFAULT 15000.00,
      ADD COLUMN IF NOT EXISTS price_premium NUMERIC(12, 2) DEFAULT 30000.00,
      ADD COLUMN IF NOT EXISTS price_exclusive NUMERIC(12, 2) DEFAULT 60000.00;
  `);

  await client.query(`
    UPDATE beats SET price_basic = 15000.00 WHERE price_basic IS NULL;
    UPDATE beats SET price_premium = 30000.00 WHERE price_premium IS NULL;
    UPDATE beats SET price_exclusive = 60000.00 WHERE price_exclusive IS NULL;
  `);

  // 2. Upgrade releases.release_date to TIMESTAMP WITH TIME ZONE if it is currently DATE
  console.log('Checking releases.release_date column type...');
  const colRes = await client.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'releases' AND column_name = 'release_date';
  `);
  const currentType = colRes.rows[0]?.data_type;
  console.log('Current releases.release_date type:', currentType);

  if (currentType === 'date') {
    console.log('Altering releases.release_date to TIMESTAMP WITH TIME ZONE...');
    await client.query(`
      ALTER TABLE releases 
        ALTER COLUMN release_date TYPE TIMESTAMP WITH TIME ZONE 
        USING release_date::timestamptz;
    `);
    console.log('releases.release_date altered to TIMESTAMP WITH TIME ZONE.');
  }

  // 3. Verify
  const verifyBeats = await client.query(`
    SELECT id, title, price_basic, price_premium, price_exclusive FROM beats LIMIT 3;
  `);
  console.log('Beats verification:');
  console.log(verifyBeats.rows);

  const verifyReleases = await client.query(`
    SELECT id, title, release_date, display_date FROM releases LIMIT 3;
  `);
  console.log('Releases verification:');
  console.log(verifyReleases.rows);

  await client.end();
  console.log('--- Stage 21 Migration Completed Successfully ---');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

// scripts/inspect-prod-db.cjs
const fs = require('fs');
const { Client } = require('../worker/node_modules/pg');

const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);

if (!match) {
  console.error('DATABASE_URL not found in worker/.dev.vars');
  process.exit(1);
}

const dbUrl = match[1].trim();
// Redact password for safe logging
const safeUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
console.log('Connecting to:', safeUrl);

const client = new Client({ connectionString: dbUrl });

async function inspect() {
  await client.connect();

  const dbRes = await client.query('SELECT current_database(), current_user, version()');
  console.log('Database:', dbRes.rows[0].current_database, '| User:', dbRes.rows[0].current_user);

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log(`Found ${tablesRes.rows.length} tables in public schema:`);
  for (const row of tablesRes.rows) {
    const countRes = await client.query(`SELECT count(*)::int as c FROM "${row.table_name}"`);
    console.log(`  - ${row.table_name}: ${countRes.rows[0].c} rows`);
  }

  await client.end();
}

inspect().catch(err => {
  console.error('Database connection failed:', err.message);
  process.exit(1);
});

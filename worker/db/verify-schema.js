// worker/db/verify-schema.js
// Verifies all tables, enums, foreign keys, indexes and constraints exist after schema execution
// Usage: node db/verify-schema.js

import { readFileSync } from 'fs';
import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadDatabaseUrl() {
  const devVarsPath = join(__dirname, '..', '.dev.vars');
  const content = readFileSync(devVarsPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^DATABASE_URL\s*=\s*"?([^"]*)"?$/);
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in worker/.dev.vars');
}

const EXPECTED_TABLES = [
  'admin_users',
  'media_assets',
  'releases',
  'tracks',
  'track_credits',
  'beats',
  'music_videos',
  'music_video_features',
  'gallery_posts',
  'gallery_slides',
  'merchandise',
  'social_links',
  'audit_logs',
];

const EXPECTED_ENUMS = [
  'publish_status',
  'user_role',
  'asset_type',
  'release_type',
  'credit_role',
  'gallery_post_type',
  'product_status',
  'action_type',
];

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let allPassed = true;
  const fail = (msg) => { console.error(`  FAIL: ${msg}`); allPassed = false; };
  const pass = (msg) => { console.log(`  OK: ${msg}`); };

  // 1. Verify Tables
  console.log('\n=== TABLES ===');
  const tablesResult = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const existingTables = tablesResult.rows.map(r => r.table_name);
  console.log(`  Found ${existingTables.length} tables: ${existingTables.join(', ')}`);

  for (const t of EXPECTED_TABLES) {
    if (existingTables.includes(t)) pass(t);
    else fail(`Missing table: ${t}`);
  }

  // Check for unexpected tables
  for (const t of existingTables) {
    if (!EXPECTED_TABLES.includes(t)) {
      console.log(`  NOTE: Extra table found: ${t}`);
    }
  }

  // 2. Verify Enums
  console.log('\n=== ENUMS ===');
  const enumsResult = await client.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY t.typname, e.enumsortorder;
  `);
  const existingEnums = {};
  for (const row of enumsResult.rows) {
    if (!existingEnums[row.typname]) existingEnums[row.typname] = [];
    existingEnums[row.typname].push(row.enumlabel);
  }

  for (const en of EXPECTED_ENUMS) {
    if (existingEnums[en]) {
      pass(`${en}: [${existingEnums[en].join(', ')}]`);
    } else {
      fail(`Missing enum: ${en}`);
    }
  }

  // 3. Verify Foreign Keys
  console.log('\n=== FOREIGN KEYS ===');
  const fkResult = await client.query(`
    SELECT
      tc.constraint_name,
      tc.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  console.log(`  Found ${fkResult.rows.length} foreign keys:`);
  for (const fk of fkResult.rows) {
    pass(`${fk.from_table}.${fk.from_column} -> ${fk.to_table}.${fk.to_column} [ON DELETE ${fk.delete_rule}]`);
  }

  // 4. Verify Indexes
  console.log('\n=== CUSTOM INDEXES ===');
  const idxResult = await client.query(`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    ORDER BY indexname;
  `);
  console.log(`  Found ${idxResult.rows.length} custom indexes:`);
  for (const idx of idxResult.rows) {
    pass(`${idx.indexname} on ${idx.tablename}`);
  }

  // 5. Verify Unique Constraints
  console.log('\n=== UNIQUE CONSTRAINTS ===');
  const ucResult = await client.query(`
    SELECT tc.constraint_name, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  console.log(`  Found ${ucResult.rows.length} unique constraint columns:`);
  for (const uc of ucResult.rows) {
    pass(`${uc.table_name}.${uc.column_name} (${uc.constraint_name})`);
  }

  // 6. Column detail for key tables
  console.log('\n=== COLUMN COUNTS PER TABLE ===');
  const colResult = await client.query(`
    SELECT table_name, count(*) as col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
    ORDER BY table_name;
  `);
  for (const row of colResult.rows) {
    console.log(`  ${row.table_name}: ${row.col_count} columns`);
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  if (allPassed) {
    console.log('  ALL VERIFICATIONS PASSED');
  } else {
    console.error('  SOME VERIFICATIONS FAILED - see FAIL entries above');
    process.exit(1);
  }

  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

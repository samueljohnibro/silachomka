// worker/db/init-staging.js
// Safe, isolated non-destructive initialization script for the Neon Staging database branch.
// Preserves existing tables and enums; validates schema structure; seeds admin and test fixtures atomically.

import { readFileSync, existsSync } from 'fs';
import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { webcrypto } from 'crypto';

const cryptoSubtle = globalThis.crypto?.subtle || webcrypto.subtle;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Known authoritative production identifiers (for negative assertion guards)
const KNOWN_PROD_PROJECT_ID = 'silent-band-97824894';
const KNOWN_PROD_BRANCH_ID = 'br-holy-silence-b1nmyb1d';
const KNOWN_PROD_ENDPOINT_ID = 'ep-damp-feather-b1w95hnc';

// Expected 13 tables in Silachomka V1 schema
const EXPECTED_TABLES = [
  'admin_users', 'audit_logs', 'beats', 'gallery_posts', 'gallery_slides',
  'media_assets', 'merchandise', 'music_video_features', 'music_videos',
  'releases', 'social_links', 'track_credits', 'tracks'
];

// Expected 8 custom enum types and their required labels
const EXPECTED_ENUMS = {
  action_type: ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'ARCHIVE'],
  asset_type: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER'],
  credit_role: ['FEATURING', 'PRODUCER', 'WRITER', 'ENGINEER', 'DIRECTOR'],
  gallery_post_type: ['image', 'video', 'carousel'],
  product_status: ['PLANNED', 'PRE_LAUNCH', 'AVAILABLE', 'LIMITED', 'SOLD_OUT', 'DISCONTINUED', 'ARCHIVED', 'NEEDS_CONFIRMATION'],
  publish_status: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'UNAVAILABLE'],
  release_type: ['single', 'ep', 'album'],
  user_role: ['SUPERADMIN', 'EDITOR']
};

// Key required columns by table to verify structural integrity
const REQUIRED_COLUMNS = {
  admin_users: ['id', 'email', 'password_hash', 'role'],
  media_assets: ['id', 'r2_key', 'asset_type'],
  releases: ['id', 'slug', 'title', 'release_date', 'type', 'cover_asset_id'],
  tracks: ['id', 'release_id', 'track_number', 'title'],
  track_credits: ['id', 'track_id', 'credit_name', 'role'],
  beats: ['id', 'slug', 'title'],
  music_videos: ['id', 'slug', 'youtube_id', 'youtube_url'],
  music_video_features: ['video_id', 'artist_name'],
  gallery_posts: ['id', 'slug', 'post_type', 'primary_asset_id'],
  gallery_slides: ['id', 'post_id', 'asset_id', 'sort_order'],
  merchandise: ['id', 'slug', 'name'],
  social_links: ['id', 'name', 'url'],
  audit_logs: ['id', 'user_id', 'action', 'entity_type', 'entity_id']
};

// 1. Password hashing implementation (identically matches production Worker auth in worker/src/auth.js)
async function hashPassword(password) {
  const enc = new TextEncoder();
  const keyMaterial = await cryptoSubtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  );
  const salt = enc.encode('silachomka-secure-salt');
  const key = await cryptoSubtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
  const exported = await cryptoSubtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. Load staging connection string explicitly — NEVER falls back to production DATABASE_URL
function resolveStagingUrl() {
  if (process.env.STAGING_DATABASE_URL && process.env.STAGING_DATABASE_URL.trim()) {
    return process.env.STAGING_DATABASE_URL.trim();
  }

  const candidateFiles = [
    join(__dirname, '..', '.dev.vars.staging'),
    join(__dirname, '..', '..', '.env.staging')
  ];

  for (const filePath of candidateFiles) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^STAGING_DATABASE_URL\s*=\s*"?([^"\r\n]*)"?$/);
        if (match && match[1].trim()) {
          return match[1].trim();
        }
      }
    }
  }

  return null;
}

// 3. Load expected staging branch ID — required for positive branch identification
function resolveExpectedBranchId() {
  if (process.env.EXPECTED_STAGING_BRANCH_ID && process.env.EXPECTED_STAGING_BRANCH_ID.trim()) {
    return process.env.EXPECTED_STAGING_BRANCH_ID.trim();
  }
  if (process.env.STAGING_BRANCH_ID && process.env.STAGING_BRANCH_ID.trim()) {
    return process.env.STAGING_BRANCH_ID.trim();
  }

  const candidateFiles = [
    join(__dirname, '..', '.dev.vars.staging'),
    join(__dirname, '..', '..', '.env.staging')
  ];

  for (const filePath of candidateFiles) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^(?:EXPECTED_STAGING_BRANCH_ID|STAGING_BRANCH_ID)\s*=\s*"?([^"\r\n]*)"?$/);
        if (match && match[1].trim()) {
          return match[1].trim();
        }
      }
    }
  }

  return null;
}

// 4. Load staging admin test password from environment or gitignored staging files
function resolveAdminPassword() {
  if (process.env.ADMIN_TEST_PASSWORD && process.env.ADMIN_TEST_PASSWORD.trim()) {
    return process.env.ADMIN_TEST_PASSWORD.trim();
  }

  const candidateFiles = [
    join(__dirname, '..', '.dev.vars.staging'),
    join(__dirname, '..', '..', '.env.staging')
  ];

  for (const filePath of candidateFiles) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^ADMIN_TEST_PASSWORD\s*=\s*"?([^"\r\n]*)"?$/);
        if (match && match[1].trim()) {
          return match[1].trim();
        }
      }
    }
  }

  return null;
}

// 5. Load production connection string ONLY for negative safety comparison
function getProductionUrl() {
  const prodVarsPath = join(__dirname, '..', '.dev.vars');
  if (existsSync(prodVarsPath)) {
    const content = readFileSync(prodVarsPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]*)"?$/);
      if (match && match[1].trim()) return match[1].trim();
    }
  }
  return null;
}

async function main() {
  console.log('=== SILACHOMKA NON-DESTRUCTIVE STAGING INITIALIZATION ===\n');

  // ----------------------------------------------------
  // PREFLIGHT 1: Require STAGING_DATABASE_URL
  // ----------------------------------------------------
  const stagingUrl = resolveStagingUrl();
  if (!stagingUrl) {
    console.log('[STATUS: AWAITING_CONFIGURATION]');
    console.log('STAGING_DATABASE_URL is not currently available in the environment.');
    console.log('\nTo configure securely:');
    console.log('  Option 1 (Recommended local file — gitignored):');
    console.log('    Create worker/.dev.vars.staging with:');
    console.log('    STAGING_DATABASE_URL=postgres://...\n');
    console.log('  Option 2 (Terminal environment variable):');
    console.log('    set STAGING_DATABASE_URL="postgres://..."\n');
    process.exit(2);
  }

  // ----------------------------------------------------
  // PREFLIGHT 2: Require EXPECTED_STAGING_BRANCH_ID
  // ----------------------------------------------------
  const expectedBranchId = resolveExpectedBranchId();
  if (!expectedBranchId) {
    console.log('[STATUS: AWAITING_CONFIGURATION]');
    console.log('EXPECTED_STAGING_BRANCH_ID is not configured.');
    console.log('\nPositive branch identification is required before initialization can proceed.');
    console.log('Please retrieve your Neon staging branch ID from the Neon Console:');
    console.log('  1. Navigate to Neon Console -> Branches -> staging');
    console.log('  2. Copy the Branch ID (e.g. br-xxxx-xxxx)');
    console.log('  3. Add it to worker/.dev.vars.staging:');
    console.log('     EXPECTED_STAGING_BRANCH_ID=br-...\n');
    process.exit(2);
  }

  // ----------------------------------------------------
  // PREFLIGHT 3: Require ADMIN_TEST_PASSWORD
  // ----------------------------------------------------
  const adminPassword = resolveAdminPassword();
  if (!adminPassword) {
    console.log('[STATUS: AWAITING_CONFIGURATION]');
    console.log('ADMIN_TEST_PASSWORD is not configured.');
    console.log('\nPlease configure ADMIN_TEST_PASSWORD in worker/.dev.vars.staging so that subsequent test scripts can authenticate.');
    console.log('  ADMIN_TEST_PASSWORD=<your-strong-staging-password>\n');
    process.exit(2);
  }

  // ----------------------------------------------------
  // STATIC GUARD 1: String-level comparison against production URL
  // ----------------------------------------------------
  const prodUrl = getProductionUrl();
  if (prodUrl && stagingUrl === prodUrl) {
    console.error('[FATAL SAFETY ABORT] STAGING_DATABASE_URL string is identical to production DATABASE_URL!');
    console.error('Execution has been aborted immediately to protect production data.');
    process.exit(1);
  }

  // ----------------------------------------------------
  // STATIC GUARD 2: Host & Endpoint ID parsing comparison
  // ----------------------------------------------------
  let stagingHost = '';
  let stagingEndpointId = '';
  try {
    const stagingUrlParsed = new URL(stagingUrl);
    stagingHost = stagingUrlParsed.host;
    stagingEndpointId = stagingHost.split('.')[0].replace('-pooler', '');

    if (stagingEndpointId === KNOWN_PROD_ENDPOINT_ID) {
      console.error('[FATAL SAFETY ABORT] Staging connection endpoint matches known production endpoint ID!');
      console.error(`Endpoint: ${KNOWN_PROD_ENDPOINT_ID}`);
      process.exit(1);
    }

    if (prodUrl) {
      const prodUrlParsed = new URL(prodUrl);
      const prodHost = prodUrlParsed.host;
      const prodEndpointId = prodHost.split('.')[0].replace('-pooler', '');

      if (stagingHost === prodHost || stagingEndpointId === prodEndpointId) {
        console.error('[FATAL SAFETY ABORT] Target endpoint matches the production database endpoint ID!');
        console.error('Cannot execute against the production endpoint. Execution aborted.');
        process.exit(1);
      }
    }
  } catch {
    console.error('[FATAL ERROR] Malformed STAGING_DATABASE_URL connection string.');
    process.exit(1);
  }

  console.log(`[STATIC CHECK PASSED] Target endpoint hostname: ${stagingHost}`);
  console.log(`[STATIC CHECK PASSED] Target endpoint ID: ${stagingEndpointId} (distinct from production ${KNOWN_PROD_ENDPOINT_ID})`);
  console.log(`[STATIC CHECK PASSED] Expected staging branch ID configured: ${expectedBranchId}`);

  // ----------------------------------------------------
  // CONNECT TO TARGET DATABASE
  // ----------------------------------------------------
  console.log('\nConnecting to target database for metadata verification...');
  const client = new Client({ connectionString: stagingUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const dbInfo = await client.query('SELECT current_database(), current_user');
  console.log(`Connected to database [${dbInfo.rows[0].current_database}] as [${dbInfo.rows[0].current_user}].`);

  // ----------------------------------------------------
  // DYNAMIC GUARD 1: Authoritative Neon Engine Metadata Verification
  // ----------------------------------------------------
  console.log('\nQuerying authoritative Neon engine settings (neon.project_id, neon.branch_id, neon.endpoint_id)...');
  let reportedProjectId = null;
  let reportedBranchId = null;
  let reportedEndpointId = null;

  try {
    const metaRes = await client.query(`
      SELECT 
        current_setting('neon.project_id', true) AS project_id,
        current_setting('neon.branch_id', true) AS branch_id,
        current_setting('neon.endpoint_id', true) AS endpoint_id
    `);

    if (metaRes.rows.length === 0) {
      throw new Error('Neon settings query returned no rows.');
    }

    reportedProjectId = metaRes.rows[0].project_id ? String(metaRes.rows[0].project_id).trim() : null;
    reportedBranchId = metaRes.rows[0].branch_id ? String(metaRes.rows[0].branch_id).trim() : null;
    reportedEndpointId = metaRes.rows[0].endpoint_id ? String(metaRes.rows[0].endpoint_id).trim() : null;
  } catch (err) {
    console.error('[FATAL SAFETY ABORT] Failed to query authoritative Neon metadata from connected database:', err.message);
    await client.end();
    process.exit(1);
  }

  // Validate Project ID
  if (!reportedProjectId || reportedProjectId !== KNOWN_PROD_PROJECT_ID) {
    console.error(`[FATAL SAFETY ABORT] Reported project_id [${reportedProjectId}] does not match expected project [${KNOWN_PROD_PROJECT_ID}].`);
    await client.end();
    process.exit(1);
  }
  console.log(`  [METADATA PASS] Project ID:  ${reportedProjectId} (matches project)`);

  // Validate Negative Branch ID (Must NOT match production)
  if (!reportedBranchId || reportedBranchId === KNOWN_PROD_BRANCH_ID) {
    console.error(`[FATAL SAFETY ABORT] Target database reported production branch ID [${KNOWN_PROD_BRANCH_ID}]!`);
    console.error('Refusing to execute against production branch.');
    await client.end();
    process.exit(1);
  }

  // Validate Positive Branch ID (Must strictly match expected staging branch ID)
  if (reportedBranchId !== expectedBranchId) {
    console.error(`[FATAL SAFETY ABORT] Reported branch_id [${reportedBranchId}] does not match expected staging branch [${expectedBranchId}]!`);
    await client.end();
    process.exit(1);
  }
  console.log(`  [METADATA PASS] Branch ID:   ${reportedBranchId} (positively matches expected staging branch)`);

  // Validate Negative Endpoint ID (Must NOT match production)
  if (!reportedEndpointId || reportedEndpointId === KNOWN_PROD_ENDPOINT_ID) {
    console.error(`[FATAL SAFETY ABORT] Target database reported production endpoint ID [${KNOWN_PROD_ENDPOINT_ID}]!`);
    await client.end();
    process.exit(1);
  }

  // Validate Positive Endpoint ID (Must strictly match configured endpoint from connection string)
  if (stagingEndpointId && reportedEndpointId !== stagingEndpointId) {
    console.error(`[FATAL SAFETY ABORT] Reported endpoint_id [${reportedEndpointId}] does not match configured connection endpoint [${stagingEndpointId}]!`);
    await client.end();
    process.exit(1);
  }
  console.log(`  [METADATA PASS] Endpoint ID: ${reportedEndpointId} (distinct from production; matches configured endpoint)`);

  // ----------------------------------------------------
  // DYNAMIC GUARD 2: Structural Schema Integrity Verification
  // ----------------------------------------------------
  console.log('\nValidating structural schema integrity (tables, columns, enum labels, foreign keys)...');

  // A. Verify all 13 required tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const existingTableNames = new Set(tablesRes.rows.map(r => r.table_name));
  for (const expectedTable of EXPECTED_TABLES) {
    if (!existingTableNames.has(expectedTable)) {
      console.error(`[FATAL SCHEMA MISMATCH] Required table [${expectedTable}] is missing from public schema!`);
      await client.end();
      process.exit(1);
    }
  }
  console.log(`  [SCHEMA STRUCTURE PASS] All ${EXPECTED_TABLES.length} required base tables present.`);

  // B. Verify all 8 required enum types and their labels
  const enumsRes = await client.query(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname;
  `);
  const existingEnums = {};
  for (const row of enumsRes.rows) {
    existingEnums[row.typname] = Array.isArray(row.labels) ? row.labels : String(row.labels).replace(/^\{|\}$/g, '').split(',');
  }

  for (const [enumName, expectedLabels] of Object.entries(EXPECTED_ENUMS)) {
    const actualLabels = existingEnums[enumName];
    if (!actualLabels) {
      console.error(`[FATAL SCHEMA MISMATCH] Required enum type [${enumName}] is missing from public schema!`);
      await client.end();
      process.exit(1);
    }
    for (const label of expectedLabels) {
      if (!actualLabels.includes(label)) {
        console.error(`[FATAL SCHEMA MISMATCH] Enum [${enumName}] is missing required label [${label}]!`);
        await client.end();
        process.exit(1);
      }
    }
  }
  console.log(`  [SCHEMA STRUCTURE PASS] All ${Object.keys(EXPECTED_ENUMS).length} required enum types and labels verified.`);

  // C. Verify key required columns
  const colsRes = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public';
  `);
  const columnsByTable = {};
  for (const row of colsRes.rows) {
    if (!columnsByTable[row.table_name]) columnsByTable[row.table_name] = new Set();
    columnsByTable[row.table_name].add(row.column_name);
  }

  for (const [table, requiredCols] of Object.entries(REQUIRED_COLUMNS)) {
    const tableCols = columnsByTable[table] || new Set();
    for (const col of requiredCols) {
      if (!tableCols.has(col)) {
        console.error(`[FATAL SCHEMA MISMATCH] Table [${table}] is missing required column [${col}]!`);
        await client.end();
        process.exit(1);
      }
    }
  }
  console.log(`  [SCHEMA STRUCTURE PASS] All critical relational columns verified across all tables.`);

  // D. Verify key foreign key constraints
  const fkRes = await client.query(`
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY';
  `);
  if (fkRes.rows.length === 0) {
    console.error('[FATAL SCHEMA MISMATCH] No foreign key constraints found in public schema!');
    await client.end();
    process.exit(1);
  }
  console.log(`  [SCHEMA STRUCTURE PASS] Foreign key constraints verified (${fkRes.rows.length} FK constraints detected).`);

  // E. Negative check against production catalogue row counts
  const relCount = await client.query('SELECT COUNT(*)::int as c FROM releases');
  const credCount = await client.query('SELECT COUNT(*)::int as c FROM track_credits');
  if (relCount.rows[0].c === 20 && credCount.rows[0].c === 75) {
    console.error('[FATAL SAFETY ABORT] Target database contains exact production catalogue counts (20 releases, 75 credits)!');
    console.error('Refusing to execute against production data.');
    await client.end();
    process.exit(1);
  }

  console.log('\n[ALL SAFETY GUARDS PASSED] Target positively identified as safe isolated Neon staging branch.\n');

  const isVerifyOnly = process.argv.includes('--verify-only') || process.argv.includes('--check-only');
  if (isVerifyOnly) {
    console.log('[READ-ONLY PREFLIGHT COMPLETE] All safety and structural checks passed.');
    console.log('No SQL writes were executed (--verify-only mode).\n');
    await client.end();
    process.exit(0);
  }

  // ----------------------------------------------------
  // ATOMIC NON-DESTRUCTIVE SEED TRANSACTION
  // ----------------------------------------------------
  console.log('Beginning atomic seed transaction (BEGIN)...');
  await client.query('BEGIN');

  let commitAttempted = false;
  try {
    // 1. Seed Staging Superadmin User (Idempotent, Non-Overwriting)
    console.log('Seeding staging superadmin account...');
    const adminEmail = process.env.ADMIN_TEST_EMAIL || 'staging-admin@silachomka.internal';
    const passHash = await hashPassword(adminPassword);

    // Insert only if not existing
    await client.query(`
      INSERT INTO admin_users (email, password_hash, role)
      VALUES ($1, $2, 'SUPERADMIN')
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, passHash]);

    // Verify account exists and password compatibility
    const userResult = await client.query(`
      SELECT id, email, password_hash, role 
      FROM admin_users 
      WHERE email = $1
    `, [adminEmail]);

    if (userResult.rows.length === 0) {
      throw new Error(`Failed to find or insert staging admin account [${adminEmail}].`);
    }

    const seededUser = userResult.rows[0];
    if (seededUser.password_hash !== passHash) {
      throw new Error(`Admin account [${adminEmail}] exists with a different password hash. Rerun will not overwrite existing credentials.`);
    }

    console.log(`[STAGING ADMIN VERIFIED] Account: ${seededUser.email} (Role: ${seededUser.role})`);

    // 2. Seed Baseline Media Assets
    console.log('Seeding minimal media assets...');
    await client.query(`
      INSERT INTO media_assets (r2_key, original_filename, asset_type)
      VALUES ('staging-cover-fixture.jpg', 'staging-cover-fixture.jpg', 'IMAGE')
      ON CONFLICT (r2_key) DO NOTHING
    `);
    const assetRes = await client.query(`
      SELECT id FROM media_assets WHERE r2_key = 'staging-cover-fixture.jpg'
    `);
    const coverAssetId = assetRes.rows[0]?.id;

    await client.query(`
      INSERT INTO media_assets (r2_key, original_filename, asset_type)
      VALUES ('staging-audio-fixture.mp3', 'staging-audio-fixture.mp3', 'AUDIO')
      ON CONFLICT (r2_key) DO NOTHING
    `);

    // 3. Seed Baseline Release
    console.log('Seeding baseline release...');
    await client.query(`
      INSERT INTO releases (slug, number, title, release_date, type, cover_asset_id, status)
      VALUES ('staging-test-ep', 99, 'Staging Test EP', '2026-10-01', 'ep', $1, 'PUBLISHED')
      ON CONFLICT (slug) DO NOTHING
    `, [coverAssetId || null]);

    const relRes = await client.query(`
      SELECT id FROM releases WHERE slug = 'staging-test-ep'
    `);
    const releaseId = relRes.rows[0]?.id;

    // 4. Seed Baseline Track
    if (releaseId) {
      console.log('Seeding baseline track...');
      await client.query(`
        INSERT INTO tracks (release_id, track_number, title)
        VALUES ($1, 1, 'Staging Test Track 1')
        ON CONFLICT (release_id, track_number) DO NOTHING
      `, [releaseId]);
    }

    // 5. Seed Baseline Music Video
    console.log('Seeding baseline music video...');
    await client.query(`
      INSERT INTO music_videos (slug, title, youtube_id, youtube_url, status)
      VALUES ('staging-test-video', 'Staging Test Video', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'PUBLISHED')
      ON CONFLICT (slug) DO NOTHING
    `);

    // 6. Seed Baseline Gallery Post (Carousel)
    console.log('Seeding baseline gallery post...');
    await client.query(`
      INSERT INTO gallery_posts (slug, title, post_type, primary_asset_id, post_date, status)
      VALUES ('staging-test-gallery', 'Staging Test Gallery', 'carousel', $1, '2026-10-01', 'PUBLISHED')
      ON CONFLICT (slug) DO NOTHING
    `, [coverAssetId || null]);

    console.log('Baseline fixtures initialized successfully.');

    // 7. Commit atomic transaction
    commitAttempted = true;
    await client.query('COMMIT');
    console.log('[COMMIT SUCCESSFUL] Non-destructive staging seed committed successfully.\n');

  } catch (err) {
    if (commitAttempted) {
      console.error('\n[CRITICAL TRANSACTION WARNING] An error occurred during or immediately after COMMIT!');
      console.error('The transaction state is UNCERTAIN (it may have partially committed or rolled back).');
      console.error('Manual inspection of the database is REQUIRED to determine state.');
      console.error('Error detail:', err.message);
    } else {
      console.error('\n[TRANSACTION FAILED — ROLLING BACK]:', err.message);
      try {
        await client.query('ROLLBACK');
        console.log('[ROLLBACK SUCCESSFUL] Database was rolled back cleanly to pre-transaction state.');
      } catch (rollbackErr) {
        console.error('[ROLLBACK FAILED] Could not execute ROLLBACK (connection may have severed):', rollbackErr.message);
        console.error('Manual database inspection is required.');
      }
    }
    await client.end().catch(() => {});
    process.exit(1);
  }

  // ----------------------------------------------------
  // VERIFY FINAL TABLE COUNTS
  // ----------------------------------------------------
  console.log('--- STAGING TABLE SUMMARY ---');
  for (const t of EXPECTED_TABLES) {
    const r = await client.query(`SELECT COUNT(*)::int as count FROM ${t}`);
    console.log(`  Table [${t.padEnd(22)}]: ${r.rows[0].count} records`);
  }

  await client.end();
  console.log('\n=== STAGING INITIALIZATION COMPLETE ===');
}

main().catch(err => {
  console.error('[INITIALIZATION ERROR]:', err.message);
  process.exit(1);
});

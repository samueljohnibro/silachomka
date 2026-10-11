// worker/db/verify-staging-preflight.js
// Purely read-only preflight verification script for the Neon Staging database branch.
// Guarantees: ZERO DDL, ZERO writes, ZERO mutations, completely non-destructive.

import { readFileSync, existsSync } from 'fs';
import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Known authoritative production identifiers (for negative assertion guards)
const KNOWN_PROD_PROJECT_ID = 'silent-band-97824894';
const KNOWN_PROD_BRANCH_ID = 'br-holy-silence-b1nmyb1d';
const KNOWN_PROD_ENDPOINT_ID = 'ep-damp-feather-b1w95hnc';

// 1. Load staging connection string explicitly — NEVER falls back to production DATABASE_URL
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

// 2. Load expected staging branch ID — required for positive branch identification
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

// 3. Load production connection string ONLY for negative safety comparison
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

async function runReadOnlyPreflight() {
  console.log('=== SILACHOMKA STAGING READ-ONLY PREFLIGHT ===');
  console.log('Mode: READ-ONLY (No DDL or writes can be executed)\n');

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
    console.log('\nPositive branch identification is required before preflight can proceed.');
    console.log('Please retrieve your Neon staging branch ID from the Neon Console:');
    console.log('  1. Navigate to Neon Console -> Branches -> staging');
    console.log('  2. Copy the Branch ID (e.g. br-xxxx-xxxx)');
    console.log('  3. Add it to worker/.dev.vars.staging:');
    console.log('     EXPECTED_STAGING_BRANCH_ID=br-...\n');
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
  // CONNECT TO TARGET DATABASE (READ-ONLY)
  // ----------------------------------------------------
  console.log('\nConnecting to target database for metadata inspection...');
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

    reportedProjectId = metaRes.rows[0].project_id;
    reportedBranchId = metaRes.rows[0].branch_id;
    reportedEndpointId = metaRes.rows[0].endpoint_id;
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

  // Validate Endpoint ID (Must NOT match production)
  if (!reportedEndpointId || reportedEndpointId === KNOWN_PROD_ENDPOINT_ID) {
    console.error(`[FATAL SAFETY ABORT] Target database reported production endpoint ID [${KNOWN_PROD_ENDPOINT_ID}]!`);
    await client.end();
    process.exit(1);
  }
  console.log(`  [METADATA PASS] Endpoint ID: ${reportedEndpointId} (distinct from production endpoint)`);

  // ----------------------------------------------------
  // DYNAMIC GUARD 2: Comprehensive Empty Schema Preflight (Anti-Destruction Guard)
  // ----------------------------------------------------
  console.log('\nChecking target schema state for existing tables, views, sequences, and custom types...');
  const relationsCheck = await client.query(`
    SELECT 
      c.relkind,
      count(*)::int AS count 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind IN ('r', 'v', 'm', 'p', 'f', 'S')
    GROUP BY c.relkind
  `);
  const typesCheck = await client.query(`
    SELECT 
      t.typtype,
      count(*)::int AS count 
    FROM pg_type t 
    JOIN pg_namespace n ON t.typnamespace = n.oid 
    WHERE n.nspname = 'public' 
      AND (t.typtype IN ('e', 'd', 'r') OR (t.typtype = 'c' AND t.typrelid = 0))
    GROUP BY t.typtype
  `);

  let totalRelations = 0;
  let tableCount = 0;
  let viewCount = 0;
  let sequenceCount = 0;
  for (const row of relationsCheck.rows) {
    totalRelations += row.count;
    if (row.relkind === 'r' || row.relkind === 'p' || row.relkind === 'f') tableCount += row.count;
    if (row.relkind === 'v' || row.relkind === 'm') viewCount += row.count;
    if (row.relkind === 'S') sequenceCount += row.count;
  }

  let totalTypes = 0;
  for (const row of typesCheck.rows) {
    totalTypes += row.count;
  }

  console.log(`  Existing relations in public: ${totalRelations} (${tableCount} tables, ${viewCount} views, ${sequenceCount} sequences)`);
  console.log(`  Existing custom types in public: ${totalTypes}`);

  if (totalRelations > 0 || totalTypes > 0) {
    console.error('\n[FATAL SAFETY ABORT] Target database is not demonstrably empty!');
    console.error(`Found ${totalRelations} relation(s) (${tableCount} tables, ${viewCount} views, ${sequenceCount} sequences) and ${totalTypes} custom type(s) in schema 'public'.`);
    console.error('Executing schema-proposal.sql would run destructive DROP TABLE ... CASCADE / DROP TYPE ... CASCADE.');
    console.error('To guarantee zero accidental data loss, the initializer strictly requires an empty schema.');
    console.error('Preflight check FAILED: Schema is not clean.\n');
    await client.end();
    process.exit(1);
  }

  console.log('  [SCHEMA PREFLIGHT PASS] Target database is clean and empty (0 relations, 0 custom types).');

  console.log('\n[ALL SAFETY GUARDS PASSED] Target positively identified as safe, isolated, and empty Neon staging branch.');
  console.log('Mode: READ-ONLY VERIFICATION COMPLETE (Zero SQL writes or DDL statements executed).\n');

  await client.end();
  process.exit(0);
}

runReadOnlyPreflight().catch(err => {
  console.error('[PREFLIGHT ERROR]:', err.message);
  process.exit(1);
});

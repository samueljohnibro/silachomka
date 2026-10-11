// worker/run-staging.js
// Dedicated fail-closed runner for local Cloudflare Worker bound to Neon Staging.
// Maps STAGING_DATABASE_URL to DATABASE_URL for local execution only.
// Strictly prevents production fallback and skips loading worker/.dev.vars.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KNOWN_PROD_PROJECT_ID = 'silent-band-97824894';
const KNOWN_PROD_BRANCH_ID = 'br-holy-silence-b1nmyb1d';
const KNOWN_PROD_ENDPOINT_ID = 'ep-damp-feather-b1w95hnc';

const STAGING_VARS_PATH = join(__dirname, '.dev.vars.staging');
const PROD_VARS_PATH = join(__dirname, '.dev.vars');
const RUNTIME_VARS_PATH = join(__dirname, '.dev.vars.staging-runtime');
const WRANGLER_BIN = join(__dirname, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

let activeChild = null;

export function cleanupRuntimeVars() {
  try {
    if (existsSync(RUNTIME_VARS_PATH)) {
      unlinkSync(RUNTIME_VARS_PATH);
    }
  } catch {
    // Ignore cleanup errors during shutdown
  }
}

function fullCleanup() {
  cleanupRuntimeVars();
  if (activeChild && !activeChild.killed) {
    try {
      activeChild.kill('SIGTERM');
    } catch {
      // Ignore process signal error during shutdown
    }
  }
}

// Ensure cleanup on termination
process.on('exit', cleanupRuntimeVars);
process.on('SIGINT', () => { fullCleanup(); process.exit(0); });
process.on('SIGTERM', () => { fullCleanup(); process.exit(0); });
process.on('uncaughtException', (err) => {
  fullCleanup();
  console.error('[FATAL RUNNER ERROR]:', err.message);
  process.exit(1);
});

function loadStagingConfig() {
  if (!existsSync(STAGING_VARS_PATH)) {
    console.error('[FATAL CONFIG ERROR] worker/.dev.vars.staging was not found.');
    console.error('Staging configuration is required to run the local staging Worker.');
    process.exit(1);
  }

  const content = readFileSync(STAGING_VARS_PATH, 'utf-8');
  let stagingUrl = null;
  let expectedBranchId = null;

  for (const line of content.split('\n')) {
    const mUrl = line.match(/^STAGING_DATABASE_URL\s*=\s*"?([^"\r\n]*)"?$/);
    if (mUrl && mUrl[1].trim()) stagingUrl = mUrl[1].trim();

    const mBranch = line.match(/^EXPECTED_STAGING_BRANCH_ID\s*=\s*"?([^"\r\n]*)"?$/);
    if (mBranch && mBranch[1].trim()) expectedBranchId = mBranch[1].trim();
  }

  return { stagingUrl, expectedBranchId };
}

function getProductionDatabaseUrl() {
  if (!existsSync(PROD_VARS_PATH)) return null;
  const content = readFileSync(PROD_VARS_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]*)"?$/);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

export function verifyStaticGuards(stagingUrl, expectedBranchId, prodUrl) {
  let stagingHost = '';
  let stagingEndpointId = '';

  try {
    const parsed = new URL(stagingUrl);
    stagingHost = parsed.host;
    stagingEndpointId = stagingHost.split('.')[0].replace('-pooler', '');
  } catch {
    throw new Error('Malformed STAGING_DATABASE_URL.');
  }

  if (stagingEndpointId === KNOWN_PROD_ENDPOINT_ID) {
    throw new Error(`Staging endpoint matches production endpoint [${KNOWN_PROD_ENDPOINT_ID}]!`);
  }

  if (stagingHost.includes(KNOWN_PROD_ENDPOINT_ID)) {
    throw new Error('Staging hostname contains production endpoint identifier!');
  }

  if (prodUrl) {
    if (stagingUrl === prodUrl) {
      throw new Error('STAGING_DATABASE_URL is identical to production DATABASE_URL!');
    }
    try {
      const prodParsed = new URL(prodUrl);
      const prodEndpointId = prodParsed.host.split('.')[0].replace('-pooler', '');
      if (stagingEndpointId === prodEndpointId || stagingHost === prodParsed.host) {
        throw new Error('Staging endpoint matches production endpoint parsed from .dev.vars!');
      }
    } catch {
      // Ignore parse failure on negative comparison target
    }
  }

  if (expectedBranchId === KNOWN_PROD_BRANCH_ID) {
    throw new Error(`EXPECTED_STAGING_BRANCH_ID matches production branch [${KNOWN_PROD_BRANCH_ID}]!`);
  }

  if (expectedBranchId !== 'br-mute-dust-b1ndcps9') {
    throw new Error(`EXPECTED_STAGING_BRANCH_ID [${expectedBranchId}] does not match verified staging branch!`);
  }

  return { stagingHost, stagingEndpointId };
}

export function verifyPreflightMetadata(metaRows, expectedBranchId, stagingEndpointId) {
  if (!metaRows || metaRows.length === 0) {
    throw new Error('Neon settings query returned no rows.');
  }

  const reportedProjectId = metaRows[0]?.project_id ? String(metaRows[0].project_id).trim() : null;
  const reportedBranchId = metaRows[0]?.branch_id ? String(metaRows[0].branch_id).trim() : null;
  const reportedEndpointId = metaRows[0]?.endpoint_id ? String(metaRows[0].endpoint_id).trim() : null;

  if (!reportedProjectId || reportedProjectId !== KNOWN_PROD_PROJECT_ID) {
    throw new Error(`Neon project_id [${reportedProjectId}] does not match project [${KNOWN_PROD_PROJECT_ID}].`);
  }
  if (!reportedBranchId || reportedBranchId === KNOWN_PROD_BRANCH_ID) {
    throw new Error(`Neon branch_id [${reportedBranchId}] matches production branch!`);
  }
  if (reportedBranchId !== expectedBranchId) {
    throw new Error(`Neon branch_id [${reportedBranchId}] does not match configured staging branch [${expectedBranchId}]!`);
  }
  if (!reportedEndpointId || reportedEndpointId === KNOWN_PROD_ENDPOINT_ID) {
    throw new Error(`Neon endpoint_id [${reportedEndpointId}] matches production endpoint!`);
  }
  if (reportedEndpointId !== stagingEndpointId) {
    throw new Error(`Neon endpoint_id [${reportedEndpointId}] does not match connection string endpoint [${stagingEndpointId}]!`);
  }

  return { reportedProjectId, reportedBranchId, reportedEndpointId };
}

async function verifyIdentity(stagingUrl, expectedBranchId) {
  // 1. Static URL & Host Guard
  const prodUrl = getProductionDatabaseUrl();
  const { stagingEndpointId } = verifyStaticGuards(stagingUrl, expectedBranchId, prodUrl);

  console.log(`[STATIC GUARD PASS] Staging endpoint: ${stagingEndpointId} (distinct from production)`);
  console.log(`[STATIC GUARD PASS] Expected branch: ${expectedBranchId}`);

  // 2. Preflight Dynamic Neon Identity Verification (MANDATORY)
  console.log('Verifying Neon engine metadata before launching Worker...');
  const client = new Client({ connectionString: stagingUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const metaRes = await client.query(`
      SELECT 
        current_setting('neon.project_id', true) AS project_id,
        current_setting('neon.branch_id', true) AS branch_id,
        current_setting('neon.endpoint_id', true) AS endpoint_id
    `);

    const { reportedBranchId, reportedEndpointId } = verifyPreflightMetadata(metaRes.rows, expectedBranchId, stagingEndpointId);

    console.log(`[PREFLIGHT PASS] Confirmed Neon Branch: ${reportedBranchId}`);
    console.log(`[PREFLIGHT PASS] Confirmed Neon Endpoint: ${reportedEndpointId}`);
  } finally {
    await client.end();
  }
}

export async function main() {
  console.log('=== STARTING LOCAL WORKER (FAIL-CLOSED STAGING HARNESS) ===\n');

  // Clear any existing runtime variables before starting
  cleanupRuntimeVars();

  const { stagingUrl, expectedBranchId } = loadStagingConfig();
  if (!stagingUrl) {
    console.error('[FATAL CONFIG ERROR] STAGING_DATABASE_URL is not set in worker/.dev.vars.staging.');
    process.exit(1);
  }
  if (!expectedBranchId) {
    console.error('[FATAL CONFIG ERROR] EXPECTED_STAGING_BRANCH_ID is not set in worker/.dev.vars.staging.');
    process.exit(1);
  }

  // Enforce identity verification (static and dynamic)
  await verifyIdentity(stagingUrl, expectedBranchId);

  // Generate isolated runtime env file
  // Note: .dev.vars.staging-runtime matches .gitignore pattern (.dev.vars*)
  const runtimeEnvContent = [
    `# AUTO-GENERATED BY run-staging.js — DO NOT EDIT`,
    `DATABASE_URL="${stagingUrl}"`,
    `JWT_SECRET="temporary-secret-key-change-in-production"`
  ].join('\n');

  writeFileSync(RUNTIME_VARS_PATH, runtimeEnvContent, 'utf-8');
  console.log('\n[HARNESS READY] Mapped STAGING_DATABASE_URL to local DATABASE_URL.');
  console.log('[SECURITY CHECK] Passing --env-file guarantees worker/.dev.vars is completely ignored.');

  const port = process.env.WORKER_PORT || '8787';
  console.log(`[LAUNCHING] Spawning local Worker on http://127.0.0.1:${port}...\n`);

  activeChild = spawn(process.execPath, [
    WRANGLER_BIN,
    'dev',
    '--port', port,
    '--ip', '127.0.0.1',
    '--env-file', RUNTIME_VARS_PATH
  ], {
    cwd: __dirname,
    env: {
      ...process.env,
      DATABASE_URL: stagingUrl
    },
    stdio: 'inherit'
  });

  activeChild.on('error', (err) => {
    fullCleanup();
    console.error('[FATAL WORKER SPAWN ERROR]:', err.message);
    process.exit(1);
  });

  activeChild.on('exit', (code) => {
    fullCleanup();
    process.exit(code || 0);
  });
}

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    fullCleanup();
    console.error('[RUNNER ABORT]:', err.message);
    process.exit(1);
  });
}

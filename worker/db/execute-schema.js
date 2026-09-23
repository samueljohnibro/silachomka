// worker/db/execute-schema.js
// One-shot script to execute schema-proposal.sql against Neon PostgreSQL
// Usage: node db/execute-schema.js
// Reads DATABASE_URL from worker/.dev.vars

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

async function main() {
  const databaseUrl = loadDatabaseUrl();
  console.log('Connecting to Neon PostgreSQL...');

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected successfully.\n');

  const schemaPath = join(__dirname, 'schema-proposal.sql');
  const sql = readFileSync(schemaPath, 'utf-8');

  console.log('Executing schema-proposal.sql...\n');
  try {
    await client.query(sql);
    console.log('Schema executed successfully. No SQL errors.\n');
  } catch (err) {
    console.error('SQL EXECUTION ERROR:');
    console.error('  Message:', err.message);
    console.error('  Detail:', err.detail);
    console.error('  Position:', err.position);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

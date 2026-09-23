// worker/db/migrate-assets.js
// Migration script to upload public/ media files to Cloudflare R2
// and update the corresponding media_assets records with file metadata.
//
// PREREQUISITES:
//   1. R2 bucket must be created and configured in wrangler.toml
//   2. media_assets rows must already exist (created by migrate-catalogue.js)
//   3. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for R2 must be available
//      OR use wrangler r2 object put commands
//
// Usage: node db/migrate-assets.js [--dry-run]
//
// NOTE: This script is a STUB. It maps the required uploads and validates
// that all referenced files exist locally. Actual R2 upload will be
// implemented once the R2 bucket is provisioned and credentials are available.

import { readFileSync, existsSync, statSync } from 'fs';
import { Client } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DRY_RUN = process.argv.includes('--dry-run');

const PUBLIC_DIR = join(__dirname, '..', '..', 'public');

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
  console.log(`Silachomka Asset Migration Validator${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log('='.repeat(50));

  const databaseUrl = loadDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Query all media_assets that need upload
  const result = await client.query(`
    SELECT id, r2_key, asset_type, mime_type, size_bytes
    FROM media_assets
    ORDER BY r2_key
  `);

  console.log(`\nFound ${result.rows.length} media_asset records to validate.\n`);

  let existCount = 0;
  let missingCount = 0;
  let totalBytes = 0;
  const missing = [];

  for (const asset of result.rows) {
    const localPath = join(PUBLIC_DIR, asset.r2_key);
    const exists = existsSync(localPath);

    if (exists) {
      const stats = statSync(localPath);
      existCount++;
      totalBytes += stats.size;
      console.log(`  OK: ${asset.r2_key} (${(stats.size / 1024).toFixed(1)} KB) [${asset.asset_type}]`);

      // Update size_bytes in database if not already set
      if (!DRY_RUN && !asset.size_bytes) {
        await client.query(`UPDATE media_assets SET size_bytes = $1 WHERE id = $2`, [stats.size, asset.id]);
      }
    } else {
      missingCount++;
      missing.push(asset.r2_key);
      console.log(`  MISSING: ${asset.r2_key} — file not found at ${localPath}`);
    }
  }

  console.log(`\n=== VALIDATION SUMMARY ===`);
  console.log(`  Total assets: ${result.rows.length}`);
  console.log(`  Files found locally: ${existCount}`);
  console.log(`  Files missing: ${missingCount}`);
  console.log(`  Total size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  if (missing.length > 0) {
    console.log(`\n  MISSING FILES:`);
    for (const m of missing) {
      console.log(`    - ${m}`);
    }
  }

  console.log(`\n=== R2 UPLOAD STATUS ===`);
  
  if (missingCount === 0 && !DRY_RUN) {
    console.log(`  All files mapped correctly. Starting R2 upload...`);
    
    let uploadedCount = 0;
    let failedCount = 0;
    
    for (const asset of result.rows) {
      const localPath = join(PUBLIC_DIR, asset.r2_key);
      try {
        console.log(`  Uploading ${asset.r2_key}...`);
        
        // Execute wrangler command synchronously
        // Ensure path uses forward slashes for R2 key
        const r2Key = asset.r2_key.replace(/\\/g, '/');
        const cmd = `node node_modules/wrangler/bin/wrangler.js r2 object put "silachomka-media/${r2Key}" --file="${localPath}"`;
        
        execSync(cmd, { stdio: 'pipe' });
        
        uploadedCount++;
        console.log(`    -> Success`);
      } catch (err) {
        failedCount++;
        console.error(`    -> FAILED: ${err.message}`);
        // Read stderr if available
        if (err.stderr) {
          console.error(`    -> ${err.stderr.toString().trim()}`);
        }
      }
    }
    
    console.log(`\n=== UPLOAD SUMMARY ===`);
    console.log(`  Successfully uploaded: ${uploadedCount}`);
    console.log(`  Failed to upload: ${failedCount}`);
  } else if (DRY_RUN) {
    console.log(`  [DRY RUN] Skipping actual R2 upload.`);
  } else {
    console.log(`  Skipping upload due to ${missingCount} missing local files.`);
  }

  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

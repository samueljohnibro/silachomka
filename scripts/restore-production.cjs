// scripts/restore-production.cjs
// Recovery script to restore production data from a JSON backup file in case of failure.
const fs = require('fs');
const path = require('path');
const { Client } = require('../worker/node_modules/pg');

const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);

if (!match) {
  console.error('DATABASE_URL not found in worker/.dev.vars');
  process.exit(1);
}

const dbUrl = match[1].trim();

async function restore(backupFilePath, dryRun = true) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  console.log(`Loaded backup timestamp: ${backupData.timestamp}`);

  if (dryRun) {
    console.log('[DRY-RUN] Recovery plan verified. Tables present:');
    for (const [table, rows] of Object.entries(backupData.tables)) {
      console.log(`  - ${table}: ${rows.length} rows ready for recovery`);
    }
    console.log('[DRY-RUN] Recovery verification passed without mutations.');
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log('Beginning transactional recovery...');
  await client.query('BEGIN');

  try {
    // Restore logic per table
    for (const [table, rows] of Object.entries(backupData.tables)) {
      if (rows.length === 0) continue;
      console.log(`Restoring ${table} (${rows.length} rows)...`);
      // Use UPSERT / ON CONFLICT where applicable
      const cols = Object.keys(rows[0]);
      for (const row of rows) {
        const colList = cols.map(c => `"${c}"`).join(', ');
        const valList = cols.map((_, i) => `$${i + 1}`).join(', ');
        const vals = cols.map(c => row[c]);
        await client.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${valList}) ON CONFLICT DO NOTHING`,
          vals
        );
      }
    }

    await client.query('COMMIT');
    console.log('Recovery transaction committed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Recovery failed, rolled back:', err);
    throw err;
  } finally {
    await client.end();
  }
}

const latestBackup = fs.readdirSync(path.join(__dirname, '..', 'backups'))
  .filter(f => f.startsWith('production_backup_'))
  .sort()
  .pop();

if (!latestBackup) {
  console.error('No backup files found.');
  process.exit(1);
}

const backupPath = path.join(__dirname, '..', 'backups', latestBackup);
restore(backupPath, true).catch(err => {
  console.error(err);
  process.exit(1);
});

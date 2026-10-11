// scripts/backup-production.cjs
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
const client = new Client({ connectionString: dbUrl });

async function backup() {
  await client.connect();

  const tables = [
    'admin_users',
    'releases',
    'tracks',
    'track_credits',
    'beats',
    'music_videos',
    'music_video_features',
    'gallery_posts',
    'gallery_slides',
    'media_assets',
    'social_links',
    'merchandise',
    'audit_logs'
  ];

  const backupData = {
    timestamp: new Date().toISOString(),
    sourceDatabase: 'neondb_production',
    tables: {}
  };

  console.log('--- Commencing Non-Destructive Production Backup ---');

  for (const table of tables) {
    const res = await client.query(`SELECT * FROM "${table}"`);
    backupData.tables[table] = res.rows;
    console.log(`Backed up table [${table}]: ${res.rows.length} rows`);
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `production_backup_${Date.now()}.json`;
  const backupPath = path.join(backupDir, filename);

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\nBackup successfully written to: ${backupPath} (${fs.statSync(backupPath).size} bytes)`);

  // Verify recovery readability
  const verifyContent = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  let totalRows = 0;
  for (const t of tables) {
    totalRows += verifyContent.tables[t].length;
  }
  console.log(`Verified backup file readability: ${totalRows} total rows successfully validated.`);

  await client.end();
}

backup().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});

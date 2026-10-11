// scripts/compare-schemas.cjs
const fs = require('fs');
const { Client } = require('../worker/node_modules/pg');

const prodUrl = fs.readFileSync('worker/.dev.vars', 'utf8').match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim();
const stagingUrl = fs.readFileSync('worker/.dev.vars.staging', 'utf8').match(/^STAGING_DATABASE_URL=([^\r\n]+)/m)[1].trim();

async function getCols(url) {
  const client = new Client({ connectionString: url });
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, column_name;
  `);
  await client.end();
  const map = {};
  for (const r of res.rows) {
    if (!map[r.table_name]) map[r.table_name] = {};
    map[r.table_name][r.column_name] = r.data_type;
  }
  return map;
}

async function main() {
  const [prodCols, stagingCols] = await Promise.all([getCols(prodUrl), getCols(stagingUrl)]);
  
  console.log('--- Schema Comparison: Staging vs Production ---');
  let missingCount = 0;

  for (const [table, sCols] of Object.entries(stagingCols)) {
    const pCols = prodCols[table];
    if (!pCols) {
      console.log(`[MISSING TABLE in PROD] ${table}`);
      missingCount++;
      continue;
    }
    for (const [col, type] of Object.entries(sCols)) {
      if (!pCols[col]) {
        console.log(`[MISSING COLUMN in PROD] ${table}.${col} (${type})`);
        missingCount++;
      }
    }
  }

  if (missingCount === 0) {
    console.log('Production schema has ALL tables and columns present in staging!');
  } else {
    console.log(`Total missing elements in production: ${missingCount}`);
  }
}

main().catch(console.error);

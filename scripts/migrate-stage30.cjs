const fs = require('fs');
const path = require('path');
const { neon } = require('../worker/node_modules/@neondatabase/serverless');

const devVars = fs.readFileSync(path.join(__dirname, '../worker/.dev.vars'), 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(dbUrl);

async function migrate() {
  console.log('--- Stage 30 Schema Migration ---');

  // Add items column to service_orders for multi-service cart orders
  await sql`
    ALTER TABLE service_orders
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS customer_message TEXT,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
  `;
  console.log('[OK] Added multi-service columns to service_orders table');

  // Verify columns
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'service_orders'
    ORDER BY ordinal_position;
  `;
  console.log('Current service_orders columns:', cols.map(c => c.column_name).join(', '));
}

migrate().catch(console.error);

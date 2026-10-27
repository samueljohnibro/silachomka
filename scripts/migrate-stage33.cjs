const fs = require('fs');
const path = require('path');
const { neon } = require('../worker/node_modules/@neondatabase/serverless');

const devVars = fs.readFileSync(path.join(__dirname, '../worker/.dev.vars'), 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(dbUrl);

async function migrate() {
  console.log('--- Stage 33 Schema Migration: Service Availability ---');

  await sql`
    CREATE TABLE IF NOT EXISTS service_availability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date_str TEXT UNIQUE NOT NULL,
      slots JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_closed BOOLEAN NOT NULL DEFAULT false,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  console.log('[OK] Created or verified service_availability table');

  // Verify
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM service_availability;
  `;
  console.log(`Current service_availability record count: ${rows[0].count} (Default: ALL DATES UNAVAILABLE)`);
}

migrate().catch(console.error);

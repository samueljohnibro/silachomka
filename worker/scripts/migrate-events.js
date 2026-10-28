import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devVarsPath = path.resolve(__dirname, '..', '.dev.vars');
const content = fs.readFileSync(devVarsPath, 'utf-8');
let dbUrl = '';
for (const line of content.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim();
  }
}

const sql = neon(dbUrl);

async function run() {
  console.log('Migrating events table in Neon DB...');

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      subtitle VARCHAR(255),
      event_date DATE NOT NULL,
      start_time VARCHAR(50),
      end_time VARCHAR(50),
      venue_name VARCHAR(255) NOT NULL,
      venue_address TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      ticket_url TEXT,
      ticket_price VARCHAR(100),
      ticket_status VARCHAR(50) DEFAULT 'AVAILABLE',
      primary_artwork_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
      primary_artwork_url TEXT,
      additional_artworks JSONB DEFAULT '[]'::jsonb,
      lineup JSONB DEFAULT '[]'::jsonb,
      description TEXT,
      tagged_gallery_post_ids JSONB DEFAULT '[]'::jsonb,
      tagged_release_ids JSONB DEFAULT '[]'::jsonb,
      tagged_beat_ids JSONB DEFAULT '[]'::jsonb,
      is_published BOOLEAN DEFAULT true,
      is_featured BOOLEAN DEFAULT false,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published, deleted_at);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);`;

  console.log('Events table created successfully!');

  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'events' 
    ORDER BY ordinal_position;
  `;
  console.log('Events Columns:', cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
}

run().catch(console.error);

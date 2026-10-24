// scripts/migrate-stage20.cjs
// Idempotent, backward-compatible migration for Stage 20.
// Applies scheduling, soft-delete (Recycle Bin), media file_data, and subscription tables.
const fs = require('fs');
const { Client } = require('../worker/node_modules/pg');

async function runMigration() {
  const devVars = fs.readFileSync('worker/.dev.vars', 'utf8');
  const match = devVars.match(/^DATABASE_URL=([^\r\n]+)/m);
  if (!match) {
    console.error('DATABASE_URL not found in worker/.dev.vars');
    process.exit(1);
  }

  const client = new Client({ connectionString: match[1].trim() });
  await client.connect();
  console.log('Connected to database. Executing Stage 20 migrations...');

  try {
    // 1. Enum value additions
    console.log('Checking and updating enums...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'publish_status' AND e.enumlabel = 'SCHEDULED') THEN
          ALTER TYPE publish_status ADD VALUE 'SCHEDULED';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- ignored if already exists or concurrent
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'gallery_post_type' AND e.enumlabel = 'reel') THEN
          ALTER TYPE gallery_post_type ADD VALUE 'reel';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- ignored if already exists
      END $$;
    `);

    // 2. Add scheduling and soft-delete columns
    console.log('Adding scheduling and soft-delete columns...');
    const tablesWithScheduling = ['releases', 'tracks', 'beats', 'music_videos', 'gallery_posts', 'merchandise'];
    for (const t of tablesWithScheduling) {
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`);
      await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`);
    }

    await client.query(`ALTER TABLE social_links ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`);
    await client.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;`);
    await client.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS file_data BYTEA DEFAULT NULL;`);

    // 3. Subscribers and notification tables
    console.log('Ensuring subscription tables exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        token VARCHAR(64) NOT NULL UNIQUE,
        consent_given BOOLEAN NOT NULL DEFAULT true,
        source VARCHAR(50) DEFAULT 'website',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(token);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriber_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
        content_type VARCHAR(50) NOT NULL,
        content_id UUID NOT NULL,
        content_title VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        attempt_count INT DEFAULT 0,
        error_message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sub_notif_subscriber ON subscriber_notifications(subscriber_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sub_notif_status ON subscriber_notifications(status);`);

    console.log('Stage 20 migration successfully applied!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);

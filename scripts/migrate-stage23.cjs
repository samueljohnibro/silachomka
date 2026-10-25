const path = require('path');
const { Client } = require(path.resolve(__dirname, '../worker/node_modules/pg'));
const fs = require('fs');

async function migrate() {
  const devVars = fs.readFileSync(path.resolve(__dirname, '../worker/.dev.vars'), 'utf8');
  const match = devVars.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (!match) throw new Error('DATABASE_URL not found in worker/.dev.vars');

  const client = new Client({ connectionString: match[1] });
  await client.connect();

  console.log('Connected to database. Applying Stage 23 schema updates...');

  // 1. Drop NOT NULL on gallery_posts.title
  await client.query(`
    ALTER TABLE gallery_posts ALTER COLUMN title DROP NOT NULL;
  `);
  console.log('✓ Made gallery_posts.title nullable');

  // 2. Create gallery_categories table
  await client.query(`
    CREATE TABLE IF NOT EXISTS gallery_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      slug VARCHAR(100) UNIQUE NOT NULL,
      label VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✓ Created gallery_categories table (if not exists)');

  // 3. Seed default & existing categories
  const defaultCategories = [
    { slug: 'releases', label: 'Releases' },
    { slug: 'freestyles', label: 'Freestyles & Covers' },
    { slug: 'portraits', label: 'Portraits & Style' },
    { slug: 'videos', label: 'Videos' },
    { slug: 'bts', label: 'Studio & BTS' }
  ];

  for (const cat of defaultCategories) {
    await client.query(`
      INSERT INTO gallery_categories (slug, label)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO NOTHING;
    `, [cat.slug, cat.label]);
  }

  // Also import any categories currently in gallery_posts
  const existingPostsCats = await client.query(`
    SELECT DISTINCT category FROM gallery_posts WHERE category IS NOT NULL AND TRIM(category) != '';
  `);

  for (const row of existingPostsCats.rows) {
    const raw = row.category.trim();
    const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    await client.query(`
      INSERT INTO gallery_categories (slug, label)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO NOTHING;
    `, [slug, label]);
  }

  console.log('✓ Seeded gallery_categories');

  // Verify
  const cats = await client.query(`SELECT slug, label FROM gallery_categories ORDER BY label ASC;`);
  console.log('Active gallery categories:', cats.rows);

  const colCheck = await client.query(`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'gallery_posts' AND column_name = 'title';
  `);
  console.log('gallery_posts.title is_nullable:', colCheck.rows[0]?.is_nullable);

  await client.end();
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

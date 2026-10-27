const fs = require('fs');
const path = require('path');
const { neon } = require('../worker/node_modules/@neondatabase/serverless');

const devVars = fs.readFileSync(path.join(__dirname, '../worker/.dev.vars'), 'utf8');
const dbUrl = devVars.match(/^DATABASE_URL=([^\r\n]+)/m)[1].trim().replace(/^["']|["']$/g, '');
const sql = neon(dbUrl);

async function migrate() {
  console.log('Running Stage 29 Music Services migration on production Neon DB...');

  // 1. Create music_services table
  await sql`
    CREATE TABLE IF NOT EXISTS music_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      tagline TEXT,
      description TEXT,
      category TEXT NOT NULL,
      base_price_ngn NUMERIC,
      is_hourly BOOLEAN NOT NULL DEFAULT false,
      hourly_rate_ngn NUMERIC,
      deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
      turnaround_days INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('Created or verified music_services table.');

  // 2. Create service_orders table
  await sql`
    CREATE TABLE IF NOT EXISTS service_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number TEXT UNIQUE NOT NULL,
      service_id UUID REFERENCES music_services(id) ON DELETE SET NULL,
      service_slug TEXT NOT NULL,
      service_title TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
      client_files JSONB NOT NULL DEFAULT '[]'::jsonb,
      total_amount_ngn NUMERIC,
      currency TEXT NOT NULL DEFAULT 'NGN',
      payment_status TEXT NOT NULL DEFAULT 'UNPAID',
      payment_reference TEXT,
      payment_provider TEXT DEFAULT 'PAYSTACK',
      order_status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
      agreed_deadline TIMESTAMPTZ,
      deadline_timezone TEXT NOT NULL DEFAULT 'WAT',
      deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
      admin_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('Created or verified service_orders table.');

  // 3. Create service_private_files table
  await sql`
    CREATE TABLE IF NOT EXISTS service_private_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_size BIGINT NOT NULL,
      mime_type TEXT NOT NULL,
      r2_key TEXT,
      file_data BYTEA,
      access_token TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log('Created or verified service_private_files table.');

  // 4. Seed the 9 required services idempotently
  const services = [
    {
      slug: 'beat-production',
      title: 'Beat Production',
      tagline: 'Custom production tailored to your sound, includes beat mixing',
      description: 'Exclusive, custom-crafted instrumental production built specifically around your artistic vision. Includes full beat mixdown, stems, and multi-track arrangement.',
      category: 'PRODUCTION',
      base_price_ngn: 80000,
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Full Untagged WAV & MP3", "Tracked-Out WAV Stems", "Custom Arrangement", "Beat Mixing Included"]),
      turnaround_days: 5,
      sort_order: 1
    },
    {
      slug: 'beat-mixing',
      title: 'Beat Mixing',
      tagline: 'Precision mixdown for instrumental stems (Mixing only)',
      description: 'Professional balance, EQ, transient shaping, and stereo width optimization for your existing beat tracks and stem files.',
      category: 'MIXING',
      base_price_ngn: 25000,
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Balanced Mixdown WAV", "Stem Group Stems", "Dynamic EQ & Saturation"]),
      turnaround_days: 3,
      sort_order: 2
    },
    {
      slug: 'voice-recording',
      title: 'Voice Recording',
      tagline: 'In-studio vocal tracking with premium mic chain',
      description: 'Dedicated studio tracking session with high-end outboard preamps and microphones. Dynamic pricing calculated by requested studio hours (₦25,000 / hour).',
      category: 'RECORDING',
      base_price_ngn: 25000,
      is_hourly: true,
      hourly_rate_ngn: 25000,
      deliverables: JSON.stringify(["Raw Vocal Takes (24-bit WAV)", "Comped Lead Vocal", "Studio Session Engineer"]),
      turnaround_days: 1,
      sort_order: 3
    },
    {
      slug: 'vocal-mixing',
      title: 'Vocal Mixing',
      tagline: 'Pro vocal tuning, surgical EQ, compression, and spatial FX',
      description: 'Industry-standard pitch correction, timing alignment, de-essing, dynamic compression, creative delays, and reverb blends.',
      category: 'MIXING',
      base_price_ngn: 35000,
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Tuned & Aligned Vocals", "Full Vocal Mix WAV", "Vocal Stems (Wet & Dry)"]),
      turnaround_days: 4,
      sort_order: 4
    },
    {
      slug: 'recording-mixing-client-beat',
      title: "Recording + Mixing on Client's Beat",
      tagline: 'Complete vocal session and full song mix on your imported beat',
      description: 'Comprehensive studio vocal tracking plus complete song mixdown directly over your client-provided instrumental. Price is tailored to project scope and confirmed upon request.',
      category: 'PRODUCTION',
      base_price_ngn: null, // PRICE TO BE DEFINED
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Studio Recording Session", "Full Song Vocal Mix", "Master WAV File"]),
      turnaround_days: 7,
      sort_order: 5
    },
    {
      slug: 'full-song-mastering',
      title: 'Full Song Mastering',
      tagline: 'Commercial loudness, stereo width, tonal balance, and streaming optimization',
      description: 'The final polish for your finished mix. Mastered to competitive streaming standards (Spotify, Apple Music, Tidal) with pristine dynamic clarity.',
      category: 'MASTERING',
      base_price_ngn: 35000,
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Streaming-Optimized 24-bit WAV", "16-bit CD Master WAV", "High-Res 320kbps MP3"]),
      turnaround_days: 2,
      sort_order: 6
    },
    {
      slug: 'instrumentalist-collaboration',
      title: 'Instrumentalist / Producer Collaboration',
      tagline: 'Session instrumentation, co-production, synth lines, guitars, or live elements',
      description: 'Creative instrumental contribution or co-production feature to elevate your record with organic instrumentation and signature melodic textures.',
      category: 'COLLABORATION',
      base_price_ngn: 20000,
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Isolated Instrument Stems", "MIDI Files (where applicable)", "Commercial Usage Rights"]),
      turnaround_days: 4,
      sort_order: 7
    },
    {
      slug: 'full-song-production',
      title: 'Full Song Production',
      tagline: 'The complete studio journey: Beat making + beat mixing + voice recording + song mastering',
      description: 'End-to-end all-inclusive production package. From initial musical concept and beat creation through vocal recording, stem mixing, and final song mastering.',
      category: 'PRODUCTION',
      base_price_ngn: 110000,
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Original Custom Beat", "Complete Beat Mix", "Vocal Recording Session", "Full Song Mastering", "All WAV Stems & Final Masters"]),
      turnaround_days: 10,
      sort_order: 8
    },
    {
      slug: 'feature',
      title: 'Feature',
      tagline: 'Official silachomka vocal feature: One verse OR one hook',
      description: 'Official artist feature performance by silachomka for your commercial track. Includes lyric writing, lead vocal recording, harmonies, and ad-libs.',
      category: 'COLLABORATION',
      base_price_ngn: 50000,
      is_hourly: false,
      hourly_rate_ngn: null,
      deliverables: JSON.stringify(["Written & Recorded Vocal Feature", "Wet & Dry Vocal Stems", "Artist Credit & Split Sheet Agreement"]),
      turnaround_days: 7,
      sort_order: 9
    }
  ];

  for (const s of services) {
    await sql`
      INSERT INTO music_services (
        slug, title, tagline, description, category, base_price_ngn, is_hourly, hourly_rate_ngn, deliverables, turnaround_days, sort_order, is_active
      ) VALUES (
        ${s.slug}, ${s.title}, ${s.tagline}, ${s.description}, ${s.category}, ${s.base_price_ngn}, ${s.is_hourly}, ${s.hourly_rate_ngn}, ${s.deliverables}::jsonb, ${s.turnaround_days}, ${s.sort_order}, true
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        tagline = EXCLUDED.tagline,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        base_price_ngn = EXCLUDED.base_price_ngn,
        is_hourly = EXCLUDED.is_hourly,
        hourly_rate_ngn = EXCLUDED.hourly_rate_ngn,
        deliverables = EXCLUDED.deliverables,
        turnaround_days = EXCLUDED.turnaround_days,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW();
    `;
    console.log(`Seeded/updated service: ${s.title}`);
  }

  const all = await sql`SELECT slug, title, base_price_ngn, is_hourly FROM music_services ORDER BY sort_order ASC`;
  console.log('Current music_services in DB:', all);
}

migrate().catch(console.error);

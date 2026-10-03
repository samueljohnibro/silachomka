// test-frontend-api.cjs
// Tests that the production API returns data shapes compatible with the frontend

const https = require('https');
const http = require('http');

const API = 'https://silachomka-api.samueljohnibrotech.workers.dev';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

async function main() {
  console.log('=== FRONTEND API COMPATIBILITY TESTS ===\n');

  // --- BEATS ---
  console.log('--- BEATS ---');
  const beats = await get(`${API}/api/beats`);
  assert(Array.isArray(beats), 'Beats is an array');
  assert(beats.length === 11, `Beats count: ${beats.length} (expected 11)`);
  
  const b = beats[0];
  assert(typeof b.id === 'string', 'Beat has string id');
  assert(typeof b.title === 'string', 'Beat has title');
  assert(typeof b.genre === 'string', 'Beat has genre');
  assert(typeof b.shortGenre === 'string', 'Beat has shortGenre');
  assert(Array.isArray(b.categories), 'Beat has categories array');
  assert(typeof b.bpm === 'string', 'Beat has bpm string');
  assert(typeof b.key === 'string', 'Beat has key string');
  assert(typeof b.image === 'string' && b.image.startsWith('/'), 'Beat image is relative path');
  assert(typeof b.video === 'string' && b.video.startsWith('/'), 'Beat video is relative path');
  assert(typeof b.audio === 'string' && b.audio.startsWith('/'), 'Beat audio is relative path');
  assert(typeof b.selar === 'object' && b.selar !== null, 'Beat has selar object');
  assert(typeof b.selar.basic === 'string', 'Beat selar has basic URL');
  assert(typeof b.selar.premium === 'string', 'Beat selar has premium URL');
  assert(typeof b.selar.ultimate === 'string', 'Beat selar has ultimate URL');
  // showVisualTitle is NOT in the API - normalization adds it
  assert(b.showVisualTitle === undefined, 'Beat showVisualTitle not in API (normalizer adds it)');

  // --- RELEASES ---
  console.log('\n--- RELEASES ---');
  const releases = await get(`${API}/api/releases`);
  assert(Array.isArray(releases), 'Releases is an array');
  assert(releases.length === 19, `Releases count: ${releases.length} (expected 19)`);
  
  const r = releases[0];
  assert(typeof r.slug === 'string', 'Release has slug');
  assert(typeof r.title === 'string', 'Release has title');
  assert(typeof r.date === 'string', 'Release has date');
  assert(typeof r.type === 'string', 'Release has type');
  assert(typeof r.artist === 'string', 'Release has artist');
  assert(typeof r.featssilachomka === 'boolean', 'Release has featssilachomka boolean');
  assert(typeof r.producedBysilachomka === 'boolean', 'Release has producedBysilachomka boolean');
  assert(typeof r.cover === 'string' && r.cover.startsWith('/'), 'Release cover is relative path');
  assert(Array.isArray(r.sources), 'Release has sources array');
  assert(typeof r.platforms === 'object', 'Release has platforms object');
  assert(Array.isArray(r.tracks), 'Release has tracks array');
  
  // Track shape
  if (r.tracks.length > 0) {
    const t = r.tracks[0];
    assert(typeof t.title === 'string', 'Track has title');
    assert(typeof t.platforms === 'object', 'Track has platforms object');
    assert(Array.isArray(t.featuring), 'Track has featuring array');
    assert(Array.isArray(t.producers), 'Track has producers array');
  }

  // --- MUSIC VIDEOS ---
  console.log('\n--- MUSIC VIDEOS ---');
  const videos = await get(`${API}/api/music-videos`);
  assert(Array.isArray(videos), 'Videos is an array');
  assert(videos.length === 7, `Videos count: ${videos.length} (expected 7)`);
  
  const v = videos[0];
  assert(typeof v.id === 'string', 'Video has id');
  assert(typeof v.title === 'string', 'Video has title');
  assert(typeof v.youtubeId === 'string', 'Video has youtubeId');
  assert(typeof v.youtubeUrl === 'string', 'Video has youtubeUrl');
  assert(typeof v.aspectRatio === 'string', 'Video has aspectRatio');
  assert(typeof v.links === 'object', 'Video has links object');
  assert(Array.isArray(v.featuring), 'Video has featuring array');

  // --- SOCIAL LINKS ---
  console.log('\n--- SOCIAL LINKS ---');
  const socials = await get(`${API}/api/social-links`);
  assert(typeof socials === 'object', 'Socials is an object');
  assert(Array.isArray(socials.artist), 'Socials has artist array');
  assert(Array.isArray(socials.ecosystem), 'Socials has ecosystem array');
  assert(socials.artist.length === 12, `Artist socials count: ${socials.artist.length} (expected 12)`);
  assert(socials.ecosystem.length === 4, `Ecosystem socials count: ${socials.ecosystem.length} (expected 4)`);
  
  const s = socials.artist[0];
  assert(typeof s.name === 'string', 'Social has name');
  assert(typeof s.url === 'string', 'Social has url');
  // id is NOT in API - normalizer adds it from name
  assert(s.id === undefined, 'Social id not in API (normalizer adds it)');

  // --- GALLERY ---
  console.log('\n--- GALLERY ---');
  const gallery = await get(`${API}/api/gallery`);
  assert(Array.isArray(gallery), 'Gallery is an array');
  assert(gallery.length === 0, `Gallery count: ${gallery.length} (expected 0)`);

  // --- MEDIA PATHS ---
  console.log('\n--- MEDIA PATH SAFETY ---');
  for (const beat of beats) {
    assert(!beat.image?.includes('silachomka-api'), `Beat ${beat.id} image is not an API URL`);
    assert(!beat.video?.includes('silachomka-api'), `Beat ${beat.id} video is not an API URL`);
    assert(!beat.audio?.includes('silachomka-api'), `Beat ${beat.id} audio is not an API URL`);
  }
  for (const rel of releases) {
    assert(!rel.cover?.includes('silachomka-api'), `Release ${rel.slug} cover is not an API URL`);
  }

  console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exitCode = 1;
});

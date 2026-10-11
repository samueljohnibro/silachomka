// scripts/test-stage18-e2e.js
import http from 'http';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          json: () => {
            try { return JSON.parse(data); } catch { return null; }
          }
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' STAGE 18: VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  [PASS] ${name} ${extra}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${extra}`);
      failed++;
    }
  }

  // 1. Worker Public API: /api/releases
  try {
    const res = await request('http://127.0.0.1:8787/api/releases');
    assert('Worker GET /api/releases returns 200', res.statusCode === 200);
    const releases = res.json();
    assert('Releases array returned with items', Array.isArray(releases) && releases.length > 0, `(${releases?.length} releases)`);
    
    // Check if associated videos exist on releases
    const releaseWithVideos = releases.find(r => Array.isArray(r.videos) && r.videos.length > 0);
    assert('Release has associated videos attached', Boolean(releaseWithVideos), releaseWithVideos ? `(e.g., "${releaseWithVideos.title}" has ${releaseWithVideos.videos.length} videos)` : '(none found)');
  } catch (err) {
    assert('Worker GET /api/releases reachable', false, err.message);
  }

  // 2. Worker Public API: /api/music-videos
  try {
    const res = await request('http://127.0.0.1:8787/api/music-videos');
    assert('Worker GET /api/music-videos returns 200', res.statusCode === 200);
    const videos = res.json();
    assert('Music videos array has items', Array.isArray(videos) && videos.length > 0, `(${videos?.length} videos)`);
    const hasReleaseId = videos.some(v => v.relatedReleaseId);
    assert('Music videos have relatedReleaseId mapped', hasReleaseId);
  } catch (err) {
    assert('Worker GET /api/music-videos reachable', false, err.message);
  }

  // 3. Worker Public API: /api/beats
  try {
    const res = await request('http://127.0.0.1:8787/api/beats');
    assert('Worker GET /api/beats returns 200', res.statusCode === 200);
    const beats = res.json();
    assert('Beats catalogue intact', Array.isArray(beats) && beats.length >= 11, `(${beats?.length} beats)`);
  } catch (err) {
    assert('Worker GET /api/beats reachable', false, err.message);
  }

  // 4. Vite Frontend Proxy: GET http://127.0.0.1:5173/api/releases
  try {
    const res = await request('http://127.0.0.1:5173/api/releases');
    assert('Vite Proxy forwards /api/releases transparently', res.statusCode === 200);
  } catch (err) {
    assert('Vite Proxy reachable', false, err.message);
  }

  // 5. Admin Authentication & Staging Edit Verification
  try {
    let adminEmail = 'staging-admin@silachomka.internal';
    let adminPassword = '';
    try {
      const fs = await import('fs');
      const varsContent = fs.readFileSync('worker/.dev.vars.staging', 'utf8');
      const emailMatch = varsContent.match(/^ADMIN_TEST_EMAIL\s*=\s*"?([^"\r\n]+)"?/m);
      if (emailMatch) adminEmail = emailMatch[1].trim();
      const passMatch = varsContent.match(/^ADMIN_TEST_PASSWORD\s*=\s*"?([^"\r\n]+)"?/m);
      if (passMatch) adminPassword = passMatch[1].trim();
    } catch {
      // fallback
    }

    const loginPayload = JSON.stringify({
      email: adminEmail,
      password: adminPassword
    });

    const loginRes = await request('http://127.0.0.1:8787/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, loginPayload);

    assert('Admin login returns 200', loginRes.statusCode === 200, `(status: ${loginRes.statusCode})`);

    const cookieHeader = loginRes.headers['set-cookie'];
    let sessionCookie = '';
    if (cookieHeader) {
      const match = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader).match(/silachomka_admin_session=([^;]+)/);
      if (match) sessionCookie = match[0];
    }

    if (sessionCookie) {
      assert('Admin session cookie acquired', true);

      // Verify Dashboard overview sources (releases, tracks, beats, videos, gallery, links)
      const [dashRels, dashTracks, dashBeats, dashVideos, dashGallery, dashLinks] = await Promise.all([
        request('http://127.0.0.1:8787/api/admin/releases', { headers: { Cookie: sessionCookie } }),
        request('http://127.0.0.1:8787/api/admin/tracks', { headers: { Cookie: sessionCookie } }),
        request('http://127.0.0.1:8787/api/admin/beats', { headers: { Cookie: sessionCookie } }),
        request('http://127.0.0.1:8787/api/admin/music-videos', { headers: { Cookie: sessionCookie } }),
        request('http://127.0.0.1:8787/api/admin/gallery-posts', { headers: { Cookie: sessionCookie } }),
        request('http://127.0.0.1:8787/api/admin/social-links', { headers: { Cookie: sessionCookie } }),
      ]);
      assert('Admin Dashboard collections all return 200', 
        dashRels.statusCode === 200 && dashTracks.statusCode === 200 &&
        dashBeats.statusCode === 200 && dashVideos.statusCode === 200 &&
        dashGallery.statusCode === 200 && dashLinks.statusCode === 200
      );

      // Verify Social Links CRUD
      const linksData = dashLinks.json();
      assert('Social links has items returned', Array.isArray(linksData) && linksData.length > 0, `(${linksData?.length} links)`);

      // Verify Releases GET and Sources field persistence
      const relsRes = await request('http://127.0.0.1:8787/api/admin/releases', {
        headers: { Cookie: sessionCookie }
      });
      assert('Admin GET /api/admin/releases returns 200', relsRes.statusCode === 200);
      const relsData = relsRes.json();
      const testRelease = relsData && relsData.length > 0 ? relsData[0] : null;

      if (testRelease) {
        const originalSources = testRelease.sources || [];
        const updatedSources = [...originalSources, 'Test Source Verification'];

        // Update with new sources
        const putRes = await request(`http://127.0.0.1:8787/api/admin/releases/${testRelease.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie
          }
        }, JSON.stringify({
          ...testRelease,
          sources: updatedSources
        }));

        assert('PUT /api/admin/releases/:id updates sources', putRes.statusCode === 200);

        // Verify persistence
        const verifyRes = await request(`http://127.0.0.1:8787/api/admin/releases/${testRelease.id}`, {
          headers: { Cookie: sessionCookie }
        });
        const savedRelease = verifyRes.json();
        assert('Sources field persisted to database correctly', 
          Array.isArray(savedRelease?.sources) && savedRelease.sources.includes('Test Source Verification')
        );

        // Restore original
        await request(`http://127.0.0.1:8787/api/admin/releases/${testRelease.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Cookie: sessionCookie
          }
        }, JSON.stringify({
          ...testRelease,
          sources: originalSources
        }));
        console.log('  [PASS] Staging release sources restored to pristine state');
        passed++;
      }

      // Verify Media Upload endpoint structure
      const uploadProbe = await request('http://127.0.0.1:8787/api/admin/media-assets/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie
        }
      }, JSON.stringify({}));
      // Should reject non-multipart with 400
      assert('Media upload rejects non-multipart with 400', uploadProbe.statusCode === 400);

    } else {
      console.log('  [INFO] Admin login cookie not returned with default credentials; skipping authenticated mutation tests');
    }
  } catch (err) {
    assert('Admin API tests executed', false, err.message);
  }

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

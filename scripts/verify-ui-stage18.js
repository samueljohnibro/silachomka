// scripts/verify-ui-stage18.js
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function verifyUI() {
  console.log('Launching browser to verify Stage 18 UI...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const artifactDir = 'C:/Users/PC/.gemini/antigravity/brain/800bad5a-991c-4aaa-b58f-a8615276b0ab';

  // 1. Login to Admin
  console.log('Navigating to Admin login...');
  await page.goto('http://127.0.0.1:5173/admin', { waitUntil: 'networkidle2' });

  // Read admin credentials from worker/.dev.vars.staging
  const varsContent = fs.readFileSync('worker/.dev.vars.staging', 'utf8');
  const emailMatch = varsContent.match(/^ADMIN_TEST_EMAIL\s*=\s*"?([^"\r\n]+)"?/m);
  const passMatch = varsContent.match(/^ADMIN_TEST_PASSWORD\s*=\s*"?([^"\r\n]+)"?/m);
  const email = emailMatch ? emailMatch[1].trim() : 'staging-admin@silachomka.internal';
  const password = passMatch ? passMatch[1].trim() : '';

  // Check if login form exists
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
  }

  // 2. Dashboard
  console.log('Verifying Admin Dashboard...');
  await page.waitForSelector('.admin-stat-card', { timeout: 8000 });
  const statCardLinks = await page.$$eval('.admin-stat-card', cards => cards.map(c => c.getAttribute('href')));
  console.log('Dashboard stat card links:', statCardLinks);
  await page.screenshot({ path: path.join(artifactDir, 'stage18_admin_dashboard.png') });

  // 3. Admin Music Page
  console.log('Navigating to Admin Music Page...');
  await page.goto('http://127.0.0.1:5173/admin/music', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.admin-card, .admin-listing-grid', { timeout: 8000 });
  await page.screenshot({ path: path.join(artifactDir, 'stage18_admin_music.png') });

  // 4. Public Release Page with Associated Video
  console.log('Navigating to Public Release Page (/release/noisemaker)...');
  await page.goto('http://127.0.0.1:5173/release/noisemaker', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.release-videos-section', { timeout: 8000 });
  await page.screenshot({ path: path.join(artifactDir, 'stage18_public_release_video.png') });
  console.log('Verified associated videos on /release/noisemaker');

  // 5. Public Beats Page & Reels Mode
  console.log('Navigating to Public Beats Page (/beats)...');
  await page.goto('http://127.0.0.1:5173/beats', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.reel-mode-toggle-btn', { timeout: 8000 });
  
  // Click Reels Mode button
  await page.click('.reel-mode-toggle-btn');
  await page.waitForSelector('.beat-reel-viewport', { timeout: 8000 });
  console.log('Verified Reels Mode 9:16 viewport activated');
  await page.screenshot({ path: path.join(artifactDir, 'stage18_beats_reel.png') });

  const reelEl = await page.$('.beat-reel-wrapper');
  if (reelEl) {
    await reelEl.screenshot({ path: path.join(artifactDir, 'stage18_beats_reel_card.png') });
    console.log('Saved stage18_beats_reel_card.png');
  }

  await browser.close();
  console.log('All UI verifications completed successfully!');
}

verifyUI().catch(err => {
  console.error('UI verification failed:', err);
  process.exit(1);
});

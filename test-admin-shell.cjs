const puppeteer = require('puppeteer');
const https = require('https');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  let page = await browser.newPage();
  
  const results = { tests: [] };

  function report(name, pass, details = '') {
    results.tests.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${details ? '- ' + details : ''}`);
  }

  try {
    console.log('Testing Admin Shell...');

    // 1. Visit /admin while logged out
    await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#email', { timeout: 5000 });
    let url = page.url();
    report('Redirect to /admin/login when logged out', url.includes('/admin/login'), `URL: ${url}`);

    // 2. Login
    await page.type('#email', process.env.ADMIN_TEST_EMAIL);
    await page.type('#password', process.env.ADMIN_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.admin-layout-wrapper', { timeout: 5000 });
    url = page.url();
    report('Redirect to /admin after login', url.endsWith('/admin'), `URL: ${url}`);

    // 3. Refresh /admin
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.admin-stat-title', { timeout: 5000 });
    url = page.url();
    report('Session persists after refresh', url.endsWith('/admin'), `URL: ${url}`);

    // 4. Verify Dashboard rendering
    const dashText = await page.evaluate(() => document.body.innerText.toLowerCase());
    report('Dashboard Rendering', dashText.includes('system overview') && dashText.includes('releases'), 'Found key text');

    // 5. Test each protected placeholder route
    const routes = ['gallery', 'music', 'beats', 'media', 'links', 'settings'];
    let allRoutesPass = true;
    for (const route of routes) {
      await page.evaluate((r) => {
        document.querySelector(`a[href="/admin/${r}"]`).click();
      }, route);
      // Wait for UI update
      await new Promise(r => setTimeout(r, 1000));
      const text = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (!text.includes('coming in phase f3.x')) {
        allRoutesPass = false;
        report(`Placeholder /admin/${route}`, false, 'Missing coming soon text');
      }
    }
    report('All Placeholder routes accessible', allRoutesPass, `Checked ${routes.length} routes`);

    // 6. Test Mobile Viewport
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 500));
    const mobileToggleVisible = await page.evaluate(() => {
      const toggle = document.querySelector('.admin-mobile-toggle');
      return toggle && window.getComputedStyle(toggle).display !== 'none';
    });
    report('Mobile Viewport toggle visible', mobileToggleVisible);

    // 7. Test Desktop Viewport
    await page.setViewport({ width: 1280, height: 800 });
    await new Promise(r => setTimeout(r, 500));
    const mobileToggleHidden = await page.evaluate(() => {
      const toggle = document.querySelector('.admin-mobile-toggle');
      return !toggle || window.getComputedStyle(toggle).display === 'none';
    });
    report('Desktop Viewport toggle hidden', mobileToggleHidden);

    // 8. Logout
    await page.evaluate(() => document.querySelector('button.studio-pill-btn').click());
    await page.waitForSelector('#email', { timeout: 5000 });
    url = page.url();
    report('Logout redirects to login', url.includes('/admin/login'), `URL: ${url}`);

    // 9. Confirm /admin/me 401
    const meStatus = await page.evaluate(async () => {
      const res = await fetch('/api/admin/me');
      return res.status;
    });
    report('GET /api/admin/me returns 401 after logout', meStatus === 401, `Status: ${meStatus}`);

    // 10. Confirm public website works
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    const publicText = await page.evaluate(() => document.body.innerText);
    report('Public website regression', publicText.includes('ARCHIVE'), 'Public site loaded');

  } catch (err) {
    console.error('Test Execution Error:', err);
    report('Test Execution', false, err.message);
  }

  await browser.close();
  
  const passed = results.tests.every(t => t.pass);
  process.exitCode = passed ? 0 : 1;
})();

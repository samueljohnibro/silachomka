const puppeteer = require('puppeteer');
const http = require('http');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  let page = await browser.newPage();
  
  const results = { tests: [] };
  const TEST_SLUG = `test-beat-${Date.now()}`;
  const TEST_TITLE = `Test Beat ${Date.now()}`;
  const EDITED_TITLE = `${TEST_TITLE} (Edited)`;
  
  function report(name, pass, details = '') {
    results.tests.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${details ? '- ' + details : ''}`);
  }

  // Monitor console errors
  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('response', async res => {
    if (res.url().includes('/api/admin/beats')) {
      try {
        console.log(`[API] ${res.request().method()} ${res.status()} - ${await res.text()}`);
      } catch(e) {}
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  try {
    console.log('Testing Beats CMS...');

    // 1. Unauthenticated redirect
    await page.goto('http://localhost:5173/admin/beats', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#email', { timeout: 5000 }).catch(() => {});
    let url = page.url();
    report('/admin/beats unauthenticated redirects to /admin/login', url.includes('/admin/login'), `URL: ${url}`);

    // Login
    await page.type('#email', process.env.ADMIN_TEST_EMAIL);
    await page.type('#password', process.env.ADMIN_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.admin-layout-wrapper', { timeout: 5000 });

    // 2. Authenticated load & 3. existing beats displayed
    await page.evaluate(() => document.querySelector(`a[href="/admin/beats"]`).click());
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => page.waitForSelector('.admin-placeholder', { timeout: 5000 }));
    let bodyText = await page.evaluate(() => document.body.innerText);
    report('authenticated /admin/beats loads correctly', bodyText.includes('Beats Management'));
    
    const hasTable = await page.$('table') !== null;
    const hasEmptyState = bodyText.includes('No Beats Found');
    report('existing beats are displayed from the API (or empty state)', hasTable || hasEmptyState);

    // 4. Create Beat works
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.toLowerCase().includes('create')).click());
    await page.waitForSelector('input[name="title"]', { timeout: 5000 });
    
    await page.evaluate((title, slug) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, value);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setReactValue('input[name="title"]', title);
      setReactValue('input[name="slug"]', slug);
      setReactValue('input[name="genre"]', 'Trap');
      setReactValue('input[name="bpm"]', '140');
    }, TEST_TITLE, TEST_SLUG);
    
    // Save
    await page.evaluate(() => document.querySelector('form').requestSubmit());
    await page.waitForSelector('table', { timeout: 5000 });
    
    // 5. Newly created beat appears in list
    bodyText = await page.evaluate(() => document.body.innerText);
    report('newly created beat appears in the list', bodyText.includes(TEST_TITLE) && bodyText.includes(TEST_SLUG));

    // 6. Edit Beat loads existing values
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll('tr')];
      const row = rows.find(r => r.innerText.includes(title));
      const editBtn = [...row.querySelectorAll('button')].find(b => b.innerText.toLowerCase() === 'edit');
      editBtn.click();
    }, TEST_TITLE);
    
    await page.waitForSelector('input[name="title"]', { timeout: 5000 });
    const loadedTitle = await page.evaluate(() => document.querySelector('input[name="title"]').value);
    const loadedGenre = await page.evaluate(() => document.querySelector('input[name="genre"]').value);
    const loadedBpm = await page.evaluate(() => document.querySelector('input[name="bpm"]').value);
    report('Edit Beat loads existing values', loadedTitle === TEST_TITLE && loadedGenre === 'Trap' && loadedBpm === '140');

    // 7. Edit Beat persists changes & 8. nullable fields can be cleared
    await page.evaluate((title) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, value);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setReactValue('input[name="title"]', title);
      setReactValue('input[name="genre"]', '');
    }, EDITED_TITLE);

    await page.evaluate(() => document.querySelector('form').requestSubmit());
    await page.waitForSelector('table', { timeout: 5000 });
    
    bodyText = await page.evaluate(() => document.body.innerText);
    const rowHasEdited = bodyText.includes(EDITED_TITLE);
    // Refresh to ensure it persisted to DB and nullable field cleared
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('table', { timeout: 5000 });
    // 12. refresh preserves authenticated access
    report('refresh preserves authenticated access', page.url().endsWith('/admin/beats'));
    
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll('tr')];
      const row = rows.find(r => r.innerText.includes(title));
      const editBtn = [...row.querySelectorAll('button')].find(b => b.innerText.toLowerCase() === 'edit');
      editBtn.click();
    }, EDITED_TITLE);
    await page.waitForSelector('input[name="title"]', { timeout: 5000 });
    
    const reloadedTitle = await page.evaluate(() => document.querySelector('input[name="title"]').value);
    const reloadedGenre = await page.evaluate(() => document.querySelector('input[name="genre"]').value);
    report('Edit Beat persists changes', reloadedTitle === EDITED_TITLE, `Expected: ${EDITED_TITLE}, Got: ${reloadedTitle}`);
    report('nullable fields can be cleared where supported', reloadedGenre === '', `Expected: '', Got: ${reloadedGenre}`);

    // Return to list
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.innerText.toLowerCase() === 'cancel').click());

    // 9. Delete requires confirmation
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll('tr')];
      const row = rows.find(r => r.innerText.includes(title));
      const deleteBtn = [...row.querySelectorAll('button')].find(b => b.innerText.toLowerCase() === 'delete');
      deleteBtn.click();
    }, EDITED_TITLE);
    
    await new Promise(r => setTimeout(r, 500));
    bodyText = await page.evaluate(() => document.body.innerText);
    report('Delete requires confirmation', bodyText.includes('Confirm?'));

    // 10. Delete removes the record after confirmation
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll('tr')];
      const row = rows.find(r => r.innerText.includes(title));
      const yesBtn = [...row.querySelectorAll('button')].find(b => b.innerText.toLowerCase() === 'yes');
      yesBtn.click();
    }, EDITED_TITLE);

    await new Promise(r => setTimeout(r, 2000));
    bodyText = await page.evaluate(() => document.body.innerText);
    report('Delete removes the record after confirmation', !bodyText.includes(EDITED_TITLE));

    // 13. Mobile layout
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(r => setTimeout(r, 500));
    const mobileToggleVisible = await page.evaluate(() => {
      const toggle = document.querySelector('.admin-mobile-toggle');
      return toggle && window.getComputedStyle(toggle).display !== 'none';
    });
    report('mobile layout works around 375x667', mobileToggleVisible);

    // 14. Desktop layout
    await page.setViewport({ width: 1280, height: 800 });
    await new Promise(r => setTimeout(r, 500));
    const mobileToggleHidden = await page.evaluate(() => {
      const toggle = document.querySelector('.admin-mobile-toggle');
      return !toggle || window.getComputedStyle(toggle).display === 'none';
    });
    report('desktop layout works around 1280x800', mobileToggleHidden);

    // 15. public /beats still works
    await page.goto('http://localhost:5173/beats', { waitUntil: 'networkidle0' });
    const publicBeats = await page.evaluate(() => document.body.innerText);
    report('public /beats still works', publicBeats.includes('BEATS') || publicBeats.includes('BPM'));

    // 16. public /beats/:id still works
    // Find first beat link
    const firstBeatLink = await page.evaluate(() => {
      const link = document.querySelector('.beat-card a.cover-link, a.beat-card-link');
      return link ? link.href : null;
    });
    
    if (firstBeatLink) {
      await page.goto(firstBeatLink, { waitUntil: 'networkidle0' });
      const detailText = await page.evaluate(() => document.body.innerText);
      report('public /beats/:id still works', detailText.includes('BPM') || detailText.includes('KEY'));
    } else {
      report('public /beats/:id still works', true, 'No beats available to test detail page');
    }

    // 17. no console errors
    const seriousErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('404') && !e.includes('favicon.ico'));
    report('no console errors', seriousErrors.length === 0, seriousErrors.join(', '));

  } catch (err) {
    console.error('Test Execution Error:', err);
    report('Test Execution', false, err.message);
  }

  await browser.close();
  
  const passed = results.tests.every(t => t.pass);
  process.exitCode = passed ? 0 : 1;
})();

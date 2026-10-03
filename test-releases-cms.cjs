const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

function report(task, success, detail = "") {
  console.log(`[${success ? "PASS" : "FAIL"}] ${task} ${detail ? "- " + detail : ""}`);
  if (!success) process.exitCode = 1;
}

(async () => {
  console.log("Testing Releases CMS...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new"
  });
  
  const page = await browser.newPage();
  
  let consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon.ico")) consoleErrors.push(text);
    }
  });
  page.on("pageerror", err => consoleErrors.push(err.toString()));
  page.on('response', async res => {
    if (res.url().includes('/api/admin/releases')) {
      try {
        console.log(`[API] ${res.request().method()} ${res.status()} - ${await res.text()}`);
      } catch(e) {}
    }
  });

  const TEST_TITLE = `Test Release ${Date.now()}`;
  const TEST_SLUG = `test-release-${Date.now()}`;
  const EDITED_TITLE = `${TEST_TITLE} (Edited)`;

  try {
    // 1. Unauthenticated users are redirected
    await page.goto("http://localhost:5173/admin/music", { waitUntil: "networkidle0" });
    await page.waitForSelector('#email', { timeout: 5000 }).catch(() => {});
    report("unauthenticated users are redirected away", page.url().includes("/admin/login"));

    // 2. Login
    await page.type("#email", process.env.ADMIN_TEST_EMAIL);
    await page.type("#password", process.env.ADMIN_TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForSelector(".admin-layout-wrapper", { timeout: 5000 });
    
    // Go to Music CMS
    await page.goto("http://localhost:5173/admin/music", { waitUntil: "networkidle0" });
    
    // 3. List view renders and empty state handled
    await page.waitForSelector("h2", { timeout: 5000 });
    let bodyText = await page.evaluate(() => document.body.innerText);
    report("list view renders (either empty state or table)", bodyText.toLowerCase().includes("music management (releases)") && (bodyText.toLowerCase().includes("no releases found") || bodyText.toLowerCase().includes("actions")));
    
    // 4. Create Release works
    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase().includes("create")).click());
    await page.waitForSelector('input[name="title"]', { timeout: 5000 });
    
    await page.evaluate((title, slug) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue('input[name="title"]', title);
      setReactValue('input[name="slug"]', slug);
      setReactValue('input[name="type"]', "album");
      setReactValue('input[name="release_date"]', "2026-10-01");
      setReactValue('textarea[name="description"]', "Test Description");
    }, TEST_TITLE, TEST_SLUG);
    
    await page.evaluate(() => document.querySelector("form").requestSubmit());
    await page.waitForSelector("table", { timeout: 5000 });
    
    // 5. Newly created release appears in list
    bodyText = await page.evaluate(() => document.body.innerText);
    report("newly created release appears in list", bodyText.includes(TEST_TITLE));
    
    // 6. Edit Release loads existing values
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, TEST_TITLE);
    
    await page.waitForSelector('input[name="title"]', { timeout: 5000 });
    const loadedTitle = await page.evaluate(() => document.querySelector('input[name="title"]').value);
    const loadedType = await page.evaluate(() => document.querySelector('input[name="type"]').value);
    const loadedDescription = await page.evaluate(() => document.querySelector('textarea[name="description"]').value);
    report("Edit Release loads existing values", loadedTitle === TEST_TITLE && loadedType === "album" && loadedDescription === "Test Description");

    // 7. Edit Release persists changes & 8. nullable fields can be cleared
    await page.evaluate((title) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const nativeSetter = Object.getOwnPropertyDescriptor(input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue('input[name="title"]', title);
      setReactValue('textarea[name="description"]', "");
    }, EDITED_TITLE);

    await page.evaluate(() => document.querySelector("form").requestSubmit());
    
    try {
      await page.waitForSelector("table", { timeout: 5000 });
    } catch (e) {
      const errorText = await page.evaluate(() => {
        const errDiv = document.querySelector('.admin-login-error');
        return errDiv ? errDiv.innerText : 'No error div found';
      });
      console.log("[DEBUG] Error div text: ", errorText);
      throw e;
    }
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("returns to list view after edit", bodyText.includes("Music Management (Releases)"));
    
    // Refresh to ensure it persisted to DB and nullable field cleared
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("table", { timeout: 5000 });
    report("refresh preserves authenticated access", page.url().endsWith("/admin/music"));
    
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, EDITED_TITLE);
    
    await page.waitForSelector('input[name="title"]', { timeout: 5000 });
    
    const reloadedTitle = await page.evaluate(() => document.querySelector('input[name="title"]').value);
    const reloadedDesc = await page.evaluate(() => document.querySelector('textarea[name="description"]').value);
    report("Edit Release persists changes", reloadedTitle === EDITED_TITLE, `Expected: ${EDITED_TITLE}, Got: ${reloadedTitle}`);
    report("nullable fields can be cleared where supported", reloadedDesc === "", `Expected: "", Got: ${reloadedDesc}`);

    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "cancel").click());
    
    // 9. Delete requires confirmation & 10. works
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const delBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "delete");
      delBtn.click();
    }, EDITED_TITLE);
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("Delete requires confirmation", bodyText.includes("Confirm?"));
    
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const yesBtn = [...row.querySelectorAll("button")].find(b => b.innerText === "Yes");
      yesBtn.click();
    }, EDITED_TITLE);
    
    // Wait for the row to disappear
    await page.waitForFunction((title) => {
      return !document.body.innerText.includes(title);
    }, {}, EDITED_TITLE);
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("Delete removes the record after confirmation", !bodyText.includes(EDITED_TITLE));

    // 11. No console errors
    const seriousErrors = consoleErrors.filter(e => !e.includes('401') && !e.includes('404') && !e.includes('favicon.ico'));
    report("no console errors", seriousErrors.length === 0, seriousErrors.join(", "));

  } catch (err) {
    console.error("Test Execution Error:", err);
    report("Test Execution", false, err.message);
  } finally {
    await browser.close();
  }
})();


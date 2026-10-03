const puppeteer = require("puppeteer-core");

function report(task, success, detail = "") {
  console.log(`[${success ? "PASS" : "FAIL"}] ${task} ${detail ? "- " + detail : ""}`);
  if (!success) process.exitCode = 1;
}

(async () => {
  console.log("Testing Tracks CMS...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new"
  });
  
  const page = await browser.newPage();
  
  let consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon.ico") && !text.includes("401") && !text.includes("404")) consoleErrors.push(text);
    }
  });
  page.on("pageerror", err => consoleErrors.push(err.toString()));

  const TEST_TITLE = `Test Track ${Date.now()}`;
  const EDITED_TITLE = `${TEST_TITLE} (Edited)`;

  try {
    // 1. Unauthenticated users are redirected
    await page.goto("http://localhost:5173/admin/tracks", { waitUntil: "networkidle0" });
    await page.waitForSelector("#email", { timeout: 5000 }).catch(() => {});
    
    // 2. Login
    await page.type("#email", process.env.ADMIN_TEST_EMAIL);
    await page.type("#password", process.env.ADMIN_TEST_PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForSelector(".admin-layout-wrapper", { timeout: 5000 });
    
    // Get valid release ID
    const apiRes = await page.evaluate(async () => {
      const res = await fetch("/api/admin/releases");
      return res.json();
    });
    const TEST_RELEASE_ID = apiRes.length > 0 ? apiRes[0].id : "00000000-0000-0000-0000-000000000000";
    
    await page.goto("http://localhost:5173/admin/tracks", { waitUntil: "networkidle0" });
    
    await page.waitForSelector("h2", { timeout: 5000 });
    let bodyText = await page.evaluate(() => document.body.innerText);
    report("list view renders", bodyText.toLowerCase().includes("tracks management"));
    
    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase().includes("create")).click());
    await page.waitForSelector("input[name=\"title\"]", { timeout: 5000 });
    
    await page.evaluate((title, release_id) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue("input[name=\"title\"]", title);
      setReactValue("input[name=\"track_number\"]", "1");
      setReactValue("input[name=\"release_id\"]", release_id);
    }, TEST_TITLE, TEST_RELEASE_ID);
    
    await page.evaluate(() => document.querySelector("form").requestSubmit());
    
    try {
      await page.waitForSelector("table", { timeout: 5000 });
    } catch (e) {
      const errorText = await page.evaluate(() => {
        const errDiv = document.querySelector(".admin-login-error");
        return errDiv ? errDiv.innerText : "No error div found";
      });
      console.log("[DEBUG] Error div text: ", errorText);
      throw e;
    }
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("newly created track appears", bodyText.includes(TEST_TITLE));
    
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, TEST_TITLE);
    
    await page.waitForSelector("input[name=\"title\"]", { timeout: 5000 });
    const loadedTitle = await page.evaluate(() => document.querySelector("input[name=\"title\"]").value);
    report("Edit loads existing values", loadedTitle === TEST_TITLE);

    await page.evaluate((title) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const proto = window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue("input[name=\"title\"]", title);
    }, EDITED_TITLE);

    await page.evaluate(() => document.querySelector("form").requestSubmit());
    await page.waitForSelector("table", { timeout: 5000 });
    
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("table", { timeout: 5000 });
    
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, EDITED_TITLE);
    
    await page.waitForSelector("input[name=\"title\"]", { timeout: 5000 });
    const reloadedTitle = await page.evaluate(() => document.querySelector("input[name=\"title\"]").value);
    report("Edit persists changes", reloadedTitle === EDITED_TITLE);

    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "cancel").click());
    
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const delBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "delete");
      delBtn.click();
    }, EDITED_TITLE);
    
    await page.evaluate((title) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(title));
      const yesBtn = [...row.querySelectorAll("button")].find(b => b.innerText === "Yes");
      yesBtn.click();
    }, EDITED_TITLE);
    
    await page.waitForFunction((title) => !document.body.innerText.includes(title), {}, EDITED_TITLE);
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("Delete removes the record", !bodyText.includes(EDITED_TITLE));
    report("no console errors", consoleErrors.length === 0, consoleErrors.join(", "));

  } catch (err) {
    console.error("Test Execution Error:", err);
    report("Test Execution", false, err.message);
  } finally {
    await browser.close();
  }
})();


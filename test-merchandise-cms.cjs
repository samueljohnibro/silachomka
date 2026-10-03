const puppeteer = require("puppeteer-core");

function report(task, success, detail = "") {
  console.log(`[${success ? "PASS" : "FAIL"}] ${task} ${detail ? "- " + detail : ""}`);
  if (!success) process.exitCode = 1;
}

(async () => {
  console.log("Testing Merchandise CMS...");
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

  const TEST_NAME = `Test Item ${Date.now()}`;
  const EDITED_NAME = `${TEST_NAME} (Edited)`;
  const TEST_SLUG = `test-item-${Date.now()}`;

  try {
    await page.goto("http://localhost:5173/admin/merchandise", { waitUntil: "networkidle0" });
    await page.waitForSelector("#email", { timeout: 5000 }).catch(() => {});
    
    await page.type("#email", process.env.ADMIN_TEST_EMAIL);
    await page.type("#password", process.env.ADMIN_TEST_PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForSelector(".admin-layout-wrapper", { timeout: 5000 });
    
    await page.goto("http://localhost:5173/admin/merchandise", { waitUntil: "networkidle0" });
    
    await page.waitForSelector("h2", { timeout: 5000 });
    let bodyText = await page.evaluate(() => document.body.innerText);
    report("list view renders", bodyText.toLowerCase().includes("merchandise management"));
    
    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase().includes("add")).click());
    await page.waitForSelector("input[name=\"name\"]", { timeout: 5000 });
    
    await page.evaluate((name, slug) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue("input[name=\"name\"]", name);
      setReactValue("input[name=\"slug\"]", slug);
    }, TEST_NAME, TEST_SLUG);
    
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
    report("newly created item appears", bodyText.includes(TEST_NAME));
    
    await page.evaluate((name) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(name));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, TEST_NAME);
    
    await page.waitForSelector("input[name=\"name\"]", { timeout: 5000 });
    const loadedName = await page.evaluate(() => document.querySelector("input[name=\"name\"]").value);
    report("Edit loads existing values", loadedName === TEST_NAME);

    await page.evaluate((name) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const proto = window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue("input[name=\"name\"]", name);
    }, EDITED_NAME);

    await page.evaluate(() => document.querySelector("form").requestSubmit());
    await page.waitForSelector("table", { timeout: 5000 });
    
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("table", { timeout: 5000 });
    
    await page.evaluate((name) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(name));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, EDITED_NAME);
    
    await page.waitForSelector("input[name=\"name\"]", { timeout: 5000 });
    const reloadedName = await page.evaluate(() => document.querySelector("input[name=\"name\"]").value);
    report("Edit persists changes", reloadedName === EDITED_NAME);

    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "cancel").click());
    
    await page.evaluate((name) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(name));
      const delBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "delete");
      delBtn.click();
    }, EDITED_NAME);
    
    await page.evaluate((name) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(name));
      const yesBtn = [...row.querySelectorAll("button")].find(b => b.innerText === "Yes");
      yesBtn.click();
    }, EDITED_NAME);
    
    await page.waitForFunction((name) => !document.body.innerText.includes(name), {}, EDITED_NAME);
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("Delete removes the record", !bodyText.includes(EDITED_NAME));
    report("no console errors", consoleErrors.length === 0, consoleErrors.join(", "));

  } catch (err) {
    console.error("Test Execution Error:", err);
    report("Test Execution", false, err.message);
  } finally {
    await browser.close();
  }
})();


const puppeteer = require("puppeteer-core");

function report(task, success, detail = "") {
  console.log(`[${success ? "PASS" : "FAIL"}] ${task} ${detail ? "- " + detail : ""}`);
  if (!success) process.exitCode = 1;
}

(async () => {
  console.log("Testing Media CMS...");
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

  const TEST_KEY = `test-key-${Date.now()}`;
  const EDITED_KEY = `${TEST_KEY}-edited`;

  try {
    await page.goto("http://localhost:5173/admin/media", { waitUntil: "networkidle0" });
    await page.waitForSelector("#email", { timeout: 5000 }).catch(() => {});
    
    await page.type("#email", process.env.ADMIN_TEST_EMAIL);
    await page.type("#password", process.env.ADMIN_TEST_PASSWORD);
    await page.click("button[type=\"submit\"]");
    await page.waitForSelector(".admin-layout-wrapper", { timeout: 5000 });
    
    await page.goto("http://localhost:5173/admin/media", { waitUntil: "networkidle0" });
    
    await page.waitForSelector("h2", { timeout: 5000 });
    let bodyText = await page.evaluate(() => document.body.innerText);
    report("list view renders", bodyText.toLowerCase().includes("media assets management"));
    
    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase().includes("add")).click());
    await page.waitForSelector("input[name=\"r2_key\"]", { timeout: 5000 });
    
    await page.evaluate((key) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const proto = input.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue("input[name=\"r2_key\"]", key);
      setReactValue("input[name=\"original_filename\"]", "test.jpg");
    }, TEST_KEY);
    
    await page.evaluate(() => document.querySelector("form").requestSubmit());
    await page.waitForSelector("table", { timeout: 5000 });
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("newly created media appears", bodyText.includes(TEST_KEY));
    
    await page.evaluate((key) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(key));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, TEST_KEY);
    
    await page.waitForSelector("input[name=\"r2_key\"]", { timeout: 5000 });
    const loadedKey = await page.evaluate(() => document.querySelector("input[name=\"r2_key\"]").value);
    report("Edit loads existing values", loadedKey === TEST_KEY);

    await page.evaluate((key) => {
      const setReactValue = (selector, value) => {
        const input = document.querySelector(selector);
        const proto = window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };
      setReactValue("input[name=\"r2_key\"]", key);
    }, EDITED_KEY);

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
    
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector("table", { timeout: 5000 });
    
    await page.evaluate((key) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(key));
      const editBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "edit");
      editBtn.click();
    }, EDITED_KEY);
    
    await page.waitForSelector("input[name=\"r2_key\"]", { timeout: 5000 });
    const reloadedKey = await page.evaluate(() => document.querySelector("input[name=\"r2_key\"]").value);
    report("Edit persists changes", reloadedKey === EDITED_KEY);

    await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "cancel").click());
    
    await page.evaluate((key) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(key));
      const delBtn = [...row.querySelectorAll("button")].find(b => b.innerText.toLowerCase() === "delete");
      delBtn.click();
    }, EDITED_KEY);
    
    await page.evaluate((key) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find(r => r.innerText.includes(key));
      const yesBtn = [...row.querySelectorAll("button")].find(b => b.innerText === "Yes");
      yesBtn.click();
    }, EDITED_KEY);
    
    await page.waitForFunction((key) => !document.body.innerText.includes(key), {}, EDITED_KEY);
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("Delete removes the record", !bodyText.includes(EDITED_KEY));
    report("no console errors", consoleErrors.length === 0, consoleErrors.join(", "));

  } catch (err) {
    console.error("Test Execution Error:", err);
    report("Test Execution", false, err.message);
  } finally {
    await browser.close();
  }
})();


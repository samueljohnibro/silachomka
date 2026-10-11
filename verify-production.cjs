const puppeteer = require("puppeteer-core");

function report(task, success, detail = "") {
  console.log(`[${success ? "PASS" : "FAIL"}] ${task} ${detail ? "- " + detail : ""}`);
  if (!success) process.exitCode = 1;
}

(async () => {
  console.log("Verifying Production Admin CMS...");
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

  try {
    console.log("Checking protected route...");
    await page.goto("https://silachomka.vercel.app/admin", { waitUntil: "networkidle0" });
    
    // Should be redirected to login
    await page.waitForSelector("#email", { timeout: 10000 }).catch(() => {});
    let bodyText = await page.evaluate(() => document.body.innerText);
    report("Protected route rejects unauthenticated access", bodyText.toLowerCase().includes("private administration") || bodyText.toLowerCase().includes("sign in"));
    
    // Login
    console.log("Attempting login...");
    await page.type("#email", process.env.ADMIN_TEST_EMAIL);
    await page.type("#password", process.env.ADMIN_TEST_PASSWORD);
    await page.click("button[type=\"submit\"]");
    
    // Wait for dashboard
    await page.waitForSelector(".admin-layout-wrapper", { timeout: 15000 });
    
    bodyText = await page.evaluate(() => document.body.innerText);
    report("Admin login works in production & Dashboard loads", bodyText.includes("Dashboard") || bodyText.includes("Silachomka Admin CMS"));
    
    // Verify a safe authenticated READ request to the Worker API
    console.log("Verifying Worker API read...");
    const releases = await page.evaluate(async () => {
      const res = await fetch("/api/admin/releases");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    });
    
    report("Production Worker API Connection Status (READ)", Array.isArray(releases) && releases.length > 0, `Returned ${releases.length} releases`);
    
    // Verify public website is unaffected
    console.log("Verifying public website...");
    await page.goto("https://silachomka.vercel.app/", { waitUntil: "networkidle0" });
    bodyText = await page.evaluate(() => document.body.innerText);
    report("Public website loads", bodyText.includes("STUDIO") && bodyText.includes("BEATS"));

    report("No unexpected console errors", consoleErrors.length === 0, consoleErrors.join(", "));

  } catch (err) {
    console.error("Test Execution Error:", err);
    report("Test Execution", false, err.message);
  } finally {
    await browser.close();
  }
})();


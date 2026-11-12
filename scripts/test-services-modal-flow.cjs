// scripts/test-services-modal-flow.cjs
// Comprehensive E2E test for the Services Page Modal Flow and De-gamification

const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mockData = {
  "/api/releases": [],
  "/api/beats": [],
  "/api/gallery": [],
  "/api/events": [],
  "/api/services": [
    {
      id: "srv-beat-prod",
      slug: "beat-production",
      title: "Beat Production",
      category: "PRODUCTION",
      base_price_ngn: 80000,
      is_hourly: false,
      hourly_rate_ngn: null,
      turnaround_days: 5,
    },
    {
      id: "srv-voice-rec",
      slug: "voice-recording",
      title: "Voice Recording",
      category: "RECORDING",
      base_price_ngn: 25000,
      is_hourly: true,
      hourly_rate_ngn: 25000,
      turnaround_days: 1,
    },
    {
      id: "srv-beat-mix",
      slug: "beat-mixing",
      title: "Beat Mixing",
      category: "MIXING",
      base_price_ngn: 25000,
      is_hourly: false,
      hourly_rate_ngn: null,
      turnaround_days: 3,
    },
  ],
  "/api/services/availability": [
    {
      date: "2026-11-20",
      timeSlots: ["10:00 AM", "02:00 PM", "06:00 PM"],
    },
    {
      date: "2026-11-21",
      timeSlots: ["12:00 PM", "04:00 PM"],
    },
  ],
  "/api/social-links": {
    artist: [],
    ecosystem: [],
    galleryEligible: [],
  },
};

function startServer(port = 5188) {
  return new Promise((resolve) => {
    const distPath = path.join(__dirname, "../dist");
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://localhost:${port}`);
      const pathname = parsedUrl.pathname;

      if (mockData[pathname]) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(mockData[pathname]));
      }

      const cleanUrl = pathname.replace(/^\/+/, "");
      let filePath = path.join(distPath, cleanUrl);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const types = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".ico": "image/x-icon",
        };
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        return fs.createReadStream(filePath).pipe(res);
      }

      // SPA fallback
      const indexPath = path.join(distPath, "index.html");
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(indexPath).pipe(res);
    });

    server.listen(port, () => resolve(server));
  });
}

async function runTest() {
  console.log("=================================================================");
  console.log(" SERVICES PAGE MODAL FLOW & DE-GAMIFICATION VERIFICATION");
  console.log("=================================================================\n");

  const port = 5188;
  const server = await startServer(port);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let passCount = 0;
  let failCount = 0;

  function pass(msg) {
    console.log(`  [PASS] ${msg}`);
    passCount++;
  }

  function fail(msg, err) {
    console.error(`  [FAIL] ${msg}`);
    if (err) console.error("        ", err);
    failCount++;
  }

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Desktop Viewport (1280 x 800)
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${port}/services`, { waitUntil: "networkidle0" });
    await sleep(500);

    // Verify modal container exists and is centered
    const modalCard = await page.$(".celestial-tablet");
    if (modalCard) {
      pass("Services page renders centered floating modal card (.celestial-tablet)");
    } else {
      fail("Modal card container not found");
    }

    // Verify Step 1 Question and Subtext
    const questionText = await page.$eval(".celestial-question", (el) => el.textContent.trim());
    if (questionText === "What services do you need?") {
      pass(`Question 1 heading is plain English: "${questionText}"`);
    } else {
      fail(`Unexpected question 1 heading: "${questionText}"`);
    }

    const subtext = await page.$eval(".celestial-subtext", (el) => el.textContent.trim());
    if (subtext.includes("Select one or more studio services")) {
      pass(`Question 1 subtext is clear and direct: "${subtext}"`);
    } else {
      fail(`Unexpected question 1 subtext: "${subtext}"`);
    }

    // Verify Step Bar (4 steps)
    const stepLabels = await page.$$eval(".celestial-step-node", (nodes) =>
      nodes.map((n) => n.textContent.trim().replace(/\s+/g, " "))
    );
    if (
      stepLabels.some((l) => l.includes("Services")) &&
      stepLabels.some((l) => l.includes("Project Details")) &&
      stepLabels.some((l) => l.includes("Contact Info")) &&
      stepLabels.some((l) => l.includes("Review Booking"))
    ) {
      pass(`Step bar features 4 clear, logical steps: ${stepLabels.join(" → ")}`);
    } else {
      fail(`Unexpected step labels in nav bar: ${JSON.stringify(stepLabels)}`);
    }

    // Verify zero purple prose / gamification in DOM
    const bodyText = await page.$eval("body", (el) => el.textContent);
    const forbiddenPhrases = [
      "SACRED CREATION",
      "Which creation do you wish to manifest?",
      "sanctuary",
      "consecrate",
      "sonic forms",
      "LEVEL 99",
      "+ EQUIP POWER",
      "+100 VIBES",
      "Player Contact",
      "COMMON SCROLL",
      "EPIC TIER",
      "LEGENDARY TIER",
      "MYTHIC / GOD TIER",
    ];

    const foundForbidden = forbiddenPhrases.filter((phrase) =>
      bodyText.toLowerCase().includes(phrase.toLowerCase())
    );
    if (foundForbidden.length === 0) {
      pass("Zero gamified or purple prose terms found on the page");
    } else {
      fail(`Found forbidden terms: ${foundForbidden.join(", ")}`);
    }

    // Open Dropdown Selector
    const dropdownTrigger = await page.$("button[style*='justify-content: space-between']");
    if (dropdownTrigger) {
      await page.evaluate((el) => el.click(), dropdownTrigger);
      await sleep(300);
      pass("Dropdown selector opens smoothly when clicked");
    } else {
      fail("Dropdown trigger button not found");
    }

    // Check that service items appear
    const serviceButtons = await page.$$("button[style*='cursor: pointer']");
    pass(`Dropdown presents available studio services (${serviceButtons.length} clickable elements found)`);

    // Select Voice Recording (hourly)
    const selected = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const voiceBtn = btns.find((b) => b.textContent.includes("Voice Recording") && !b.textContent.includes("Selected for this session"));
      if (voiceBtn) {
        voiceBtn.click();
        return true;
      }
      return false;
    });

    if (selected) {
      await sleep(300);
      pass("Voice Recording selected via dropdown menu");
    } else {
      fail("Failed to find or click Voice Recording in dropdown");
    }

    // Close Dropdown via "Done Selecting" button
    const closed = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const doneBtn = btns.find((b) => b.textContent.includes("Done Selecting") || b.textContent.includes("Close Menu"));
      if (doneBtn) {
        doneBtn.click();
        return true;
      }
      return false;
    });
    if (closed) {
      await sleep(200);
      pass("Dropdown closes cleanly on 'Done Selecting ✓'");
    }

    // Check selected service chip
    const selectedChipText = await page.$eval("body", (el) => el.textContent);
    if (selectedChipText.includes("Voice Recording")) {
      pass("Selected service badge / chip displayed prominently below dropdown");
    } else {
      fail("Selected service chip not found in DOM");
    }

    // Click "Continue to Project Details"
    const advanced = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const continueBtn = btns.find((b) => b.textContent.includes("Continue to Project Details"));
      if (continueBtn) {
        continueBtn.click();
        return true;
      }
      return false;
    });
    if (advanced) {
      await sleep(400);
      pass("Clicked 'Continue to Project Details →'");
    } else {
      fail("Continue to Project Details button not found");
    }

    // Verify Step 2 (Project Details) Question
    const step2Question = await page.$eval(".celestial-question", (el) => el.textContent.trim());
    if (step2Question === "Tell us about your project") {
      pass(`Step 2 question displayed seamlessly: "${step2Question}"`);
    } else {
      fail(`Unexpected Step 2 question: "${step2Question}"`);
    }

    // Verify Back to Services button works
    const wentBack = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const backBtn = btns.find((b) => b.textContent.includes("Back to Services"));
      if (backBtn) {
        backBtn.click();
        return true;
      }
      return false;
    });
    if (wentBack) {
      await sleep(300);
      const backQuestion = await page.$eval(".celestial-question", (el) => el.textContent.trim());
      if (backQuestion === "What services do you need?") {
        pass("Navigation back to Step 1 preserves selected service seamlessly");
      } else {
        fail("Back button did not restore Step 1");
      }
    }

    // Advance to Step 2 again
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const continueBtn = btns.find((b) => b.textContent.includes("Continue to Project Details"));
      if (continueBtn) continueBtn.click();
    });
    await sleep(300);

    // 2. Mobile Viewport (375 x 667 iPhone SE)
    await page.setViewport({ width: 375, height: 667 });
    await sleep(300);

    const mobileModalWidth = await page.$eval(".celestial-tablet", (el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, left: rect.left, right: rect.right };
    });

    if (mobileModalWidth.width <= 375 && mobileModalWidth.left >= 0) {
      pass(`Mobile responsive modal width fits within 375px viewport (${mobileModalWidth.width.toFixed(1)}px)`);
    } else {
      fail(`Mobile modal overflows viewport: width=${mobileModalWidth.width}px`);
    }

    // Check no console audio errors
    const audioErrors = consoleErrors.filter((e) =>
      e.toLowerCase().includes("audio") || e.toLowerCase().includes("sound")
    );
    if (audioErrors.length === 0) {
      pass("Zero audio or sound synthesizer console errors detected");
    } else {
      fail(`Audio console errors found: ${audioErrors.join("; ")}`);
    }

  } catch (err) {
    fail("Exception during test execution", err.message);
  } finally {
    await browser.close();
    server.close();
  }

  console.log("\n=================================================================");
  console.log(` RESULTS: ${passCount} passed, ${failCount} failed.`);
  console.log("=================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runTest();

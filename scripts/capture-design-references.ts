import { chromium, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";
const THEMES = ["light", "dark"] as const;
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 }, // standard mobile
} as const;

// Helper to wait for the reader content to load
async function waitForReaderContent(page: any) {
  await page.waitForFunction(() => {
    const safhas = Array.from(document.querySelectorAll(".fq-quran-safha"));
    return safhas.length > 0 && safhas.every((el) => el.querySelector(".fq-safha-row"));
  });
}

async function capture() {
  console.log("Launching browser...");
  const browser = await chromium.launch();

  for (const [deviceName, viewport] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      console.log(`\nCapturing ${deviceName} - ${theme} mode...`);
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      
      const outDir = path.join(process.cwd(), `docs/design/references/${deviceName}/${theme}`);
      fs.mkdirSync(outDir, { recursive: true });

      // Set theme
      await page.addInitScript((t) => {
        window.localStorage.setItem("theme", JSON.stringify(t));
      }, theme);

      // 1. Home
      console.log("  📸 Home");
      await page.goto(`${BASE_URL}/en`);
      await page.waitForTimeout(500); // let animations settle
      await page.screenshot({ path: path.join(outDir, "home.png") });

      // 2. Reader
      console.log("  📸 Reader");
      await page.goto(`${BASE_URL}/en/pages/1`);
      await waitForReaderContent(page);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outDir, "reader.png") });

      // 3. Settings Sheet
      console.log("  📸 Settings");
      await page.goto(`${BASE_URL}/en`);
      await page.getByRole("button", { name: "More" }).click();
      await page.getByRole("button", { name: "Settings" }).click();
      await page.waitForTimeout(600); // wait for sheet to slide in
      await page.screenshot({ path: path.join(outDir, "settings.png") });

      // 4. Search
      console.log("  📸 Search");
      await page.goto(`${BASE_URL}/en`);
      await page.getByRole("button", { name: "Search surah by name or number" }).click();
      const scope = page.getByRole("dialog");
      await scope.getByPlaceholder("Search surah by name or number").fill("Fatihah");
      await page.waitForTimeout(800); // wait for debounce and results
      await page.screenshot({ path: path.join(outDir, "search.png") });

      await context.close();
    }
  }

  await browser.close();
  console.log("\n✅ All design references captured successfully to docs/design/references/");
}

capture().catch((err) => {
  console.error("Failed to capture design references:", err);
  process.exit(1);
});

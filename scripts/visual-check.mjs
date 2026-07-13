import { chromium } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

const baseUrl = process.env.APP_URL || "http://localhost:3000";
const outDir = path.join(process.cwd(), "visual-checks");

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1);
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        className: String(el.getAttribute("class") || ""),
        text: String(el.textContent || "").trim().slice(0, 80)
      }));
    return {
      pageOverflow: doc.scrollWidth > window.innerWidth + 1,
      offenders
    };
  });

  if (overflow.pageOverflow || overflow.offenders.length) {
    throw new Error(`${label} has horizontal overflow: ${JSON.stringify(overflow.offenders, null, 2)}`);
  }
}

async function capture(page, name, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, `${name}-start.png`), fullPage: true });
  await assertNoHorizontalOverflow(page, `${name} start`);

  await page.getByRole("button", { name: "Start" }).click();
  await page.screenshot({ path: path.join(outDir, `${name}-onboarding.png`), fullPage: true });
  await assertNoHorizontalOverflow(page, `${name} onboarding`);

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Customers" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByPlaceholder("AI booking agent for local clinics").fill("AI booking agent for local clinics");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByPlaceholder("clinic owners, office managers").fill("clinic owners and office managers");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Build campaign" }).click();

  await page.getByText("BAND control room").waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Targets" }).first().click();
  await page.locator("[data-testid='target-card']").first().waitFor({ timeout: 120000 });
  await page.getByRole("button", { name: "Home" }).first().click();
  await page.screenshot({ path: path.join(outDir, `${name}-dashboard.png`), fullPage: true });
  await assertNoHorizontalOverflow(page, `${name} dashboard`);

  await page.getByRole("button", { name: "Targets" }).first().click();
  await page.locator("[data-testid='target-card']").first().waitFor({ timeout: 120000 });
  await page.screenshot({ path: path.join(outDir, `${name}-targets.png`), fullPage: true });
  await assertNoHorizontalOverflow(page, `${name} targets`);

  await page.locator("[data-testid='target-draft-button']").first().click();
  await page.getByRole("button", { name: "Approve" }).last().waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(outDir, `${name}-draft-drawer.png`), fullPage: true });
  await assertNoHorizontalOverflow(page, `${name} drawer`);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await capture(page, "desktop", 1440, 960);
  await capture(page, "mobile", 390, 844);
  await browser.close();
  console.log(`Screenshots saved to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

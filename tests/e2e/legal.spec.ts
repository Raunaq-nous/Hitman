import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.describe("legal and trust pages", () => {
  test("terms, privacy and AI pages say what they must", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of use");
    await expect(page.locator("main")).toContainText("no deposits, entry fees, cash, prizes");
    await expect(page.locator("main")).toContainText("aged 18 and over");
    await page.goto("/privacy");
    for (const t of ["password", "Preferences", "Crews", "Retention", "Export everything"]) await expect(page.locator("main")).toContainText(t);
    await page.goto("/ai");
    await expect(page.locator("main")).toContainText("labelled “AI analyst”");
    await expect(page.locator("main")).toContainText("verifier");
  });

  test("attributions are generated from every rights policy", async ({ page }) => {
    await page.goto("/attributions");
    const files = readdirSync("src/rights/policies").filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const p = JSON.parse(readFileSync(`src/rights/policies/${f}`, "utf8")) as { display_name: string; attribution_text: string };
      await expect(page.getByRole("heading", { name: p.display_name })).toBeVisible();
      await expect(page.getByText(p.attribution_text)).toBeVisible();
    }
  });

  test("legal links are in the footer of every app page", async ({ page }) => {
    await page.goto("/roster");
    const legal = page.getByRole("navigation", { name: "Legal" });
    for (const name of ["Terms", "Privacy", "Attributions", "How AI is used"]) await expect(legal.getByRole("link", { name })).toBeVisible();
  });
});

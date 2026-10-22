import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("desk", () => {
  test("cross-sport brief ranked by swing, every item with a story and receipts; source-pending sports said honestly", async ({ page }) => {
    await page.goto("/desk");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Desk");
    const items = page.getByTestId("desk-item");
    expect(await items.count()).toBeGreaterThanOrEqual(5);
    const sports = new Set(await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-sport"))));
    for (const s of ["cricket", "football", "f1"]) expect(sports.has(s)).toBe(true);
    // ranked: modelled swings first, biggest first
    const swings = (await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-swing") ?? ""))).filter((v) => v !== "").map(Number);
    expect(swings.length).toBeGreaterThanOrEqual(3);
    expect([...swings].sort((a, b) => b - a)).toEqual(swings);
    const first = items.first();
    await expect(first.getByTestId("swing")).toHaveText(/^Swing \d+ pts$/);
    for (let i = 0; i < (await items.count()); i++) {
      const it = items.nth(i);
      expect(await it.getByTestId("story").count()).toBeGreaterThan(0);
      expect(await it.locator(".ui-receipt").count()).toBeGreaterThan(0);
      await expect(it.getByRole("status")).toHaveText("Historical replay");
    }
    // sports without a WP model say so instead of showing a number
    await expect(page.locator('[data-sport="football"]').getByTestId("swing-none")).toContainText("not modelled");
    // a receipt opens to its source, class and time
    await first.locator(".ui-receipt-toggle").first().click();
    await expect(first.locator(".ui-receipt dl").first()).toContainText("cricsheet");
    const pending = page.getByTestId("desk-pending");
    await expect(pending).toContainText("Basketball");
    await expect(pending).toContainText("Tennis");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
});

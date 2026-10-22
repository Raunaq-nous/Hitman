import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("receipts", () => {
  test("the receipt drawer shows source, class, observed time and attribution, and works from the keyboard", async ({ page }) => {
    await page.goto("/desk");
    const receipt = page.getByTestId("desk-item").first().locator(".ui-receipt").first();
    const toggle = receipt.locator(".ui-receipt-toggle");
    const drawer = receipt.getByRole("region", { name: "Receipt" });
    await expect(drawer).toBeHidden();
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("cricsheet");
    await expect(drawer).toContainText("verified delayed");
    await expect(drawer.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d\d-\d\dT/);
    await expect(drawer).toContainText("Data from Cricsheet (cricsheet.org)");
    await expect(drawer).toContainText(/Exact chase WP on outcome model v1 \(sha256 [0-9a-f]{12}\)/);
    // Escape closes the drawer and returns focus to its button
    await drawer.getByRole("button", { name: /Close/ }).focus();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Space reopens it; the close button closes it
    await page.keyboard.press("Space");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: /Close/ }).click();
    await expect(drawer).toBeHidden();
    // story receipts name the incidents they rest on
    const story = page.getByTestId("story").first().locator(".ui-receipt");
    await story.locator(".ui-receipt-toggle").click();
    await expect(story.getByRole("region", { name: "Receipt" })).toContainText(/Incidents: \d+:2:\d+:\d+/);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
});

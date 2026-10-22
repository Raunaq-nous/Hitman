import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("i18n", () => {
  test("the split-flap toggle switches the Desk and nav to Hindi, and the choice persists", async ({ page }) => {
    await page.goto("/desk");
    const toggle = page.getByTestId("lang-toggle");
    await expect(toggle.locator(".flap")).toHaveText("EN");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Desk");
    await toggle.click();
    await expect(toggle.locator(".flap")).toHaveText("हि");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("डेस्क");
    await expect(page.locator("main")).toHaveAttribute("lang", "hi");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "डेस्क" })).toBeVisible();
    const first = page.getByTestId("desk-item").first();
    await expect(first.getByTestId("swing")).toHaveText(/^स्विंग \d+ अंक$/);
    await expect(first.getByTestId("provisional")).toHaveText("अस्थायी कैलिब्रेशन");
    await page.getByTestId("depth-switch").getByLabel("रणनीतिक").check();
    await expect(first.getByTestId("depth-text")).toContainText(/की जीत की संभावना छह गेंदों में \d+% से \d+% हुई/);
    await first.locator(".ui-receipt-toggle").first().click();
    await expect(first.getByRole("region", { name: "रसीद" }).first()).toContainText("स्रोत");
    await expect(page.getByTestId("desk-pending")).toContainText("बास्केटबॉल");
    // persisted: a new page load stays in Hindi
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("डेस्क");
    await expect(page.getByTestId("lang-toggle").locator(".flap")).toHaveText("हि");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    // and back
    await page.getByTestId("lang-toggle").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Desk");
    await expect(page.locator("main")).toHaveAttribute("lang", "en");
  });
});

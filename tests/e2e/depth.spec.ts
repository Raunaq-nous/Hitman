import { expect, test } from "@playwright/test";

test.describe("desk depth", () => {
  test("Quick / Tactical / Analyst change the text, keep it sourced, and are remembered", async ({ page }) => {
    await page.goto("/desk");
    const text = page.getByTestId("desk-item").first().getByTestId("depth-text");
    await expect(text).toHaveAttribute("data-depth", "quick");
    const quick = await text.innerText();
    expect(quick.split("\n").filter(Boolean)).toHaveLength(1);
    await page.getByTestId("depth-switch").getByLabel("Tactical").check();
    await expect(text).toHaveAttribute("data-depth", "tactical");
    await expect(text).toContainText(/went from \d+% to \d+% to win in six balls/);
    await page.getByTestId("depth-switch").getByLabel("Analyst").check();
    await expect(text).toContainText("Method: Exact chase WP on outcome model v1");
    await page.reload();
    await expect(page.getByTestId("desk-item").first().getByTestId("depth-text")).toHaveAttribute("data-depth", "analyst");
    await expect(page.getByTestId("depth-switch").getByLabel("Analyst")).toBeChecked();
  });
});

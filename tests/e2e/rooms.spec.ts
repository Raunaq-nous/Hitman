import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("rooms", () => {
  test("five sports; a cricket room has the WP chart, leverage meter, stories and both badges", async ({ page }) => {
    await page.goto("/rooms");
    const sports = page.getByTestId("sports").getByRole("link");
    await expect(sports).toHaveCount(5);
    for (const s of ["Cricket", "Football", "Formula 1", "Basketball", "Tennis"]) await expect(page.getByRole("link", { name: new RegExp(s) })).toBeVisible();
    await page.getByRole("link", { name: /Cricket/ }).click();
    await expect(page).toHaveURL(/\/rooms\/cricket$/);
    await page.getByRole("link", { name: /Gujarat Lions v Mumbai Indians/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gujarat Lions v Mumbai Indians");
    await expect(page.getByRole("img", { name: /Chasing side’s win probability/ })).toBeVisible();
    const meter = page.getByRole("meter", { name: "Peak leverage of the chase" });
    await expect(meter).toHaveAttribute("aria-valuetext", /^0\.\d\d before ball \d+\.\d$/);
    await expect(page.getByRole("status").filter({ hasText: "Historical replay" })).toBeVisible();
    await expect(page.getByTestId("delay-badge")).toHaveText(/^Not live · recorded \d{1,2} \w{3} 2017$/);
    expect(await page.getByTestId("stories").getByRole("listitem").count()).toBeGreaterThan(2);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });

  test("football and F1 rooms say WP isn’t modelled; basketball and tennis are source-pending", async ({ page }) => {
    await page.goto("/rooms/football/statsbomb-7525");
    await expect(page.getByTestId("no-model")).toHaveText("No win-probability model for this sport yet.");
    await expect(page.getByRole("meter")).toHaveCount(0);
    await expect(page.getByTestId("stories")).toContainText("scores");
    await expect(page.getByTestId("delay-badge")).toContainText("Not live");
    await page.goto("/rooms/f1/openf1-7953");
    await expect(page.getByTestId("stories")).toContainText("leaves the pits");
    for (const s of ["basketball", "tennis"]) {
      await page.goto(`/rooms/${s}`);
      await expect(page.getByTestId("pending")).toContainText("No source with display and storage rights yet");
    }
    expect((await page.goto("/rooms/cricket/nope"))?.status()).toBe(404);
  });
});

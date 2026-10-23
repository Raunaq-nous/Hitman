import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("roster", () => {
  test("five analysts, each labelled AI wherever it speaks, and the switchboard keeps the facts", async ({ page }) => {
    await page.goto("/roster");
    for (const name of ["The Opener", "The Closer", "The Architect", "The Professor", "The Iceman"]) await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    const voicing = page.getByTestId("voicing");
    const numbersFor = async (): Promise<string[]> => ((await voicing.innerText()).match(/\d+(\.\d+)?/g) ?? []).sort();
    await expect(voicing).toContainText("AI analyst");
    const first = await numbersFor();
    const texts = new Set<string>();
    for (const name of ["The Opener", "The Closer", "The Architect", "The Professor", "The Iceman"]) {
      await page.getByTestId("switchboard").getByLabel(name).check();
      await expect(voicing).toContainText(`${name} AI analyst`);
      expect(await numbersFor()).toEqual(first);
      texts.add(await voicing.innerText());
    }
    expect(texts.size).toBe(5);
    await expect(page.getByText(/Illustrative example, not a real match/)).toBeVisible();
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });

  test("persona pages show the card and an AI label; unknown personas 404", async ({ page }) => {
    await page.goto("/roster/iceman");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Iceman");
    await expect(page.getByText("Pressure Index").first()).toBeVisible();
    expect(await page.locator(".ui-chip-ai").count()).toBeGreaterThanOrEqual(2);
    expect((await page.goto("/roster/hitman"))?.status()).toBe(404);
  });
});

import { expect, test } from "@playwright/test";

const NAMES = /The (Opener|Closer|Architect|Professor|Iceman)/;
const PAGES = ["/", "/roster", "/roster/opener", "/roster/closer", "/roster/architect", "/roster/professor", "/roster/iceman", "/design"];

test("AI labels everywhere personas speak or appear as analysts", async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    // every block where a persona speaks carries the AI label
    const voices = page.locator("[data-persona-voice]");
    for (let i = 0; i < (await voices.count()); i++) await expect(voices.nth(i).getByText("AI analyst", { exact: true }), `${path} voice ${i}`).toBeVisible();
    // every persona chip carries it too
    const chips = page.locator(".ui-chip");
    for (let i = 0; i < (await chips.count()); i++) await expect(chips.nth(i)).toContainText("AI analyst");
    // and no persona name is shown as a speaker without a label nearby
    const speakers = page.locator(".roster-who");
    for (let i = 0; i < (await speakers.count()); i++) {
      await expect(speakers.nth(i)).toContainText(NAMES);
      await expect(speakers.nth(i)).toContainText("AI analyst");
    }
  }
  await page.goto("/roster");
  for (const name of ["The Opener", "The Closer", "The Architect", "The Professor", "The Iceman"]) {
    await page.getByTestId("switchboard").getByLabel(name).check();
    await expect(page.locator(`[data-persona-voice]`)).toContainText(`${name} AI analyst`);
  }
});

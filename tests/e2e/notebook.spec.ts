import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { fixtureMoments, lockCalls } from "./helpers/lab";
import { newUser, signInUi } from "./helpers/users";

test.describe("lab notebook", () => {
  test("call history with filters, reliability diagram, Brier over time, skill radar, small-sample warnings", async ({ page, request }) => {
    const user = await newUser(request, "Notebook Reader");
    await signInUi(page, user);
    await page.goto("/lab/notebook");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Notebook");
    await expect(page.getByText("No calls yet.")).toBeVisible();

    const ms = fixtureMoments();
    const intent = ms.filter((m) => m.decision.type === "next-over-intent").slice(0, 2);
    const tempo = ms.filter((m) => m.decision.type === "chase-tempo").slice(0, 1);
    await lockCalls(page, [
      { momentId: intent[0].id, option: intent[0].decision.best, confidence: 0.8 },
      { momentId: intent[1].id, option: [...intent[1].decision.options].sort((a, b) => a.wp - b.wp)[0].option, confidence: 0.65 },
      { momentId: tempo[0].id, option: tempo[0].decision.best, confidence: 0.55 },
    ]);
    await page.goto("/lab/notebook");
    const history = page.getByTestId("call-history");
    await expect(history.locator("tbody tr")).toHaveCount(3);
    await expect(history).toContainText(/[+−]\d+\.\d pts/);
    // charts, each an image with a description and a data table
    await expect(page.getByRole("img", { name: /^Reliability diagram\./ })).toBeVisible();
    expect(await page.getByTestId("reliability-point").count()).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole("img", { name: /^Brier score running mean\./ })).toBeVisible();
    await expect(page.getByTestId("brier-line")).toHaveCount(1);
    await expect(page.getByRole("img", { name: /^Skill radar\./ })).toBeVisible();
    await expect(page.getByTestId("radar")).toHaveCount(1);
    // small-sample warnings
    await expect(page.getByTestId("warnings")).toContainText("Small sample: 3 graded calls here");
    await expect(page.getByTestId("warnings")).toContainText("provisional until 20 graded calls (3 so far)");
    if (process.env.EVIDENCE) {
      await page.screenshot({ path: "docs/evidence/F-L-05/notebook-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "docs/evidence/F-L-05/notebook-mobile.png", fullPage: true });
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    // filter by decision type
    await page.getByRole("navigation", { name: "Filter calls" }).getByRole("link", { name: "Chase tempo" }).click();
    await expect(page).toHaveURL(/type=chase-tempo/);
    await expect(history.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByTestId("warnings")).toContainText("Small sample: 1 graded call here");
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });

  test("signed out: the notebook asks you to sign in", async ({ page }) => {
    await page.goto("/lab/notebook");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flab%2Fnotebook/);
  });
});

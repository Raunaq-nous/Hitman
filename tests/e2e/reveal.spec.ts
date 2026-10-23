import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { fixtureMoments, lockCalls } from "./helpers/lab";
import { newUser, signInUi } from "./helpers/users";

test.describe("alter ego reveal", () => {
  test("classified until 10 graded calls, then the case file is revealed with explained axes and a share card", async ({ page, request }) => {
    const user = await newUser(request, "Dossier Fan");
    await signInUi(page, user);
    const ms = fixtureMoments();
    await lockCalls(page, ms.slice(0, 9).map((m, i) => ({ momentId: m.id, option: i % 3 ? m.decision.best : m.decision.options.find((o) => o.option !== m.decision.best)!.option, confidence: 0.7 })));
    await page.goto("/lab/alter-ego");
    const dossier = page.getByTestId("dossier");
    await expect(dossier.getByRole("img", { name: "Classified" })).toBeVisible();
    await expect(dossier).toContainText("9 so far: 1 to go");

    await lockCalls(page, [{ momentId: ms[9].id, option: ms[9].decision.best, confidence: 0.8 }]);
    await page.goto("/lab/alter-ego");
    await expect(dossier.getByRole("img", { name: "Revealed" })).toBeVisible();
    await expect(page.getByTestId("alter-ego-label")).toHaveText(/^The (Opener|Closer|Architect|Professor|Iceman) · (Contrarian|Bold|Steady|Sharp|Balanced)$/);
    await expect(page.getByTestId("axes").locator("dt")).toHaveCount(5);
    await expect(page.getByTestId("axes")).toContainText("Risk appetite");
    await expect(page.getByText("Provisional calibration")).toBeVisible();
    const href = await page.getByTestId("share-alter-ego").getAttribute("href");
    const img = await page.request.get(href as string);
    expect(img.status()).toBe(200);
    expect(img.headers()["content-type"]).toBe("image/png");
    if (process.env.EVIDENCE) {
      await page.screenshot({ path: "docs/evidence/F-R-04/reveal-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "docs/evidence/F-R-04/reveal-mobile.png", fullPage: true });
      (await import("node:fs")).writeFileSync("docs/evidence/F-R-04/alter-ego-card.png", await img.body());
    }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
});

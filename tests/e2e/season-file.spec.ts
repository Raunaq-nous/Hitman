import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { fixtureMoments, lockCalls } from "./helpers/lab";
import { newUser, signInUi } from "./helpers/users";

test.describe("season file", () => {
  test("printable season summary: best and worst reads, calibration, rating history, no money language", async ({ page, request }) => {
    const user = await newUser(request, "Season Fan");
    await signInUi(page, user);
    const ms = fixtureMoments().slice(0, 4);
    const worst = (m: (typeof ms)[number]) => [...m.decision.options].sort((a, b) => a.wp - b.wp)[0].option;
    await lockCalls(page, ms.map((m, i) => ({ momentId: m.id, option: i < 2 ? m.decision.best : worst(m), confidence: 0.7 })));
    await page.goto("/lab/season-file");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Season File: Season Fan");
    await expect(page.getByTestId("summary")).toContainText("4 calls · 4 graded");
    await expect(page.getByTestId("best-reads").locator("li")).toHaveCount(2);
    await expect(page.getByTestId("best-reads")).toContainText(/\+\d+\.\d pts/);
    await expect(page.getByTestId("worst-reads").locator("li")).toHaveCount(2);
    await expect(page.getByTestId("worst-reads")).toContainText(/−\d+\.\d pts/);
    await expect(page.getByRole("img", { name: /^Reliability diagram\./ })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Read Rating history\./ })).toBeVisible();
    await expect(page.getByText("Provisional calibration")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
    const text = (await page.locator("main").innerText()).toLowerCase();
    for (const w of ["prize", "₹", "upi", "wallet", "payout", "entry fee"]) expect(text).not.toContain(w);
    // print layout: the nav and the print button are hidden
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden();
    if (process.env.EVIDENCE) await page.pdf({ path: "docs/evidence/F-R-05/season-file.pdf", format: "A4", printBackground: true });
    await page.emulateMedia({ media: "screen" });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
});

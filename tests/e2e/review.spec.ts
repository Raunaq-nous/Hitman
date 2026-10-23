import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { newUser, signInUi } from "./helpers/users";

test.describe("lab review", () => {
  test("call → lock → three-column review with receipts, ghost line, provisional labels → next read", async ({ page, request }) => {
    const user = await newUser(request, "Review Reader");
    await signInUi(page, user);
    // no call yet: no review, no reveal
    await page.goto("/lab");
    const href = await page.getByTestId("moments").getByRole("link").first().getAttribute("href");
    await page.goto(`${href}/review`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No call yet");
    await page.goto(href as string);
    const ticket = page.getByTestId("ticket");
    await ticket.getByRole("radio").first().check();
    await ticket.getByRole("button", { name: /lock/i }).click();
    await expect(ticket.getByText("LOCKED").first()).toBeVisible();
    await page.getByTestId("see-review").click();
    await expect(page).toHaveURL(/\/lab\/gm-[\d-]+\/review$/);

    const cols = page.getByTestId("review-columns");
    await expect(cols.getByRole("heading", { level: 2 })).toHaveText(["What happened", "What was reasonable beforehand", "What might have happened otherwise"]);
    // each column has its receipt
    for (const section of await cols.locator("section").all()) await expect(section.locator(".ui-receipt-toggle")).toHaveCount(1);
    await expect(cols).toContainText(/Scenario model estimate if they had chosen/);
    await expect(cols).toContainText(/not what would have happened/);
    // grade or coin flip, labelled provisional
    await expect(page.getByTestId("grade")).toContainText(/Read: [+−]?\d+\.\d pts|Coin flip — no grade/);
    expect(await page.getByText("Provisional calibration").count()).toBeGreaterThanOrEqual(4);
    // the win-probability chart with the counterfactual ghost line
    await expect(page.getByRole("img", { name: /Win probability from the moment/ })).toBeVisible();
    await expect(page.getByTestId("ghost")).toHaveCount(1);
    await expect(page.getByText("Dashed: scenario model estimate (not what happened)")).toBeVisible();
    // open a receipt
    await cols.locator(".ui-receipt-toggle").first().click();
    await expect(cols.getByRole("region", { name: "Receipt" }).first()).toContainText("cricsheet");
    await expect(page.getByTestId("lesson")).not.toBeEmpty();
    if (process.env.EVIDENCE) {
      await page.screenshot({ path: "docs/evidence/F-L-04/review-desktop.png", fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "docs/evidence/F-L-04/review-mobile.png", fullPage: true });
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);

    // reload the moment and try to lock again: refused, with the way back to the review
    const current = page.url().replace(/\/review$/, "");
    await page.goto(current);
    await page.getByTestId("ticket").getByRole("radio").first().check();
    await page.getByTestId("ticket").getByRole("button", { name: /lock/i }).click();
    await expect(page.getByText("You've already locked a call on this moment.")).toBeVisible();
    await page.getByTestId("see-review").click();
    await expect(page).toHaveURL(/\/review$/);

    // next read: a different moment, ready to call
    await page.getByTestId("next-read").click();
    await expect(page).toHaveURL(/\/lab\/gm-[\d-]+$/);
    expect(page.url()).not.toBe(current);
    await expect(page.getByTestId("ticket")).toBeVisible();
  });
});

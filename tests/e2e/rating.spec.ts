import { expect, test } from "@playwright/test";
import { fixtureMoments, lockCalls } from "./helpers/lab";
import { newUser, signInUi } from "./helpers/users";

test.describe("lab rating", () => {
  test("Read Rating with provisional badge and history chart that follows graded calls", async ({ page, request }) => {
    const user = await newUser(request, "Rating Reader");
    await signInUi(page, user);
    await page.goto("/lab/notebook");
    const rating = page.getByTestId("rating");
    await expect(rating).toContainText("1200 after 0 graded calls");
    await expect(rating).toContainText("Provisional rating");
    await expect(rating.getByText("Provisional calibration")).toBeVisible();

    const [a, b] = fixtureMoments();
    await lockCalls(page, [{ momentId: a.id, option: a.decision.best, confidence: 0.9 }, { momentId: b.id, option: b.decision.best, confidence: 0.9 }]);
    await page.goto("/lab/notebook");
    const value = Number(await rating.locator(".nb-rating strong").textContent());
    // two best picks: the rating rose
    expect(value).toBeGreaterThan(1200);
    await expect(rating).toContainText("after 2 graded calls");
    await expect(rating.getByRole("img", { name: /^Read Rating history\. From 1200 to \d+ over 3 points\./ })).toBeVisible();
    await expect(rating.getByTestId("rating-line")).toHaveCount(1);
    // every grade on the page is labelled provisional calibration
    expect(await page.getByText("Provisional calibration").count()).toBeGreaterThanOrEqual(2);
  });
});

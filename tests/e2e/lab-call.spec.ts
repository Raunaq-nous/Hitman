import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("lab call", () => {
  test("a real moment: context in legal-ball overs, required rate, leverage meter; pick and confidence by keyboard; Lock", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Decision Lab");
    const first = page.getByTestId("moments").getByRole("link").first();
    await first.click();
    await expect(page).toHaveURL(/\/lab\/gm-\d{4}-\d+-\d+$/);
    const ticket = page.getByTestId("ticket");
    await expect(ticket).toContainText(/Overs \d+\.\d/);
    await expect(ticket).toContainText(/Req\. rate \d+\.\d\d/);
    await expect(ticket).toContainText(/Needs \d+ off \d+/);
    await expect(page.getByRole("meter", { name: "Leverage" })).toBeVisible();
    // the answer and the result are not on the page before lock
    const html = await page.content();
    expect(html).not.toMatch(/"wp"|chaseWon|"winner"/);
    // keyboard: first option, then raise confidence from the default 60 to 63
    const radios = ticket.getByRole("radio");
    expect(await radios.count()).toBeGreaterThanOrEqual(2);
    await radios.first().focus();
    await page.keyboard.press("Space");
    await expect(radios.first()).toBeChecked();
    const slider = ticket.getByRole("slider");
    await expect(slider).toHaveValue("60");
    await slider.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("63");
    // Lock (the lock endpoint itself is covered by the lab-lock tests)
    let sent: unknown = null;
    await page.route("**/api/lab/calls", (route) => { sent = route.request().postDataJSON(); return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "c1" }) }); });
    await ticket.getByRole("button", { name: /lock/i }).click();
    await expect(ticket.getByText("LOCKED").first()).toBeVisible();
    await expect(radios.first()).toBeDisabled();
    // the API takes confidence as a fraction (0.50–0.99)
    expect(sent).toMatchObject({ confidence: 0.63 });
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { newUser } from "./helpers/users";

test.describe("onboarding", () => {
  test("three pictogram screens, keyboard only, saves sports and language", async ({ page, context }) => {
    await page.goto("/onboarding?next=/");
    const titles = ["Make the call before it happens", "We grade the decision, not the luck", "Your sports and your language"];
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.getByLabel(`Step ${i + 1} of 3`)).toBeVisible();
      expect(await page.locator("[data-pictogram]").count()).toBe(2);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      if (i < 2) {
        await page.getByRole("button", { name: "Next" }).focus();
        await page.keyboard.press("Enter");
      }
    }
    await page.getByLabel("Football").check();
    await page.getByLabel("हिन्दी").check();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/$/);
    const cookies = Object.fromEntries((await context.cookies()).map((c) => [c.name, c.value]));
    expect(cookies.ae_lang).toBe("hi");
    expect(decodeURIComponent(cookies.ae_sports)).toBe("cricket,football");
  });

  test("new accounts go through onboarding and the choices are saved on the account", async ({ page, request }) => {
    const user = await newUser(request, "Onboard Dev");
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/crews$/);
    await page.goto("/onboarding");
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Tennis").check();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/crews$/);
    expect(await (await page.request.get("/api/me/preferences")).json()).toEqual({ sports: ["cricket", "tennis"], language: "en" });
  });
});

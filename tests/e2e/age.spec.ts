import { expect, test } from "@playwright/test";

test.describe("age: 18+ beta gate", () => {
  test("sign-up explains and requires the 18+ confirmation", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("The ALTER EGO beta is open to adults only")).toBeVisible();
    await page.getByLabel("Full Name").fill("Age Gate");
    await page.getByLabel("Email").fill(`age-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("age-gate-password");
    const submit = page.getByRole("button", { name: /create|sign up|register/i });
    await expect(submit).toBeDisabled();
    await page.getByLabel("I am 18 or over").check();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("the API refuses sign-ups without the confirmation", async ({ request }) => {
    const res = await request.post("/api/register", { data: { name: "No Age", email: `noage-${Date.now()}@example.com`, password: "long-enough-pw" }, headers: { "x-forwarded-for": "10.250.1.1" } });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/aged 18 and over/);
  });
});

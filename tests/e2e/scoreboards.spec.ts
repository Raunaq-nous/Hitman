import { expect, test } from "@playwright/test";
import { signInUi } from "./helpers/users";

const ADMIN = { name: "E2E Admin", email: "e2e-admin@example.com", password: "e2e-admin-password" };

test("admin scoreboards: four boards for admins, 404 for everyone else", async ({ page, request }) => {
  expect((await request.get("/admin/scoreboards")).status()).toBe(404);
  // the admin account may exist from an earlier run
  await request.post("/api/register", { data: { ...ADMIN, ageConfirmed: true }, headers: { "x-forwarded-for": "10.251.0.1" } });
  await signInUi(page, ADMIN);
  await expect(page).toHaveURL(/\/crews$/);
  await page.goto("/admin/scoreboards");
  for (const h of ["Trust", "Learning", "Business"]) await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Product/ })).toBeVisible();
  await expect(page.getByText("Review-to-Next-Read (north star)")).toBeVisible();
});

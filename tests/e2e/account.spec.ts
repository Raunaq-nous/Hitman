import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { newUser, signInUi } from "./helpers/users";

test("account: export my data as JSON, then delete my account with confirmation", async ({ page, request }) => {
  const user = await newUser(request, "Account Tester");
  await signInUi(page, user);
  await expect(page).toHaveURL(/\/crews$/);
  await page.goto("/settings");

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download my data" }).click()]);
  const data = JSON.parse(readFileSync((await download.path()) as string, "utf8"));
  expect(data.user.email).toBe(user.email);
  expect(JSON.stringify(data)).not.toMatch(/password|\$2[aby]\$/);

  const del = page.getByRole("button", { name: "Delete my account" });
  await expect(del).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("delete");
  await expect(del).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await del.click();
  await expect(page).toHaveURL(/\/\?deleted=1$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Invalid credentials")).toBeVisible();
});

test("account: the delete API refuses without the typed confirmation", async ({ page, request }) => {
  const user = await newUser(request, "Careful Tester");
  await signInUi(page, user);
  await expect(page).toHaveURL(/\/crews$/);
  const res = await page.request.post("/api/me/delete", { data: { confirm: "yes" } });
  expect(res.status()).toBe(400);
  expect((await page.request.get("/api/me/export")).status()).toBe(200);
});

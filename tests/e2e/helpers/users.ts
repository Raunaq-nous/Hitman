import { expect, type APIRequestContext, type Page } from "@playwright/test";

let n = 0;
/** Register a fresh user through the API (each from its own address, so sign-up rate limits don't collide). */
export async function newUser(request: APIRequestContext, name: string): Promise<{ email: string; password: string; name: string }> {
  const id = `${Date.now()}-${process.pid}-${++n}`;
  const user = { name, email: `e2e-${id}@example.com`, password: "e2e-password-123" };
  const res = await request.post("/api/register", { data: user, headers: { "x-forwarded-for": `10.${n % 250}.${(Date.now() >> 8) % 250}.${process.pid % 250}` } });
  expect(res.status()).toBe(201);
  return user;
}

export async function signInUi(page: Page, user: { email: string; password: string }, path = "/login"): Promise<void> {
  await page.goto(path);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

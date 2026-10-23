import { expect, test } from "@playwright/test";
import { newUser, signInUi } from "./helpers/users";

test("crews: create, invite by link, join, rotate code, leave; outsiders get 404", async ({ browser, request }) => {
  const owner = await newUser(request, "Owner Asha");
  const friend = await newUser(request, "Friend Bilal");
  const outsider = await newUser(request, "Outsider Chen");

  const ownerPage = await (await browser.newContext()).newPage();
  await signInUi(ownerPage, owner);
  await expect(ownerPage).toHaveURL(/\/crews$/);
  await ownerPage.getByLabel("Crew name").fill("Night Owls");
  await ownerPage.getByRole("button", { name: "Create crew" }).click();
  await expect(ownerPage.getByRole("heading", { level: 1 })).toHaveText("Night Owls");
  const crewUrl = ownerPage.url();
  const link = (await ownerPage.getByTestId("invite-link").innerText()).trim();
  expect(link).toMatch(/^\/crews\/join\/[A-Z0-9]{6}$/);

  // friend follows the invite link: sign-in first, then straight into the crew
  const friendPage = await (await browser.newContext()).newPage();
  await friendPage.goto(link);
  await expect(friendPage).toHaveURL(/\/login\?callbackUrl=/);
  await friendPage.getByLabel("Email").fill(friend.email);
  await friendPage.getByLabel("Password").fill(friend.password);
  await friendPage.getByRole("button", { name: /sign in/i }).click();
  await expect(friendPage).toHaveURL(crewUrl);
  await expect(friendPage.getByTestId("members")).toContainText("Owner Asha");
  await expect(friendPage.getByTestId("members")).toContainText("Friend Bilal (you)");
  await expect(friendPage.getByRole("button", { name: "New code" })).toHaveCount(0);

  // outsiders get a 404, not the crew
  const outsiderPage = await (await browser.newContext()).newPage();
  await signInUi(outsiderPage, outsider);
  await expect(outsiderPage).toHaveURL(/\/crews$/);
  const res = await outsiderPage.goto(crewUrl);
  expect(res?.status()).toBe(404);

  // owner rotates the code: the old link stops working
  await ownerPage.reload();
  await ownerPage.getByRole("button", { name: "New code" }).click();
  await expect(ownerPage.getByTestId("invite-link")).not.toHaveText(link);
  await outsiderPage.goto(link);
  await expect(outsiderPage.getByText("That invite link doesn’t work any more")).toBeVisible();

  // friend leaves
  friendPage.on("dialog", (d) => d.accept());
  await friendPage.getByRole("button", { name: "Leave crew" }).click();
  await expect(friendPage).toHaveURL(/\/crews$/);
  await ownerPage.reload();
  await expect(ownerPage.getByTestId("members")).not.toContainText("Friend Bilal");
});

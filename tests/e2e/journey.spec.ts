import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { newUser, signInUi } from "./helpers/users";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("lab journey", () => {
  test("call → review → next read on a 390 px phone in under 60 seconds, with analytics events recorded", async ({ page, request }) => {
    const user = await newUser(request, "Journey Fan");
    await signInUi(page, user);
    const started = Date.now();

    await page.goto("/lab");
    await page.getByTestId("moments").getByRole("link").first().click();
    const ticket = page.getByTestId("ticket");
    await ticket.getByRole("radio").nth(1).check();
    await ticket.getByRole("button", { name: /lock/i }).click();
    await page.getByTestId("see-review").click();
    await expect(page.getByTestId("review-columns")).toBeVisible();
    await expect(page.getByTestId("grade")).toBeVisible();
    await page.getByTestId("next-read").click();
    await expect(page).toHaveURL(/\/lab\/gm-[\d-]+$/);
    await expect(page.getByTestId("ticket")).toBeVisible();

    const elapsed = Date.now() - started;
    test.info().annotations.push({ type: "journey-ms", description: String(elapsed) });
    expect(elapsed).toBeLessThan(60_000);
    // nothing on the phone layout scrolls sideways
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const prisma = new PrismaClient();
    try {
      const u = await prisma.user.findUniqueOrThrow({ where: { email: user.email }, select: { id: true } });
      await expect.poll(async () => (await prisma.analyticsEvent.findMany({ where: { userId: u.id }, select: { name: true } })).map((e) => e.name).sort(), { timeout: 10_000 })
        .toEqual(["call_graded", "call_locked", "moment_viewed", "moment_viewed", "next_read_started", "review_viewed"]);
      const locked = await prisma.analyticsEvent.findFirstOrThrow({ where: { userId: u.id, name: "call_locked" } });
      expect(locked.props).toMatchObject({ confidence: 60 });
    } finally {
      await prisma.$disconnect();
    }
  });
});

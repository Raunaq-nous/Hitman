import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { fixtureMoments, lockCalls } from "./helpers/lab";
import { newUser, signInUi } from "./helpers/users";

test.describe("crew tower", () => {
  test("timing tower: rank, Read Rating, calibration, calls this week, form and position change; provisional label", async ({ browser, page, request }) => {
    const owner = await newUser(request, "Tower Owner");
    const friend = await newUser(request, "Tower Friend");
    await signInUi(page, owner);
    const res = await page.request.post("/api/crews", { data: { name: "Tower Crew" } });
    expect(res.status()).toBe(201);
    const { id } = (await res.json()) as { id: string };
    const prisma = new PrismaClient();
    const { inviteCode } = await prisma.crew.findUniqueOrThrow({ where: { id }, select: { inviteCode: true } }).finally(() => prisma.$disconnect());

    const ctx = await browser.newContext();
    const fp = await ctx.newPage();
    await signInUi(fp, friend);
    expect((await fp.request.post("/api/crews/join", { data: { inviteCode } })).status()).toBe(200);

    const [a, b, c] = fixtureMoments();
    const worst = (m: typeof a) => [...m.decision.options].sort((x, y) => x.wp - y.wp)[0].option;
    // the friend reads two moments well; the owner misses one
    await lockCalls(fp, [{ momentId: a.id, option: a.decision.best, confidence: 0.8 }, { momentId: b.id, option: b.decision.best, confidence: 0.7 }]);
    await lockCalls(page, [{ momentId: c.id, option: worst(c), confidence: 0.6 }]);
    await ctx.close();

    await page.goto(`/crews/${id}`);
    await page.getByRole("link", { name: "Timing tower (Read Rating)" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Timing tower");
    const rows = page.getByTestId("tower").locator("li");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Tower Friend");
    await expect(rows.nth(0).getByLabel("Rank 1")).toBeVisible();
    await expect(rows.nth(0)).toContainText("2 calls this week");
    await expect(rows.nth(0).getByRole("img", { name: "Form, last 2: good, good" })).toBeVisible();
    await expect(rows.nth(0).getByLabel(/^Brier score \d\.\d{3}$/)).toBeVisible();
    await expect(rows.nth(0).getByLabel(/^Read Rating 1[2-9]\d\d$/)).toBeVisible();
    await expect(rows.nth(1)).toContainText("Tower Owner (you)");
    await expect(rows.nth(1).getByRole("img", { name: "Form, last 1: poor" })).toBeVisible();
    // everyone joined this week: nobody has changed places since Monday
    await expect(page.getByTestId("tower").getByLabel("No change")).toHaveCount(2);
    await expect(page.getByText("Provisional calibration")).toBeVisible();
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
});

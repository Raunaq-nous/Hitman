import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { seedTestMatch } from "./helpers/db";
import { newUser, signInUi } from "./helpers/users";

const PUBLIC = ["/", "/login", "/register", "/onboarding", "/commentary", "/design", "/crews/join/ZZZZZZ", "/roster", "/roster/opener"];

async function axe(page: Page): Promise<string[]> {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("a11y: every route", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`public routes pass axe (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of PUBLIC) {
        await page.goto(path);
        expect(await axe(page), path).toEqual([]);
      }
    });

    test(`signed-in routes pass axe (${scheme})`, async ({ page, request }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const user = await newUser(request, `A11y ${scheme}`);
      await signInUi(page, user);
      await expect(page).toHaveURL(/\/crews$/);
      expect(await axe(page), "/crews").toEqual([]);
      await page.getByLabel("Crew name").fill(`Axe ${scheme}`);
      await page.getByRole("button", { name: "Create crew" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Axe ${scheme}`);
      expect(await axe(page), "/crews/[id]").toEqual([]);
      const crewUrl = page.url();
      await page.getByRole("link", { name: "Crew standings" }).click();
      expect(await axe(page), "/crews/[id]/leaderboard").toEqual([]);
      const matchId = await seedTestMatch();
      await page.goto(`${crewUrl}/match/${matchId}`);
      expect(await axe(page), "/crews/[id]/match/[matchId]").toEqual([]);
    });
  }
});

test.describe("a11y: navigation", () => {
  test("mobile menu opens with the keyboard and has a skip link", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    const menu = page.getByRole("button", { name: "Menu" });
    await expect(page.getByRole("link", { name: "Scores" })).toBeHidden();
    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Scores" })).toBeVisible();
  });

  test("desktop nav marks the current page and the theme toggle sets data-theme", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/onboarding");
    await expect(page.getByRole("link", { name: "How it works" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Theme: Auto" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("reduced motion: no animation keeps running", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/", "/onboarding", "/design", "/commentary"]) {
      await page.goto(path);
      await page.waitForTimeout(100);
      expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length), path).toBe(0);
    }
  });
});

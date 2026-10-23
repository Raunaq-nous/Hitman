import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing page renders with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(err.message));
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.locator("body")).toContainText("ALTER EGO");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("landing page passes axe accessibility checks", async ({ page }) => {
  await page.goto("/");
  // entrance animations fade content in; check the settled page, not a half-transparent frame
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
});

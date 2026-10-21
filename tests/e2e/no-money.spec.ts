import { expect, test } from "@playwright/test";
import { findMoneyTerms } from "../audit/money-terms";

const ROUTES = ["/", "/login", "/register", "/commentary", "/onboarding", "/design"];

test.describe("no-money audit on rendered routes", () => {
  for (const path of ROUTES) {
    test(`no money language on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const text = await page.locator("body").innerText();
      expect(findMoneyTerms(path, text).map((h) => `${h.term}: …${h.context}…`)).toEqual([]);
      expect(await page.locator("img[src*='qr' i], img[alt*='qr' i], [data-payment]").count()).toBe(0);
    });
  }
});

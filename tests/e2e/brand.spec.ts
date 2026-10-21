import { expect, test } from "@playwright/test";

// Internal codenames (and the old product names) must never reach anything a user can see.
const CODENAMES = /\b(hitman|mamba|architetto|iceborg|ice-borg|pitch ?11)\b/i;
const PUBLIC_PAGES = ["/", "/login", "/register", "/schedule", "/teams", "/commentary", "/leaderboard"];

test.describe("brand: ALTER EGO everywhere users can see", () => {
  for (const path of PUBLIC_PAGES) {
    test(`no internal codenames on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const visible = await page.locator("body").innerText();
      const meta = await page.evaluate(() => [document.title, ...Array.from(document.querySelectorAll("meta[content], img[alt]")).map((e) => e.getAttribute("content") ?? e.getAttribute("alt") ?? "")].join("\n"));
      expect(visible).not.toMatch(CODENAMES);
      expect(meta).not.toMatch(CODENAMES);
      expect(await page.title()).toContain("ALTER EGO");
    });
  }

  test("manifest and metadata use the public brand", async ({ request }) => {
    const manifest = await (await request.get("/manifest.json")).json();
    expect(manifest.name).toBe("ALTER EGO");
    expect(JSON.stringify(manifest)).not.toMatch(CODENAMES);
  });
});

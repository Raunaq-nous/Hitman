import { expect, test } from "@playwright/test";

test.describe("landing", () => {
  test("copy matches what ships: no statistics, no illustrative data, no athlete names", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("main").innerText();
    // statistics look like percentages, decimals, scores or "N of M"; the only numerals allowed are list markers
    const stats = text.split("\n").map((l) => l.replace(/Formula 1/g, "")).filter((l) => /\d/.test(l) && !/^\s*\d\s*$/.test(l));
    expect(stats).toEqual([]);
    expect(text).not.toMatch(/illustrative|toy model|simulat/i);
    expect(text).not.toMatch(/Rohit|Sharma|Kobe|Bryant|Pirlo|Prost|Borg|Hitman|Mamba/);
    await expect(page.locator(".card-sport", { hasText: "AI analyst" })).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "In development" })).toBeVisible();
    await expect(page.getByText("Not available yet.")).toBeVisible();
  });

  test("every call to action leads to a working page", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("main a[href^='/'], header a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href") as string))]);
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
  });
});

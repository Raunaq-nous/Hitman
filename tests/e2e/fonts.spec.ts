import { expect, test } from "@playwright/test";

test("fonts load from our own origin and numerals are tabular", async ({ page, baseURL }) => {
  const external: string[] = [];
  page.on("request", (r) => { if (!r.url().startsWith(baseURL ?? "") && !r.url().startsWith("data:")) external.push(r.url()); });
  await page.goto("/login");
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('700 16px "Archivo Variable"'))).toBe(true);
  expect(external).toEqual([]);
  const numeric = await page.evaluate(() => {
    const el = document.createElement("span");
    el.className = "tabular";
    el.textContent = "1234";
    document.body.append(el);
    return getComputedStyle(el).fontVariantNumeric;
  });
  expect(numeric).toContain("tabular-nums");
});

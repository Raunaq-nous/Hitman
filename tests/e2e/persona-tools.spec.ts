import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("persona tools", () => {
  test("the Opener's Over Call is live in the Lab", async ({ page }) => {
    await page.goto("/roster/opener");
    const tool = page.getByTestId("persona-tool");
    await expect(tool).toHaveAttribute("data-kind", "live");
    await expect(tool.getByRole("heading")).toHaveText("Signature tool: Over Call");
    await expect(page.getByTestId("tool-kind")).toHaveText("Live in the Lab");
    await tool.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/lab\/gm-[\d-]+$/);
    await expect(page.getByTestId("over-call")).toContainText("Over Call");
    await expect(page.getByTestId("ticket")).toBeVisible();
  });

  test("Iceman and Closer demos are labelled illustrative; Architect and Professor run on open data with receipts (or say the source is pending)", async ({ page }) => {
    for (const [slug, title] of [["iceman", "Pressure Index"], ["closer", "Clutch-time leverage"]] as const) {
      await page.goto(`/roster/${slug}`);
      const tool = page.getByTestId("persona-tool");
      await expect(tool).toHaveAttribute("data-kind", "illustrative");
      await expect(tool.getByRole("heading")).toHaveText(`Signature tool: ${title}`);
      await expect(page.getByTestId("tool-kind")).toHaveText("Illustrative data, not a real match");
      await expect(tool).toContainText("not a real");
      expect(await tool.locator("tbody tr").count()).toBeGreaterThanOrEqual(3);
    }
    for (const [slug, title, source] of [["architect", "Possession value", "statsbomb"], ["professor", "Pit window", "openf1"]] as const) {
      await page.goto(`/roster/${slug}`);
      const tool = page.getByTestId("persona-tool");
      await expect(tool.getByRole("heading")).toHaveText(`Signature tool: ${title}`);
      const kind = await tool.getAttribute("data-kind");
      expect(["open-data", "pending"]).toContain(kind);
      if (kind === "open-data") {
        await expect(page.getByTestId("tool-kind")).toHaveText("Demo on open data");
        expect(await tool.locator("tbody tr").count()).toBeGreaterThanOrEqual(2);
        await tool.locator(".ui-receipt-toggle").click();
        await expect(tool.getByRole("region", { name: "Receipt" })).toContainText(source);
      } else {
        await expect(page.getByTestId("tool-kind")).toHaveText("Source pending");
      }
      if (process.env.EVIDENCE) await page.screenshot({ path: `docs/evidence/F-R-02/${slug}-${kind}.png`, fullPage: true });
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(axe.violations.map((v) => v.id)).toEqual([]);
    }
  });
});

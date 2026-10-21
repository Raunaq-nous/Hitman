import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SECTIONS = ["ticket", "stamp", "receipt", "meter", "tower", "persona", "badge", "share"];

test.describe("design gallery", () => {
  test("shows every component", async ({ page }) => {
    await page.goto("/design");
    for (const s of SECTIONS) await expect(page.getByTestId(`gallery-${s}`)).toBeVisible();
    await expect(page.getByText("AI analyst")).toHaveCount(5);
    await expect(page.getByTestId("gallery-meter").getByRole("meter").first()).toHaveAttribute("aria-valuetext", "Low (p20)");
  });

  test("ticket: pick, set confidence, lock with the keyboard", async ({ page }) => {
    await page.goto("/design");
    const ticket = page.getByTestId("ticket");
    const lock = ticket.getByRole("button", { name: "Lock my call" });
    await expect(lock).toBeDisabled();
    await ticket.getByLabel("Pace").check();
    const slider = ticket.getByRole("slider");
    await expect(slider).toHaveValue("60");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("61");
    await lock.focus();
    await page.keyboard.press("Enter");
    await expect(ticket.getByRole("img", { name: "Locked" })).toBeVisible();
    await expect(ticket.getByLabel("Pace")).toBeDisabled();
  });

  test("receipt opens with source, class and time", async ({ page }) => {
    await page.goto("/design");
    await page.getByTestId("gallery-receipt").locator("summary").click();
    await expect(page.getByTestId("gallery-receipt")).toContainText("verified delayed");
  });

  for (const colorScheme of ["light", "dark"] as const) test(`passes axe checks (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/design");
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity));
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/ui/tokens.css", "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const light = block(":root {");
const dark = { ...light, ...block(':root[data-theme="dark"]') };
const darkMedia = { ...light, ...block(':root:not([data-theme="light"])') };

function resolve(theme: Record<string, string>, v: string): string {
  const m = /^var\(--([\w-]+)\)$/.exec(v);
  return m ? resolve(theme, theme[m[1]]) : v;
}
function lum(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(theme: Record<string, string>, fg: string, bg: string): number {
  const [a, b] = [lum(resolve(theme, theme[fg])), lum(resolve(theme, theme[bg]))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const DESIGN_TOKENS = { alpine: "#8CC6E8", snow: "#F5F7FA", ink: "#13233A", opener: "#1E9A55", closer: "#E06A10", architect: "#2C58D4", professor: "#7540CC", iceman: "#1F8FC4", call: "#FFD23F", receipt: "#A9B4C2" };

describe("tokens: light and dark per DESIGN.md", () => {
  it("defines every DESIGN.md token with its hex in the light theme", () => {
    for (const [k, v] of Object.entries(DESIGN_TOKENS)) expect(light[k]?.toUpperCase(), k).toBe(v);
    expect(light.brick).toBeDefined();
  });

  it("dark theme overrides exist both for the media query and the explicit data-theme", () => {
    expect(block(':root[data-theme="dark"]')).toEqual(Object.fromEntries(Object.entries(block(':root:not([data-theme="light"])')).filter(([k]) => k in block(':root[data-theme="dark"]'))));
    expect(darkMedia.bg).not.toBe(light.bg);
  });

  for (const [name, theme] of [["light", light], ["dark", dark]] as const) {
    it(`meets WCAG AA contrast in the ${name} theme`, () => {
      for (const fg of ["text", "text-2", "receipt-ink", "brick"]) for (const bg of ["bg", "surface"]) expect(contrast(theme, fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme, "call-ink", "call"), "call-ink on call").toBeGreaterThanOrEqual(4.5);
      // persona colours are used for marks, bands and large text: 3:1 against the page
      for (const p of ["opener", "closer", "architect", "professor", "iceman"]) expect(contrast(theme, p, "bg"), p).toBeGreaterThanOrEqual(3);
    });
  }

  it("theme-color literals mirror the tokens", async () => {
    const { THEME_COLOR } = await import("@/providers/themeColor");
    expect(THEME_COLOR.light).toBe(light.snow);
    expect(THEME_COLOR.dark).toBe(dark.bg);
  });

  it("never uses pure black or pure red", () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : /\.(css|tsx|ts)$/.test(n) ? [p] : [];
    });
    const PURE = /#0{3}\b|#0{6}\b|#f00\b|#ff0000\b|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|rgb\(\s*255\s*,\s*0\s*,\s*0\s*\)|:\s*(black|red)\s*[;}]/i;
    const offenders = walk("src").filter((f) => PURE.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    // Tailwind's black and red utilities are remapped to ink and brick
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(globals).toMatch(/--color-black:\s*var\(--/);
    expect(globals).toMatch(/--color-red-500:\s*var\(--/);
  });
});

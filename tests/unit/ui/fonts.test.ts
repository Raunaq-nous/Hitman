import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(css|tsx|ts|js|json|html)$/.test(n) ? [p] : [];
});

describe("fonts: self-hosted Archivo, Literata and JetBrains Mono", () => {
  it("layout imports the three fontsource packages", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    for (const pkg of ["@fontsource-variable/archivo/wdth.css", "@fontsource-variable/literata", "@fontsource-variable/jetbrains-mono"]) expect(layout).toContain(`import "${pkg}"`);
  });

  it("no code or asset loads fonts from the network", () => {
    const offenders = [...walk("src"), ...walk("public")].filter((f) => /fonts\.(googleapis|gstatic)\.com|use\.typekit|next\/font\/google/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    const csp = readFileSync("src/providers/securityHeaders.ts", "utf8");
    expect(csp).not.toMatch(/fonts\.g/);
  });

  it("tokens name the self-hosted families and define tabular numerals and a type scale", () => {
    const tokens = readFileSync("src/ui/tokens.css", "utf8");
    expect(tokens).toMatch(/--font-display: "Archivo Variable"/);
    expect(tokens).toMatch(/--font-reading: "Literata Variable"/);
    expect(tokens).toMatch(/--font-receipt: "JetBrains Mono Variable"/);
    expect(tokens).toMatch(/\.tabular[^{]*\{[^}]*tabular-nums/);
    for (const step of ["--step--1", "--step-0", "--step-1", "--step-2", "--step-3", "--step-4"]) expect(tokens).toContain(`${step}:`);
  });

  it("the packages ship the font files locally", () => {
    for (const dir of ["archivo", "literata", "jetbrains-mono"]) {
      expect(readdirSync(`node_modules/@fontsource-variable/${dir}/files`).some((f) => f.endsWith(".woff2"))).toBe(true);
    }
  });
});

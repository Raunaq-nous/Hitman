import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PersonaChip } from "@/ui";
import { PERSONA_SLUGS } from "@/personas";

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(n) ? [p] : [];
});

describe("AI labels", () => {
  it("every PersonaChip renders the AI analyst label", () => {
    for (const p of PERSONA_SLUGS) expect(renderToStaticMarkup(<PersonaChip persona={p} />)).toContain("AI analyst");
  });

  it("every component that marks a persona voice also renders the AI label", () => {
    const files = walk("src").filter((f) => readFileSync(f, "utf8").includes("data-persona-voice"));
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const f of files) expect(readFileSync(f, "utf8"), f).toMatch(/AI analyst/);
  });
});

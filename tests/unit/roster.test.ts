import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PERSONAS, PERSONA_SLUGS } from "@/personas";
import { switchboard, switchboardFacts } from "@/domain/roster/service";

describe("roster: personas", () => {
  it("five persona cards with public names and a PLAYBOOK.md each", () => {
    expect(PERSONA_SLUGS.map((s) => PERSONAS[s].name)).toEqual(["The Opener", "The Closer", "The Architect", "The Professor", "The Iceman"]);
    for (const s of PERSONA_SLUGS) {
      const md = readFileSync(`src/personas/${s}/PLAYBOOK.md`, "utf8");
      expect(existsSync(`src/personas/${s}/card.json`)).toBe(true);
      expect(md).toMatch(/Always labelled “AI analyst”/);
      expect(md).toMatch(/## Voice rules[\s\S]*## Vocabulary and skill words[\s\S]*## Never/);
      expect(md).not.toMatch(/Rohit|Bryant|Pirlo|Prost|Borg|Hitman|Mamba/);
    }
  });
});

describe("roster: Persona Switchboard", () => {
  it("re-voices the same verified facts in every persona's style", () => {
    const sb = switchboard();
    const facts = switchboardFacts();
    expect(sb.label).toMatch(/Illustrative example, not a real match/);
    expect(sb.voicings).toHaveLength(5);
    const numbers = sb.voicings.map((v) => (v.sentences.join(" ").match(/\d+(\.\d+)?/g) ?? []).sort());
    for (const n of numbers) expect(n).toEqual(numbers[0]);
    expect(numbers[0]).toEqual([String(facts[0].value), String(facts[1].value)].sort());
    expect(new Set(sb.voicings.map((v) => v.sentences[0])).size).toBe(5);
    expect(facts.every((f) => f.kind === "MODEL_ESTIMATE" && f.sourceId === "engine:tennis-iid")).toBe(true);
    expect(Number(facts[0].value)).toBeGreaterThan(Number(facts[1].value));
  });
});

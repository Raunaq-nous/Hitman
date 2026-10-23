import { describe, expect, it } from "vitest";
import { isLang, LANGS, messageKeys, t } from "@/i18n";
import { TITLES } from "@/domain/stories/config";

describe("English and Hindi (i18n)", () => {
  it("every message exists in every language, with the same placeholders", () => {
    const en = messageKeys("en");
    expect(messageKeys("hi").sort()).toEqual([...en].sort());
    for (const k of en) {
      const ph = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(ph(t("hi", k)), k).toEqual(ph(t("en", k)));
      expect(t("hi", k).length, k).toBeGreaterThan(0);
    }
  });

  it("fills placeholders and keeps unknown ones visible", () => {
    expect(t("en", "desk.swing", { pts: 42 })).toBe("Swing 42 pts");
    expect(t("hi", "desk.swing", { pts: 42 })).toBe("स्विंग 42 अंक");
    expect(t("en", "desk.swing")).toBe("Swing {pts} pts");
    expect(LANGS).toEqual(["en", "hi"]);
    expect(isLang("hi")).toBe(true);
    expect(isLang("fr")).toBe(false);
  });

  it("story titles exist in both languages for every kind and keep their numbers", () => {
    expect(Object.keys(TITLES.hi).sort()).toEqual(Object.keys(TITLES.en).sort());
    const p = { team: "Mumbai Indians", runs: 2, balls: 2, wickets: 1, wp: 68, over: 18, from: 36, to: 79, who: "X", minute: 90, xg: "0.45", car: 1, lap: 12, gain: "1.6" };
    for (const k of Object.keys(TITLES.en)) {
      const nums = (s: string): string[] => (s.match(/\d+(\.\d+)?/g) ?? []).sort();
      expect(nums(TITLES.hi[k](p)), k).toEqual(nums(TITLES.en[k](p)));
    }
    expect(TITLES.hi["tense-finish"]({ ...p, balls: 1 })).toContain("1 गेंद में");
    expect(TITLES.hi.collapse({ ...p, balls: 7 })).toContain("7 गेंदों में");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pictogram } from "@/components/landing/Pictogram";
import { UiPictogram, type UiPictogramKey } from "@/ui/UiPictogram";

const UI: UiPictogramKey[] = ["decide", "lock", "grade", "receipt", "crew", "language"];

describe("pictograms on one grid", () => {
  it("sport and UI pictograms share the 48-unit grid, are decorative and use currentColor only", () => {
    const all = [
      ...(["cricket", "basketball", "football", "f1", "tennis"] as const).map((s) => renderToStaticMarkup(<Pictogram sport={s} />)),
      ...UI.map((n) => renderToStaticMarkup(<UiPictogram name={n} />)),
    ];
    for (const svg of all) {
      expect(svg).toContain('viewBox="0 0 48 48"');
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb\(/);
    }
    for (const n of UI) expect(renderToStaticMarkup(<UiPictogram name={n} />)).toContain(`data-pictogram="${n}"`);
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { linePath, scale, swings, windowSwing } from "@/ui/charts/geometry";
import { SwingSeismograph } from "@/ui/charts/SwingSeismograph";
import { Meter } from "@/ui/components/Meter";

const box = { width: 100, height: 100, pad: 0 };
const pts = [{ t: 0, wp: 0.5 }, { t: 1, wp: 0.6 }, { t: 2, wp: 0.3 }, { t: 3, wp: 0.35 }];

describe("charts: geometry", () => {
  it("maps time to x and win probability to y (0% at the bottom), clamping out-of-range values", () => {
    const { x, y } = scale(pts, box);
    expect([x(0), x(3), y(1), y(0), y(1.2), y(-1)]).toEqual([0, 100, 0, 100, 0, 100]);
    expect(scale([{ t: 5, wp: 0.5 }], box).x(5)).toBe(0);
  });

  it("builds an SVG path", () => {
    expect(linePath(pts, box)).toBe("M0 50 L33.3 40 L66.7 70 L100 65");
    expect(linePath([], box)).toBe("");
  });

  it("finds swings at or above the threshold, largest first, and window swing", () => {
    expect(swings(pts, 0.1).map((s) => [s.to.t, Number(s.size.toFixed(2))])).toEqual([[2, 0.3], [1, 0.1]]);
    expect(swings(pts, 0.5)).toEqual([]);
    expect(windowSwing(pts)).toBeCloseTo(0.15, 12);
    expect(windowSwing([pts[0]])).toBe(0);
  });
});

describe("charts: components render with tokens only", () => {
  it("Swing Seismograph: accessible summary, swing markers, labelled ghost estimate, data table", () => {
    const html = renderToStaticMarkup(<SwingSeismograph title="WP" points={pts} ghost={[{ t: 2, wp: 0.3 }, { t: 3, wp: 0.5 }]} swingThreshold={0.2} formatT={(t) => `b${t}`} />);
    expect(html).toContain('role="img"');
    expect(html).toContain("from 50% to 35%; 1 swing of 20 points or more");
    expect(html.match(/data-testid="swing"/g)).toHaveLength(1);
    expect(html).toContain('data-testid="ghost"');
    expect(html).toContain("scenario model estimate (not what happened)");
    expect(html).toContain("<td>b2</td><td>30%</td>");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("Swing Seismograph: honest empty state", () => {
    const html = renderToStaticMarkup(<SwingSeismograph title="WP" points={[]} />);
    expect(html).toContain("No data yet.");
    expect(html).not.toContain('data-testid="ghost"');
  });

  it("Leverage Meter: meter role, clamped value and ten segments", () => {
    const html = renderToStaticMarkup(<Meter label="Leverage" value={1.4} valueText="Very high" />);
    expect(html).toContain('role="meter"');
    expect(html).toContain('aria-valuenow="100"');
    expect(html.match(/ui-meter-seg/g)).toHaveLength(10);
    expect(html.match(/data-on=""/g)).toHaveLength(10);
    expect(renderToStaticMarkup(<Meter label="L" value={-1} valueText="none" />)).toContain('aria-valuenow="0"');
  });
});

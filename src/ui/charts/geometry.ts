// Pure chart geometry for the Swing Seismograph (tested in tests/unit/ui/charts.test.tsx).
export interface WpPoint { t: number; wp: number }
export interface Box { width: number; height: number; pad: number }

export function scale(points: WpPoint[], box: Box): { x: (t: number) => number; y: (wp: number) => number } {
  const ts = points.map((p) => p.t);
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const span = t1 - t0 || 1;
  return {
    x: (t) => box.pad + ((t - t0) / span) * (box.width - 2 * box.pad),
    y: (wp) => box.pad + (1 - Math.min(1, Math.max(0, wp))) * (box.height - 2 * box.pad),
  };
}

const r = (n: number): string => (Math.round(n * 10) / 10).toString();

/** SVG path for a WP line. Empty string for no points. */
export function linePath(points: WpPoint[], box: Box, domain: WpPoint[] = points): string {
  if (points.length === 0) return "";
  const { x, y } = scale(domain, box);
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${r(x(p.t))} ${r(y(p.wp))}`).join(" ");
}

export interface Swing { from: WpPoint; to: WpPoint; size: number }

/** Steps where |ΔWP| ≥ threshold (swing = |WP_end − WP_start|), largest first. */
export function swings(points: WpPoint[], threshold: number): Swing[] {
  const out: Swing[] = [];
  for (let i = 1; i < points.length; i++) {
    const size = Math.abs(points[i].wp - points[i - 1].wp);
    if (size >= threshold - 1e-9) out.push({ from: points[i - 1], to: points[i], size });
  }
  return out.sort((a, b) => b.size - a.size);
}

/** Total swing of a window: |WP_end − WP_start|. */
export function windowSwing(points: WpPoint[]): number {
  return points.length < 2 ? 0 : Math.abs(points[points.length - 1].wp - points[0].wp);
}

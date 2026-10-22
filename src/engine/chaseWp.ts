// Exact chase win probability by memoised backward induction (docs/design-docs/models-and-grading.md).
// State s = (b, w, r): legal balls remaining, wickets in hand, runs required. Pure; the outcome model is injected.

export const OUTCOMES = [0, 1, 2, 3, 4, 5, 6, "W"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export type OutcomeDist = Record<Outcome, number>;

export interface ChaseState { b: number; w: number; r: number }

/**
 * Per-ball outcome distribution for a state (extras folded into runs, run-outs counted as wickets), or several
 * playing styles open to the batting side: the chaser plays the style with the highest win probability. Offering a
 * side every style of sides with fewer wickets in hand ("free disposal") keeps WP monotonic in wickets.
 */
export type OutcomeModel = (s: ChaseState) => OutcomeDist | readonly OutcomeDist[];

export function next(s: ChaseState, o: Outcome): ChaseState {
  return o === "W" ? { b: s.b - 1, w: s.w - 1, r: s.r } : { b: s.b - 1, w: s.w, r: s.r - o };
}

/** Terminal value, or null when the chase is still live. Win 1; out of wickets or balls with r > 1, 0; tie 0.5. */
export function terminal(s: ChaseState): number | null {
  if (s.r <= 0) return 1;
  if (s.w <= 0) return 0;
  if (s.b <= 0) return s.r === 1 ? 0.5 : 0;
  return null;
}

function checkDist(d: OutcomeDist): void {
  let sum = 0;
  for (const o of OUTCOMES) {
    if (!(d[o] >= 0)) throw new RangeError(`outcome probability for ${o} must be non-negative`);
    sum += d[o];
  }
  if (Math.abs(sum - 1) > 1e-9) throw new RangeError(`outcome probabilities must sum to 1, got ${sum}`);
}

export interface ChaseModel {
  wp(s: ChaseState): number;
  /** Std dev of next-ball WP: how much the next ball can move the match. */
  leverage(s: ChaseState): number;
  /** The distribution the chaser plays at a non-terminal state (the best of the styles offered). */
  played(s: ChaseState): OutcomeDist;
}

export function createChaseModel(model: OutcomeModel): ChaseModel {
  const memo = new Map<number, number>();
  const chosen = new Map<number, OutcomeDist>();
  const key = (s: ChaseState): number => (s.b * 16 + s.w) * 1024 + s.r;
  const styles = (s: ChaseState): readonly OutcomeDist[] => {
    const m = model(s);
    const list = Array.isArray(m) ? m : [m as OutcomeDist];
    if (list.length === 0) throw new RangeError("the outcome model offered no distribution");
    list.forEach(checkDist);
    return list;
  };
  const wp = (s: ChaseState): number => {
    const t = terminal(s);
    if (t !== null) return t;
    const k = key(s);
    const hit = memo.get(k);
    if (hit !== undefined) return hit;
    let best = -1;
    for (const d of styles(s)) {
      let v = 0;
      for (const o of OUTCOMES) if (d[o] > 0) v += d[o] * wp(next(s, o));
      if (v > best) { best = v; chosen.set(k, d); }
    }
    memo.set(k, best);
    return best;
  };
  const dist = (s: ChaseState): OutcomeDist => { wp(s); return chosen.get(key(s)) as OutcomeDist; };
  const validate = (s: ChaseState): void => {
    if (![s.b, s.w, s.r].every(Number.isInteger) || s.b < 0 || s.b > 600 || s.w < 0 || s.w > 10 || s.r > 1000) throw new RangeError(`invalid chase state ${JSON.stringify(s)}`);
  };
  return {
    wp: (s) => { validate(s); return wp(s); },
    played: (s) => {
      validate(s);
      if (terminal(s) !== null) throw new RangeError(`no ball is played at terminal state ${JSON.stringify(s)}`);
      return dist(s);
    },
    leverage: (s) => {
      validate(s);
      if (terminal(s) !== null) return 0;
      const d = dist(s);
      const now = wp(s);
      let variance = 0;
      for (const o of OUTCOMES) if (d[o] > 0) variance += d[o] * (wp(next(s, o)) - now) ** 2;
      return Math.sqrt(variance);
    },
  };
}

/** Swing of a window = |WP_end − WP_start|. */
export function swing(wpStart: number, wpEnd: number): number {
  return Math.abs(wpEnd - wpStart);
}

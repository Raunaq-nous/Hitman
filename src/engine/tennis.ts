// Tennis point importance and Pressure Index on an iid point model (Klaassen & Magnus, JASA 2001: points are
// not exactly iid, but close enough for a good approximation). Pure maths, no I/O.

export interface TennisModel {
  /** P(A wins a point on A's serve) */
  pA: number;
  /** P(B wins a point on B's serve) */
  pB: number;
  bestOf: 3 | 5;
}

export interface TennisState {
  setsA: number; setsB: number;
  gamesA: number; gamesB: number;
  /** points in the current game or tiebreak */
  pointsA: number; pointsB: number;
  /** who serves the current point's game (in a tiebreak: who served its first point) */
  serverA: boolean;
}

const check = (p: number): void => {
  if (!(p > 0 && p < 1)) throw new RangeError(`point probabilities must be strictly between 0 and 1, got ${p}`);
};

/** P(server wins the game) from (server points a, receiver points b), with deuce in closed form. p = 0.65 → ≈ 0.83. */
export function holdProbability(p: number, a = 0, b = 0): number {
  check(p);
  const q = 1 - p;
  if (a >= 4 && a - b >= 2) return 1;
  if (b >= 4 && b - a >= 2) return 0;
  if (a >= 3 && b >= 3) {
    const deuce = (p * p) / (p * p + q * q);
    if (a === b) return deuce;
    return a > b ? p + q * deuce : p * deuce;
  }
  return p * holdProbability(p, a + 1, b) + q * holdProbability(p, a, b + 1);
}

/** Who serves tiebreak point number k (0-based): the first server, then alternate every two points. */
export const tiebreakServerIsFirst = (k: number): boolean => Math.floor((k + 1) / 2) % 2 === 0;

/** P(A wins a first-to-7, win-by-2 tiebreak) from (a, b), given who served its first point. */
export function tiebreakWinA(m: TennisModel, a: number, b: number, firstServerA: boolean): number {
  if (a >= 7 && a - b >= 2) return 1;
  if (b >= 7 && b - a >= 2) return 0;
  const pointA = (k: number): number => {
    const serverA = tiebreakServerIsFirst(k) === firstServerA;
    return serverA ? m.pA : 1 - m.pB;
  };
  const k = a + b;
  if (a >= 6 && a === b) {
    // from a tie (k even) the next two points are served one each; a split returns to a tie
    const x = pointA(k), y = pointA(k + 1);
    return (x * y) / (x * y + (1 - x) * (1 - y));
  }
  const x = pointA(k);
  return x * tiebreakWinA(m, a + 1, b, firstServerA) + (1 - x) * tiebreakWinA(m, a, b + 1, firstServerA);
}

function setsToWin(m: TennisModel): number {
  return m.bestOf === 5 ? 3 : 2;
}

/** P(A wins the match) at the start of a game (or tiebreak) with the given score and server. */
function fromGameStart(m: TennisModel, sA: number, sB: number, gA: number, gB: number, serverA: boolean, memo: Map<string, number>): number {
  const need = setsToWin(m);
  if (sA === need) return 1;
  if (sB === need) return 0;
  const key = `${sA}${sB}${gA}${gB}${serverA ? 1 : 0}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  let v: number;
  if (gA === 6 && gB === 6) {
    const t = tiebreakWinA(m, 0, 0, serverA);
    // the player who received first in the tiebreak serves first in the next set
    v = t * fromGameStart(m, sA + 1, sB, 0, 0, !serverA, memo) + (1 - t) * fromGameStart(m, sA, sB + 1, 0, 0, !serverA, memo);
  } else {
    const w = gameWinA(m, serverA, 0, 0);
    v = w * afterGame(m, sA, sB, gA + 1, gB, !serverA, memo) + (1 - w) * afterGame(m, sA, sB, gA, gB + 1, !serverA, memo);
  }
  memo.set(key, v);
  return v;
}

function gameWinA(m: TennisModel, serverA: boolean, pointsA: number, pointsB: number): number {
  return serverA ? holdProbability(m.pA, pointsA, pointsB) : 1 - holdProbability(m.pB, pointsB, pointsA);
}

function afterGame(m: TennisModel, sA: number, sB: number, gA: number, gB: number, nextServerA: boolean, memo: Map<string, number>): number {
  const setOver = (x: number, y: number): boolean => (x >= 6 && x - y >= 2) || x === 7;
  if (setOver(gA, gB)) return fromGameStart(m, sA + 1, sB, 0, 0, nextServerA, memo);
  if (setOver(gB, gA)) return fromGameStart(m, sA, sB + 1, 0, 0, nextServerA, memo);
  return fromGameStart(m, sA, sB, gA, gB, nextServerA, memo);
}

function validate(m: TennisModel, s: TennisState): void {
  check(m.pA);
  check(m.pB);
  const need = setsToWin(m);
  const ints = [s.setsA, s.setsB, s.gamesA, s.gamesB, s.pointsA, s.pointsB];
  if (ints.some((n) => !Number.isInteger(n) || n < 0) || s.setsA >= need || s.setsB >= need || s.gamesA > 7 || s.gamesB > 7) {
    throw new RangeError("invalid in-play tennis state");
  }
}

/** P(A wins the match) at any in-play state. */
export function matchWinProbability(m: TennisModel, s: TennisState): number {
  validate(m, s);
  const memo = new Map<string, number>();
  if (s.gamesA === 6 && s.gamesB === 6) {
    const t = tiebreakWinA(m, s.pointsA, s.pointsB, s.serverA);
    return t * fromGameStart(m, s.setsA + 1, s.setsB, 0, 0, !s.serverA, memo) + (1 - t) * fromGameStart(m, s.setsA, s.setsB + 1, 0, 0, !s.serverA, memo);
  }
  const w = gameWinA(m, s.serverA, s.pointsA, s.pointsB);
  return w * afterGame(m, s.setsA, s.setsB, s.gamesA + 1, s.gamesB, !s.serverA, memo) + (1 - w) * afterGame(m, s.setsA, s.setsB, s.gamesA, s.gamesB + 1, !s.serverA, memo);
}

/** Point importance = P(A wins match | A wins this point) − P(A wins match | A loses it). In [0, 1]. */
export function pointImportance(m: TennisModel, s: TennisState): number {
  validate(m, s);
  const tiebreak = s.gamesA === 6 && s.gamesB === 6;
  // a won point that ends the game is the same as the game being won; holdProbability handles terminal points
  const win = matchWinProbability(m, { ...s, pointsA: s.pointsA + 1, ...(tiebreak ? {} : normaliseDeuce(s.pointsA + 1, s.pointsB)) });
  const lose = matchWinProbability(m, { ...s, pointsB: s.pointsB + 1, ...(tiebreak ? {} : normaliseDeuce(s.pointsA, s.pointsB + 1)) });
  return win - lose;
}

/** Keep regular-game points small after deuce (5-4 ≡ 4-3) so states stay valid and comparable. */
function normaliseDeuce(a: number, b: number): { pointsA: number; pointsB: number } {
  while (a > 4 && b > 3) { a--; b--; }
  return { pointsA: a, pointsB: b };
}

/** Pressure Index (0–100): point importance in percentage points of match-win probability, rounded. */
export function pressureIndex(m: TennisModel, s: TennisState): number {
  return Math.round(pointImportance(m, s) * 100);
}

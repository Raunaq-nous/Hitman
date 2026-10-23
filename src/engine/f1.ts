// The Professor's pit window (illustrative tool): tyre degradation as the least-squares slope of clean lap times
// within a stint, and the lap where the time lost to worn tyres passes the pit-lane loss.

export interface Lap { lap: number; seconds: number; pitOut: boolean }

/** Seconds lost per lap over a stint. Pit-out laps and laps over 107% of the stint's fastest (traffic, safety car) are ignored. */
export function degradation(laps: Lap[]): { slopePerLap: number; used: number } {
  const clean0 = laps.filter((l) => !l.pitOut);
  const fastest = Math.min(...clean0.map((l) => l.seconds));
  const clean = clean0.filter((l) => l.seconds <= fastest * 1.07);
  if (clean.length < 2) return { slopePerLap: 0, used: clean.length };
  const mx = clean.reduce((a, l) => a + l.lap, 0) / clean.length, my = clean.reduce((a, l) => a + l.seconds, 0) / clean.length;
  const sxy = clean.reduce((a, l) => a + (l.lap - mx) * (l.seconds - my), 0), sxx = clean.reduce((a, l) => a + (l.lap - mx) ** 2, 0);
  return { slopePerLap: sxy / sxx, used: clean.length };
}

/** The first lap of the stint on which the cumulative loss to tyre wear reaches the pit-lane loss; null if it never grows. */
export function pitWindow(a: { slopePerLap: number; stintStartLap: number; pitLossSeconds: number }): { opensOnLap: number; lapsIntoStint: number; lossAtOpen: number } | null {
  if (!(a.pitLossSeconds > 0)) throw new RangeError("pit-lane loss must be positive");
  if (!(a.slopePerLap > 0)) return null;
  let k = 0, loss = 0;
  while (loss < a.pitLossSeconds) { k++; loss += a.slopePerLap * k; }
  return { opensOnLap: a.stintStartLap + k, lapsIntoStint: k, lossAtOpen: Math.round(loss * 1000) / 1000 };
}

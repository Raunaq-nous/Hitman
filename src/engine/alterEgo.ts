// Alter Ego identity (docs/product-specs/alter-ego.md): deterministic and explainable axes from a fan's graded calls,
// mapped to one of the five public personas plus a modifier. Pure; revealed only after REVEAL_AFTER graded calls.

export const REVEAL_AFTER = 10;
/** Fewest other fans' calls on a moment before "the crowd" means anything. */
export const MIN_CROWD = 5;
/** Fewest calls in each of the middle and death overs before timing is compared. */
export const MIN_PHASE = 3;

export interface IdentityCall {
  /** the pick's required-rate band relative to the moment's: "higher" = the faster-scoring, higher-variance option */
  relation: "higher" | "current" | "lower";
  phase: "powerplay" | "middle" | "death";
  decisionType: string;
  sport: string;
  confidence: number;
  hit: boolean;
  leverage: number;
  /** whether the pick was other fans' most popular option (null when fewer than MIN_CROWD others called the moment) */
  withCrowd: boolean | null;
}

export type PersonaSlug = "opener" | "closer" | "architect" | "professor" | "iceman";
const NAMES: Record<PersonaSlug, string> = { opener: "The Opener", closer: "The Closer", architect: "The Architect", professor: "The Professor", iceman: "The Iceman" };
const ORDER: PersonaSlug[] = ["opener", "closer", "architect", "professor", "iceman"];

export interface Axis { key: "risk" | "timing" | "calibration" | "contrarianism" | "domainMix"; label: string; value: number | null; n: number; explanation: string }
export type Identity =
  | { revealed: false; graded: number; remaining: number }
  | { revealed: true; graded: number; axes: Axis[]; persona: { slug: PersonaSlug; name: string }; modifier: string; label: string; evidence: string[] };

const rate = (xs: IdentityCall[]): number | null => (xs.length ? xs.filter((c) => c.hit).length / xs.length : null);
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const clamp = (x: number): number => Math.min(1, Math.max(0, x));
/** A sentence continued after a colon starts in lower case. */
const lc = (s: string): string => s[0].toLowerCase() + s.slice(1);
const TYPE_NAME: Record<string, string> = { "next-over-intent": "next-over intent", "chase-tempo": "chase tempo", "death-bowling": "death bowling" };

export function alterEgo(calls: IdentityCall[]): Identity {
  const n = calls.length;
  if (n < REVEAL_AFTER) return { revealed: false, graded: n, remaining: REVEAL_AFTER - n };

  const higher = calls.filter((c) => c.relation === "higher").length;
  const risk = higher / n;
  const deathCalls = calls.filter((c) => c.phase === "death"), middleCalls = calls.filter((c) => c.phase === "middle");
  const enough = deathCalls.length >= MIN_PHASE && middleCalls.length >= MIN_PHASE;
  const death = rate(deathCalls), middle = rate(middleCalls);
  const timing = enough ? clamp(0.5 + ((death as number) - (middle as number)) / 2) : null;
  const hitRate = rate(calls) as number;
  const meanConf = calls.reduce((a, c) => a + c.confidence, 0) / n;
  // calibration (spec: Brier vs confidence): the mean Brier score against the Brier a perfectly calibrated caller at
  // the same confidences would expect, c(1 − c); 1 = no gap
  const meanBrier = calls.reduce((a, c) => a + (c.confidence - (c.hit ? 1 : 0)) ** 2, 0) / n;
  const expectedBrier = calls.reduce((a, c) => a + c.confidence * (1 - c.confidence), 0) / n;
  const calibration = clamp(1 - 4 * Math.abs(meanBrier - expectedBrier));
  // sharpness: how far from a coin-flip 50% the fan commits (a 50%-always caller is calibrated but says nothing)
  const sharpness = clamp((meanConf - 0.5) / 0.15);
  const crowd = calls.filter((c) => c.withCrowd !== null);
  const against = crowd.filter((c) => c.withCrowd === false).length;
  const contrarianism = crowd.length ? against / crowd.length : null;
  const byType = new Map<string, IdentityCall[]>();
  for (const c of calls) byType.set(c.decisionType, [...(byType.get(c.decisionType) ?? []), c]);
  const [topType, topCalls] = [...byType.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
  const sports = new Set(calls.map((c) => c.sport));

  const axes: Axis[] = [
    { key: "risk", label: "Risk appetite", value: risk, n, explanation: `You backed the faster-scoring option in ${higher} of ${n} calls.` },
    { key: "timing", label: "Timing", value: timing, n, explanation: timing === null ? `Needs at least ${MIN_PHASE} calls in both the middle and the death overs.` : `Right ${pct(death as number)} of the time in the death overs and ${pct(middle as number)} in the middle overs.` },
    { key: "calibration", label: "Calibration", value: calibration, n, explanation: `On average ${pct(meanConf)} sure and right ${pct(hitRate)} of the time.` },
    { key: "contrarianism", label: "Contrarianism", value: contrarianism, n: crowd.length, explanation: crowd.length ? `You went against the crowd's favourite pick in ${against} of ${crowd.length} calls with a crowd to compare.` : `No moment you called has ${MIN_CROWD} other calls to compare with yet.` },
    { key: "domainMix", label: "Domain mix", value: topCalls.length / n, n, explanation: `${topCalls.length} of ${n} calls were ${TYPE_NAME[topType] ?? topType} decisions, across ${sports.size} ${sports.size === 1 ? "sport" : "sports"}.` },
  ];

  // clutch: how much better the reads were on the higher-leverage half of the calls
  const levs = calls.map((c) => c.leverage).sort((a, b) => a - b);
  const median = levs[Math.floor(n / 2)];
  const high = rate(calls.filter((c) => c.leverage >= median)), low = rate(calls.filter((c) => c.leverage < median));
  const clutch = high !== null && low !== null ? Math.max(0, high - low) : 0;
  const tempo = byType.get("chase-tempo") ?? [];
  const score: Record<PersonaSlug, number> = {
    opener: timing === null ? 0 : Math.abs(timing - 0.5) * 2,
    closer: clutch,
    architect: (tempo.length / n) * (rate(tempo) ?? 0),
    professor: Math.max(0, (risk - 0.5) * 2),
    iceman: Math.max(0, (calibration - 0.5) * 2) * sharpness,
  };
  const top = ORDER.reduce((best, p) => (score[p] > score[best] ? p : best), ORDER[0]);
  // no trait stands out: the file opens with the analyst of the sport the fan calls most (cricket → The Opener)
  const noTrait = score[top] === 0;
  const SPORT_PERSONA: Record<string, PersonaSlug> = { cricket: "opener", basketball: "closer", football: "architect", f1: "professor", tennis: "iceman" };
  const mainSport = [...sports].sort((a, b) => calls.filter((c) => c.sport === b).length - calls.filter((c) => c.sport === a).length || a.localeCompare(b))[0];
  const slug: PersonaSlug = noTrait ? SPORT_PERSONA[mainSport] ?? "opener" : top;
  const why: Record<PersonaSlug, string> = {
    opener: `Your timing stands out: ${lc(axes[1].explanation)}`,
    closer: `You read the biggest moments best: right ${pct(high as number)} on your higher-leverage calls against ${pct(low ?? 0)} on the rest.`,
    architect: `You read the tempo of a chase: right ${pct(rate(tempo) ?? 0)} of the time on ${tempo.length} chase-tempo calls.`,
    professor: `You take calculated risks: ${lc(axes[0].explanation)}`,
    iceman: `You stay cool under pressure: ${lc(axes[2].explanation)}`,
  };
  const modifier = contrarianism !== null && contrarianism >= 0.6 ? "Contrarian" : risk >= 0.7 ? "Bold" : risk <= 0.3 ? "Steady" : calibration >= 0.8 && meanConf >= 0.65 ? "Sharp" : "Balanced";
  const modWhy: Record<string, string> = {
    Contrarian: axes[3].explanation, Bold: axes[0].explanation, Steady: axes[0].explanation, Sharp: axes[2].explanation,
    Balanced: "No single habit dominates your calls.",
  };
  return {
    revealed: true, graded: n, axes, persona: { slug, name: NAMES[slug] }, modifier, label: `${NAMES[slug]} · ${modifier}`,
    evidence: [noTrait ? `No single trait stands out yet, so your file opens with ${NAMES[slug]}, the analyst of the sport you call most.` : why[slug], `${modifier}: ${lc(modWhy[modifier])}`],
  };
}

// Persona Switchboard: the same verified facts, re-voiced by each analyst with deterministic templates.
import { pointImportance, type TennisModel, type TennisState } from "@/engine/tennis";
import { verifyClaims, type Claims, type Fact } from "@/providers/llm";
import { PERSONAS, PERSONA_SLUGS, type PersonaSlug } from "@/personas";

/** A labelled, hypothetical example state (not a real match): the facts are the engine's computations on it. */
export const EXAMPLE = {
  label: "Illustrative example, not a real match: two players who each win 64% of points on serve, deciding set at 5–5, the server down 30–40.",
  model: { pA: 0.64, pB: 0.64, bestOf: 3 } satisfies TennisModel,
  big: { setsA: 1, setsB: 1, gamesA: 5, gamesB: 5, pointsA: 2, pointsB: 3, serverA: true } satisfies TennisState,
  first: { setsA: 0, setsB: 0, gamesA: 0, gamesB: 0, pointsA: 0, pointsB: 0, serverA: true } satisfies TennisState,
};

const OBSERVED_AT = "2026-01-01T00:00:00.000Z";

export function switchboardFacts(): Fact[] {
  const pct = (s: TennisState): number => Math.round(pointImportance(EXAMPLE.model, s) * 1000) / 10;
  return [
    { id: "big", value: pct(EXAMPLE.big), sourceId: "engine:tennis-iid", observedAt: OBSERVED_AT, kind: "MODEL_ESTIMATE" },
    { id: "first", value: pct(EXAMPLE.first), sourceId: "engine:tennis-iid", observedAt: OBSERVED_AT, kind: "MODEL_ESTIMATE" },
  ];
}

type Voice = (big: Fact["value"], first: Fact["value"]) => string[];

const VOICES: Record<PersonaSlug, Voice> = {
  opener: (b, f) => [`Timing is everything here: this point moves ${b} points of match-win chance.`, `The first point of the match moved ${f}. Same game, very different moment.`],
  closer: (b, f) => [`This is the last-shot moment: ${b} points of match-win chance on one rally.`, `Compare that with ${f} on the opening point. Prepare for the big one.`],
  architect: (b, f) => [`The shape of the match funnels into this point: ${b} points of match-win chance.`, `At the start the same rally was worth ${f}. Structure builds pressure.`],
  professor: (b, f) => [`Risk and reward: ${b} points of match-win chance ride on this point.`, `The opening point carried only ${f}. Spend your risk where it pays.`],
  iceman: (b, f) => [`Big point. ${b} points of match-win chance.`, `First point: ${f}. Same routine.`],
};

export interface Voicing { persona: PersonaSlug; name: string; sentences: string[] }

/** Every persona's voicing of the same facts, each checked by the claim verifier (a failing template is a bug). */
export function switchboard(): { label: string; facts: Fact[]; voicings: Voicing[] } {
  const facts = switchboardFacts();
  const [big, first] = facts;
  const voicings = PERSONA_SLUGS.map((slug) => {
    const sentences = VOICES[slug](big.value, first.value);
    const claims: Claims = { claims: sentences.map((text) => ({ text, kind: "MODEL_ESTIMATE", source_ids: ["big", "first"] })) };
    const verdict = verifyClaims(claims.claims, facts, OBSERVED_AT);
    if (!verdict.ok) throw new Error(`${slug} voicing fails verification: ${verdict.rejections.map((r) => r.reason).join("; ")}`);
    return { persona: slug, name: PERSONAS[slug].name, sentences };
  });
  return { label: EXAMPLE.label, facts, voicings };
}

// Rule-based query planner. Deterministic routing (no model decides what to query), structured answers from services,
// and phrasing through the verified generation contract with a template fallback.
import { generateClaims, PRODUCTION_PROMPT, type Claims, type Fact, type VerifiedRequest } from "@/providers/llm";
import { crewStandings } from "@/domain/contests/service";
import { getCrewForMember, listMyCrews } from "@/domain/crews/service";
import type { Answer, Plan } from "./types";

const CLEAN = (s: string): string => s.replace(/[?.!]+$/, "").trim();

/** Route a question. Only exact, known shapes become database queries. */
export function plan(question: string): Plan {
  const q = question.trim().replace(/\s+/g, " ");
  if (!q) return { kind: "unsupported", reason: "Ask a question." };
  if (q.length > 300) return { kind: "unsupported", reason: "Keep questions under 300 characters." };
  let m = /^who(?:'s| is) in (?:my crew |the crew )?(.+)$/i.exec(q);
  if (m) return { kind: "structured", intent: "crew_members", crewName: CLEAN(m[1]) };
  m = /^who(?:'s| is) (?:leading|top of|first in) (?:my crew |the crew )?(.+)$/i.exec(q);
  if (m) return { kind: "structured", intent: "crew_leader", crewName: CLEAN(m[1]) };
  if (/^(?:which|what) crews am i in\??$/i.test(q)) return { kind: "structured", intent: "my_crews" };
  return { kind: "retrieval", query: q };
}

async function findCrewId(userId: string, name: string): Promise<string | null> {
  const crews = await listMyCrews(userId);
  return crews.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? null;
}

/** Facts for a structured plan, scoped to what the asking user may see. */
export async function factsFor(userId: string, p: Extract<Plan, { kind: "structured" }>, now: Date): Promise<{ facts: Fact[]; empty?: string }> {
  const observedAt = now.toISOString();
  if (p.intent === "my_crews") {
    const crews = await listMyCrews(userId);
    if (!crews.length) return { facts: [], empty: "You’re not in any crews yet." };
    return { facts: [{ id: "crews", value: crews.map((c) => c.name).join(", "), sourceId: "alterego", observedAt, kind: "OBSERVED" }, { id: "count", value: crews.length, sourceId: "alterego", observedAt, kind: "OBSERVED" }] };
  }
  const crewId = await findCrewId(userId, p.crewName);
  if (!crewId) return { facts: [], empty: `You’re not in a crew called “${p.crewName}”.` };
  if (p.intent === "crew_members") {
    const crew = await getCrewForMember(userId, crewId);
    return { facts: [{ id: "crew", value: crew.name, sourceId: "alterego", observedAt, kind: "OBSERVED" }, { id: "members", value: crew.members.map((m) => m.user.name).join(", "), sourceId: "alterego", observedAt, kind: "OBSERVED" }, { id: "count", value: crew.members.length, sourceId: "alterego", observedAt, kind: "OBSERVED" }] };
  }
  const standings = await crewStandings(userId, crewId);
  const top = standings[0];
  if (!top || top.points === 0) return { facts: [], empty: "No completed matches have been scored for this crew yet." };
  return { facts: [{ id: "leader", value: top.user.name, sourceId: "alterego", observedAt, kind: "OBSERVED" }, { id: "points", value: top.points, sourceId: "alterego", observedAt, kind: "OBSERVED" }] };
}

/** Deterministic phrasing for each intent (also the fallback for model phrasing). */
export function templateFor(p: Extract<Plan, { kind: "structured" }>): (facts: Fact[]) => Claims {
  const get = (facts: Fact[], id: string): Fact["value"] => facts.find((f) => f.id === id)?.value ?? "";
  return (facts) => {
    if (p.intent === "my_crews") return { claims: [{ text: `You’re in ${get(facts, "count")}: ${get(facts, "crews")}.`, kind: "OBSERVED", source_ids: ["count", "crews"] }] };
    if (p.intent === "crew_members") return { claims: [{ text: `${get(facts, "crew")} has ${get(facts, "count")}: ${get(facts, "members")}.`, kind: "OBSERVED", source_ids: ["crew", "count", "members"] }] };
    return { claims: [{ text: `${get(facts, "leader")} leads with ${get(facts, "points")} points.`, kind: "OBSERVED", source_ids: ["leader", "points"] }] };
  };
}

export async function answer(userId: string, question: string, now: Date = new Date()): Promise<Answer> {
  const p = plan(question);
  if (p.kind === "unsupported") return { plan: p, sentences: [], sources: [], honestEmpty: p.reason };
  // No retrieval index is populated yet: say so instead of letting a model improvise.
  if (p.kind === "retrieval") return { plan: p, sentences: [], sources: [], honestEmpty: "I can only answer questions about your crews for now; open questions need sourced documents, which aren’t indexed yet." };
  const { facts, empty } = await factsFor(userId, p, now);
  if (!facts.length) return { plan: p, sentences: [], sources: [], honestEmpty: empty };
  const req: VerifiedRequest = { task: `planner.${p.intent}`, system: PRODUCTION_PROMPT, facts, snapshotCutoff: now.toISOString(), model: "fast", template: templateFor(p) };
  const r = await generateClaims(req);
  return { plan: p, sentences: r.claims.claims.map((c) => c.text), sources: [...new Set(facts.map((f) => f.sourceId))] };
}

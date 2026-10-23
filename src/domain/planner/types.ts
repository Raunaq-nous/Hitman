// Query plans. Structured questions go to the database; open questions go to retrieval; the LLM only phrases results.
export type Plan =
  | { kind: "structured"; intent: "crew_members"; crewName: string }
  | { kind: "structured"; intent: "crew_leader"; crewName: string }
  | { kind: "structured"; intent: "my_crews" }
  | { kind: "retrieval"; query: string }
  | { kind: "unsupported"; reason: string };

export interface Answer {
  plan: Plan;
  /** Verified, sourced sentences; empty with `honestEmpty` when there is nothing to say. */
  sentences: string[];
  sources: string[];
  honestEmpty?: string;
}

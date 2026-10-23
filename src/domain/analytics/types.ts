import { z } from "zod";

const id = z.string().min(1).max(64);
const depth = z.enum(["quick", "tactical", "analyst"]);

/** The events in the spec, each with the only props it may carry (no free text, no personal data). */
export const EVENT_SCHEMAS = {
  moment_viewed: z.object({ momentId: id }).strict(),
  call_locked: z.object({ momentId: id, callId: id, confidence: z.number().int().min(50).max(99) }).strict(),
  // server-side: the call's outcome is known and its grade is available (needed for the north star's denominator)
  call_graded: z.object({ callId: id, coinFlip: z.boolean() }).strict(),
  review_viewed: z.object({ callId: id }).strict(),
  next_read_started: z.object({ fromCallId: id, momentId: id }).strict(),
  share_clicked: z.object({ callId: id.optional(), kind: z.enum(["call", "alter_ego"]) }).strict(),
  receipt_opened: z.object({ sourceId: id, surface: z.string().max(32) }).strict(),
  depth_changed: z.object({ from: depth, to: depth }).strict(),
  language_changed: z.object({ from: z.enum(["en", "hi"]), to: z.enum(["en", "hi"]) }).strict(),
  alter_ego_revealed: z.object({ persona: z.enum(["opener", "closer", "architect", "professor", "iceman"]) }).strict(),
} as const;

export type EventName = keyof typeof EVENT_SCHEMAS;
export const EVENT_NAMES = Object.keys(EVENT_SCHEMAS) as EventName[];
export type EventProps<N extends EventName> = z.infer<(typeof EVENT_SCHEMAS)[N]>;

/** Events a browser may send. call_locked, call_graded, review_viewed and alter_ego_revealed (once per fan) are recorded by the server only (they feed the KPIs). */
export const CLIENT_EVENTS = ["moment_viewed", "next_read_started", "share_clicked", "receipt_opened", "depth_changed", "language_changed"] as const satisfies readonly EventName[];
export const clientEventInput = z.object({ name: z.enum(CLIENT_EVENTS), props: z.record(z.string(), z.unknown()).default({}) });

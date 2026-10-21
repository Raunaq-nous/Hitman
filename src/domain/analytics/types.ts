import { z } from "zod";

const id = z.string().min(1).max(64);
const depth = z.enum(["quick", "tactical", "analyst"]);

/** The events in the spec, each with the only props it may carry (no free text, no personal data). */
export const EVENT_SCHEMAS = {
  moment_viewed: z.object({ momentId: id }).strict(),
  call_locked: z.object({ momentId: id, callId: id, confidence: z.number().int().min(50).max(99) }).strict(),
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

export const clientEventInput = z.object({ name: z.enum(EVENT_NAMES as [EventName, ...EventName[]]), props: z.record(z.string(), z.unknown()).default({}) });

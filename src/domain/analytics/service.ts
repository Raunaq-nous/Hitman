// Track product events server-side. Unknown events and unexpected props are rejected, never stored.
import { DomainError } from "@/domain/shared/types";
import { EVENT_SCHEMAS, type EventName, type EventProps } from "./types";
import * as repo from "./repo";

export async function track<N extends EventName>(name: N, props: EventProps<N>, userId: string | null): Promise<{ id: string }> {
  const schema = EVENT_SCHEMAS[name];
  if (!schema) throw new DomainError("INVALID", `Unknown event ${String(name)}.`);
  const parsed = schema.safeParse(props);
  if (!parsed.success) throw new DomainError("INVALID", `Invalid props for ${name}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
  return repo.insertEvent({ userId, name, props: parsed.data });
}

/** Track an event only the first time this user triggers it (e.g. the Alter Ego reveal). */
export async function trackOnce<N extends EventName>(name: N, props: EventProps<N>, userId: string): Promise<void> {
  if (!(await repo.hasEvent(userId, name))) await track(name, props, userId);
}

/** KPIs for the ISO week containing `day`, computed from the event log. */
export async function kpisForWeek(day: Date, now: Date = new Date()): Promise<import("./kpi").WeeklyKpis> {
  const { weekStart, weeklyKpis } = await import("./kpi");
  const start = weekStart(day);
  const rows = await repo.eventsUntil(new Date(Math.min(now.getTime(), start.getTime() + 44 * 86_400_000)));
  return weeklyKpis(rows.map((r) => ({ ...r, props: (r.props ?? {}) as Record<string, unknown> })), start, now);
}

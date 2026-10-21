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

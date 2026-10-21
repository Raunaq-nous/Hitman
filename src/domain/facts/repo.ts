// Incident store. Rights are checked before anything is stored.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertRight } from "@/providers/rights";
import type { IncidentInput } from "./types";

/** Append incidents for an event; already-stored source records are skipped (idempotent re-ingest). */
export async function appendIncidents(eventId: string, incidents: IncidentInput[]): Promise<number> {
  for (const sourceId of new Set(incidents.map((i) => i.sourceId))) assertRight(sourceId, "store");
  const data: Prisma.IncidentCreateManyInput[] = incidents.map((i) => ({ ...i, eventId, payload: i.payload as Prisma.InputJsonValue }));
  return (await prisma.incident.createMany({ data, skipDuplicates: true })).count;
}

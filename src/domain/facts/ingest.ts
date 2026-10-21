// Ingest parsed events into the incident store (rights checked before anything is stored).
import { prisma } from "@/lib/prisma";
import { assertRight } from "@/providers/rights";
import type { ParsedEvent } from "@/adapters/types";
import { appendIncidents } from "./repo";

export async function ingestEvent(e: ParsedEvent): Promise<{ eventId: string; incidentsAdded: number }> {
  assertRight(e.sourceId, "store");
  const comp = await prisma.competition.upsert({ where: { sportId_slug: { sportId: e.sport, slug: e.competition.slug } }, update: {}, create: { sportId: e.sport, slug: e.competition.slug, name: e.competition.name } });
  const season = await prisma.season.upsert({ where: { competitionId_label: { competitionId: comp.id, label: e.season } }, update: {}, create: { competitionId: comp.id, label: e.season } });
  const event = await prisma.event.upsert({
    where: { sourceId_sourceRef: { sourceId: e.sourceId, sourceRef: e.sourceRef } },
    update: {},
    create: { seasonId: season.id, sourceId: e.sourceId, sourceRef: e.sourceRef, name: e.name, startsAt: e.startsAt, venue: e.venue, rightsPolicyId: e.sourceId },
  });
  for (const p of e.participants) {
    const part = await prisma.participant.upsert({ where: { sourceId_sourceRef: { sourceId: e.sourceId, sourceRef: `team:${p.name}` } }, update: {}, create: { sportId: e.sport, kind: p.role, name: p.name, sourceId: e.sourceId, sourceRef: `team:${p.name}` } });
    await prisma.eventParticipant.upsert({ where: { eventId_participantId_role: { eventId: event.id, participantId: part.id, role: p.role } }, update: {}, create: { eventId: event.id, participantId: part.id, role: p.role } });
  }
  return { eventId: event.id, incidentsAdded: await appendIncidents(event.id, e.incidents) };
}

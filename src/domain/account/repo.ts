import { prisma } from "@/lib/prisma";

export async function exportRows(userId: string) {
  const [user, memberships, ownedCrews, reports, blocks, teams, scoring, events, labCalls, reviews] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, avatar: true, xp: true, favouriteSports: true, language: true, createdAt: true, updatedAt: true } }),
    prisma.crewMember.findMany({ where: { userId }, select: { joinedAt: true, crew: { select: { id: true, name: true } } } }),
    prisma.crew.findMany({ where: { ownerId: userId }, select: { id: true, name: true, createdAt: true } }),
    prisma.crewReport.findMany({ where: { reporterId: userId }, select: { id: true, crewId: true, reason: true, note: true, status: true, createdAt: true } }),
    prisma.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true, createdAt: true } }),
    prisma.fantasyTeam.findMany({ where: { userId }, select: { id: true, matchId: true, captainId: true, viceCaptainId: true, totalPoints: true, createdAt: true, players: { select: { playerId: true } } } }),
    prisma.scoringEvent.findMany({ where: { userId }, select: { matchId: true, playerId: true, armband: true, points: true, configVersion: true, createdAt: true } }),
    prisma.analyticsEvent.findMany({ where: { userId }, select: { name: true, props: true, createdAt: true } }),
    prisma.labCall.findMany({ where: { userId }, orderBy: { lockedAt: "asc" }, select: { momentId: true, option: true, confidence: true, lockedAt: true } }),
    prisma.decisionReview.findMany({ where: { userId }, orderBy: { gradedAt: "asc" }, select: { momentId: true, graded: true, coinFlip: true, best: true, readPoints: true, hit: true, brier: true, ratingBefore: true, ratingAfter: true, gradedAt: true } }),
  ]);
  return { user, memberships, ownedCrews, reports, blocks, teams, scoring, events, labCalls, reviews };
}

/** Hard delete in one transaction. Owned crews pass to the longest-standing member, or are deleted if empty. */
export async function eraseUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.allow_erasure', 'on', true)`;
    for (const crew of await tx.crew.findMany({ where: { ownerId: userId }, select: { id: true } })) {
      const heir = await tx.crewMember.findFirst({ where: { crewId: crew.id, userId: { not: userId } }, orderBy: { joinedAt: "asc" }, select: { userId: true } });
      if (heir) await tx.crew.update({ where: { id: crew.id }, data: { ownerId: heir.userId } });
      else await tx.crew.delete({ where: { id: crew.id } });
    }
    await tx.crewMember.deleteMany({ where: { userId } });
    await tx.crewReport.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedId: userId }] } });
    await tx.userBlock.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    await tx.scoringEvent.deleteMany({ where: { userId } });
    await tx.fantasyTeamPlayer.deleteMany({ where: { fantasyTeam: { userId } } });
    await tx.fantasyTeam.deleteMany({ where: { userId } });
    await tx.analyticsEvent.deleteMany({ where: { userId } });
    await tx.decisionReview.deleteMany({ where: { userId } });
    await tx.labCall.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}

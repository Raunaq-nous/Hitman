// Golden moments (F-E-08): data/fixtures/moments/golden-moments.json, committed and hashed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface StoredMoment {
  id: string; matchId: string; season: number; date: string; observedCutoff: string; leverage: number;
  prelock: { battingTeam: string; bowlingTeam: string; venue: string; target: number; ballsLeft: number; wicketsInHand: number; runsRequired: number; overs: string; phase: "powerplay" | "middle" | "death"; requiredRate: number; striker: string; bowler: string; recent: { deliveries: number; runs: number; wickets: number } };
  decision: { type: string; question: string; options: { option: string; label: string; wp: number; n: number }[]; best: string | null; gapPts: number; calibration: "provisional" };
  reveal: { chaseWon: 0 | 1; winner: string };
  /** post-lock only: WP before each remaining legal ball (exact model) then the result, and the window as played */
  after: { wpAtMoment: number; wpPath: { t: number; wp: number }[]; window: { legalBalls: number; plannedBalls: number; runs: number; wickets: number } };
}

export interface MomentsFile { hash: string; outcomesHash: string; optionsHash: string; moments: StoredMoment[] }

export function momentsFile(): MomentsFile {
  return JSON.parse(readFileSync(join(process.cwd(), "data/fixtures/moments/golden-moments.json"), "utf8")) as MomentsFile;
}

export function storedMoments(): StoredMoment[] {
  return momentsFile().moments;
}

/** Insert a call; the database's (userId, momentId) unique key makes a second lock fail, even when simultaneous. */
export async function insertCall(userId: string, c: { momentId: string; option: string; confidence: number }) {
  try {
    return await prisma.labCall.create({ data: { userId, ...c }, select: { id: true, momentId: true, option: true, confidence: true, lockedAt: true } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
    throw e;
  }
}

const reviewSelect = { momentId: true, graded: true, coinFlip: true, best: true, readPoints: true, hit: true, brier: true, ratingBefore: true, ratingAfter: true, difficulty: true, momentsHash: true, outcomesHash: true, optionsHash: true, calibration: true, gradedAt: true } as const;

export const findCall = (userId: string, momentId: string) => prisma.labCall.findUnique({ where: { userId_momentId: { userId, momentId } }, select: { id: true, momentId: true, option: true, confidence: true, lockedAt: true, review: { select: reviewSelect } } });

/** The user's calls in lock order, each with its review if graded. */
export const callsInLockOrder = (userId: string) => prisma.labCall.findMany({ where: { userId }, orderBy: [{ lockedAt: "asc" }, { id: "asc" }], select: { id: true, momentId: true, option: true, confidence: true, lockedAt: true, review: { select: reviewSelect } } });

export type ReviewRow = NonNullable<NonNullable<Awaited<ReturnType<typeof findCall>>>["review"]>;
export type ReviewData = Omit<ReviewRow, "gradedAt" | "calibration">;

/** Store a review; a review that already exists for the call (a concurrent request) is kept. */
export async function insertReview(userId: string, callId: string, data: ReviewData): Promise<boolean> {
  try {
    await prisma.decisionReview.create({ data: { userId, callId, ...data } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

export const calledMomentIds = async (userId: string): Promise<Set<string>> => new Set((await prisma.labCall.findMany({ where: { userId }, select: { momentId: true } })).map((c) => c.momentId));

export const deleteReviewsFor = (callIds: string[]) => prisma.decisionReview.deleteMany({ where: { callId: { in: callIds } } });

export const deleteReviews = (userId: string) => prisma.decisionReview.deleteMany({ where: { userId } });

export const findCallForShare = (callId: string) => prisma.labCall.findUnique({ where: { id: callId }, select: { momentId: true, option: true, confidence: true, user: { select: { name: true } }, review: { select: reviewSelect } } });

/** Other fans' picks on these moments: count per moment and option (for the crowd comparison). */
export const crowdCounts = (momentIds: string[], excludeUserId: string) =>
  prisma.labCall.groupBy({ by: ["momentId", "option"], where: { momentId: { in: momentIds }, userId: { not: excludeUserId } }, _count: { _all: true } });

export const displayName = async (userId: string): Promise<string | null> => (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? null;

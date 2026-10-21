// North star and KPI computations: pure functions over analytics events (definitions in
// docs/product-specs/admin-and-scoreboards.md). A zero denominator gives null, never 0%.
export interface KpiEvent { userId: string | null; name: string; props: Record<string, unknown>; createdAt: Date }

const DAY = 86_400_000;

/** Monday 00:00 UTC of the ISO week containing `d`. */
export function weekStart(d: Date): Date {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * DAY);
}

export interface Rate { numerator: number; denominator: number; value: number | null }
const rate = (numerator: number, denominator: number): Rate => ({ numerator, denominator, value: denominator === 0 ? null : numerator / denominator });

export interface WeeklyKpis {
  weekStart: string;
  activeUsers: number;
  reviewToNextRead: Rate;
  gradedCallsPerActiveFan: Rate;
  callParticipation: Rate;
  newFanFirstCall: Rate;
  d7Retention: Rate;
  d30Retention: Rate;
  shareRatePerReveal: Rate;
  receiptTapThrough: Rate;
}

function usersWith(events: KpiEvent[], name: string, pred: (e: KpiEvent) => boolean = () => true): Set<string> {
  return new Set(events.filter((e) => e.userId && e.name === name && pred(e)).map((e) => e.userId as string));
}

/**
 * KPIs for the ISO week starting at `start`. `allEvents` must include every event up to at least start + 37 days for
 * retention (later events are ignored for everything else), and every earlier event so "first seen" is right.
 */
export function weeklyKpis(allEvents: KpiEvent[], start: Date, now: Date = new Date()): WeeklyKpis {
  const from = weekStart(start).getTime();
  const to = from + 7 * DAY;
  const week = allEvents.filter((e) => e.createdAt.getTime() >= from && e.createdAt.getTime() < to);
  const active = new Set(week.filter((e) => e.userId).map((e) => e.userId as string));

  const graded = usersWith(week, "call_graded");
  let returned = 0;
  for (const u of graded) {
    const mine = week.filter((e) => e.userId === u).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstReview = mine.find((e) => e.name === "review_viewed");
    if (firstReview && mine.some((e) => e.name === "call_locked" && e.createdAt > firstReview.createdAt)) returned++;
  }

  const firstSeen = new Map<string, number>();
  for (const e of allEvents) {
    if (!e.userId) continue;
    const t = e.createdAt.getTime();
    if (!firstSeen.has(e.userId) || t < (firstSeen.get(e.userId) as number)) firstSeen.set(e.userId, t);
  }
  const cohort = [...firstSeen].filter(([, t]) => t >= from && t < to);
  const activeBetween = (u: string, a: number, b: number): boolean => allEvents.some((e) => e.userId === u && e.createdAt.getTime() >= a && e.createdAt.getTime() < b);
  const lockedWithin7 = cohort.filter(([u, t]) => allEvents.some((e) => e.userId === u && e.name === "call_locked" && e.createdAt.getTime() < t + 7 * DAY)).length;
  // retention only counts cohort members whose window has fully passed
  const matured = (days: number) => cohort.filter(([, t]) => t + (days + 7) * DAY <= now.getTime());
  const d7 = matured(7), d30 = matured(30);

  const reveals = week.filter((e) => e.name === "alter_ego_revealed").length;
  const shares = week.filter((e) => e.name === "share_clicked" && e.props.kind === "alter_ego").length;

  return {
    weekStart: new Date(from).toISOString(),
    activeUsers: active.size,
    reviewToNextRead: rate(returned, graded.size),
    gradedCallsPerActiveFan: rate(week.filter((e) => e.name === "call_graded").length, active.size),
    callParticipation: rate(usersWith(week, "call_locked").size, usersWith(week, "moment_viewed").size),
    newFanFirstCall: rate(lockedWithin7, cohort.length),
    d7Retention: rate(d7.filter(([u, t]) => activeBetween(u, t + 7 * DAY, t + 14 * DAY)).length, d7.length),
    d30Retention: rate(d30.filter(([u, t]) => activeBetween(u, t + 30 * DAY, t + 37 * DAY)).length, d30.length),
    shareRatePerReveal: rate(shares, reveals),
    receiptTapThrough: rate(usersWith(week, "receipt_opened").size, active.size),
  };
}

import { NextResponse } from "next/server";
import { isAdminRequest, adminOnly } from "@/lib/admin";
import { parseJson, route } from "@/providers/http";
import { scoreMatch } from "@/domain/scoring/service";
import { scoreMatchInput } from "@/domain/scoring/types";

/**
 * Scores a finished match from its real scorecard into the append-only scoring ledger. Admin only.
 * Body: { matchId, stats: { [playerId]: { runs, fours, sixes, wickets, catches, runOuts } } }
 * Re-running is idempotent: existing ledger events for this config version are never duplicated.
 */
export const POST = route(async (req: Request) => {
  if (!(await isAdminRequest(req))) return adminOnly();
  const input = await parseJson(req, scoreMatchInput);
  const result = await scoreMatch(input);
  return NextResponse.json({ message: result.eventsWritten > 0 ? "Match scored." : "Already scored for this version; nothing changed.", ...result });
});

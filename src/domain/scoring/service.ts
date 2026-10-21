// Scores a finished match from its real scorecard into the append-only ledger. Re-running is idempotent.
import { DomainError } from "@/domain/shared/types";
import { parseStatLine, playerPoints, SCORING_VERSION, type StatLine } from "@/lib/scoring";
import type { ScoreMatchInput, ScoreMatchResult } from "./types";
import * as repo from "./repo";

export const idempotencyKey = (matchId: string, teamId: string, playerId: string, version: number): string => `${matchId}:${teamId}:${playerId}:v${version}`;

export async function scoreMatch(input: ScoreMatchInput, version: number = SCORING_VERSION): Promise<ScoreMatchResult> {
  const match = await repo.findMatch(input.matchId);
  if (!match) throw new DomainError("NOT_FOUND", "Match not found.");

  const lines = new Map<string, StatLine>();
  for (const [playerId, raw] of Object.entries(input.stats)) {
    const line = parseStatLine(raw);
    if (!line) throw new DomainError("INVALID", `Invalid stat line for player ${playerId}.`);
    lines.set(playerId, line);
  }

  const teams = await repo.teamsForMatch(input.matchId);
  const rowsByTeam = new Map<string, { userId: string; rows: repo.LedgerRow[] }>();
  for (const team of teams) {
    const rows: repo.LedgerRow[] = [];
    for (const { playerId } of team.players) {
      const line = lines.get(playerId);
      if (!line) continue;
      const armband = playerId === team.captainId ? "captain" : playerId === team.viceCaptainId ? "vice" : "none";
      rows.push({
        idempotencyKey: idempotencyKey(input.matchId, team.id, playerId, version),
        matchId: input.matchId, fantasyTeamId: team.id, userId: team.userId, playerId, armband,
        statLine: line, points: playerPoints(line, armband), configVersion: version,
      });
    }
    rowsByTeam.set(team.id, { userId: team.userId, rows });
  }

  const inserted = await repo.appendAndTotal(input.matchId, version, rowsByTeam);
  const written = [...inserted.values()].reduce((a, b) => a + b, 0);
  const total = [...rowsByTeam.values()].reduce((a, t) => a + t.rows.length, 0);
  return { teams: teams.length, eventsWritten: written, eventsAlreadyPresent: total - written, scoringVersion: version };
}

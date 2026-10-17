// Shared team rules. The team builder (client) and /api/team (server) both read these.
export const TEAM_SIZE = 11;
export const MAX_CREDITS = 100;

export const ROLE_LIMITS = {
  BATSMAN: { min: 3, max: 6 },
  BOWLER: { min: 3, max: 6 },
  ALL_ROUNDER: { min: 1, max: 4 },
  WICKETKEEPER: { min: 1, max: 3 },
} as const;

const ROLE_NAMES: Record<keyof typeof ROLE_LIMITS, string> = {
  BATSMAN: "batters",
  BOWLER: "bowlers",
  ALL_ROUNDER: "all-rounders",
  WICKETKEEPER: "wicketkeepers",
};

export type RulePlayer = { id: string; team: string; role: string; credits: number };
export type TeamCheck = { ok: true; error?: undefined } | { ok: false; error: string };

export function validateFantasyTeam(
  input: { playerIds: string[]; captainId: string; viceCaptainId: string },
  players: RulePlayer[],
  sides: [string, string],
): TeamCheck {
  const ids = input.playerIds;
  if (!Array.isArray(ids) || ids.length !== TEAM_SIZE) return { ok: false, error: `Pick exactly ${TEAM_SIZE} players.` };
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Each player can only be picked once." };
  if (players.length !== ids.length) return { ok: false, error: "One or more players weren’t found." };
  if (!ids.includes(input.captainId) || !ids.includes(input.viceCaptainId)) {
    return { ok: false, error: "Your captain and vice-captain must both be in your XI." };
  }
  if (input.captainId === input.viceCaptainId) return { ok: false, error: "Captain and vice-captain must be different players." };
  if (players.some((p) => !sides.includes(p.team))) {
    return { ok: false, error: "Every player must belong to one of the two teams in this match." };
  }
  const credits = players.reduce((sum, p) => sum + p.credits, 0);
  if (credits > MAX_CREDITS + 1e-9) {
    return { ok: false, error: `Your XI costs ${credits.toFixed(1)} credits; the cap is ${MAX_CREDITS}.` };
  }
  for (const role of Object.keys(ROLE_LIMITS) as (keyof typeof ROLE_LIMITS)[]) {
    const { min, max } = ROLE_LIMITS[role];
    const n = players.filter((p) => p.role === role).length;
    if (n < min || n > max) return { ok: false, error: `Pick between ${min} and ${max} ${ROLE_NAMES[role]}.` };
  }
  return { ok: true };
}

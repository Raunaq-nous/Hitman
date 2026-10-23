-- One team per user per match. Existing duplicates (possible before this constraint, via concurrent submits)
-- are removed first, keeping each user's earliest team for the match.
DELETE FROM "FantasyTeamPlayer" WHERE "fantasyTeamId" IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "matchId" ORDER BY "createdAt", id) AS rn FROM "FantasyTeam"
  ) ranked WHERE rn > 1
);
DELETE FROM "FantasyTeam" WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "matchId" ORDER BY "createdAt", id) AS rn FROM "FantasyTeam"
  ) ranked WHERE rn > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_userId_matchId_key" ON "FantasyTeam"("userId", "matchId");

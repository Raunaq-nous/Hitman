-- CreateTable
CREATE TABLE "ScoringEvent" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "armband" TEXT NOT NULL,
    "statLine" JSONB NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoringEvent_idempotencyKey_key" ON "ScoringEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ScoringEvent_fantasyTeamId_configVersion_idx" ON "ScoringEvent"("fantasyTeamId", "configVersion");

-- CreateIndex
CREATE INDEX "ScoringEvent_matchId_idx" ON "ScoringEvent"("matchId");

-- AddForeignKey
ALTER TABLE "ScoringEvent" ADD CONSTRAINT "ScoringEvent_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Append-only: reject UPDATE and DELETE on the ledger.
CREATE OR REPLACE FUNCTION scoring_event_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ScoringEvent is append-only: % is not allowed (write a new event with a new config version instead)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ScoringEvent_append_only"
  BEFORE UPDATE OR DELETE ON "ScoringEvent"
  FOR EACH ROW EXECUTE FUNCTION scoring_event_append_only();

-- Legacy fantasy leagues become crews, renamed in place so every existing group and membership is kept.
-- These tables have no fee or prize columns (dropped in Phase 0).
ALTER TABLE "League" RENAME TO "Crew";
ALTER TABLE "Crew" RENAME CONSTRAINT "League_pkey" TO "Crew_pkey";
ALTER TABLE "Crew" RENAME CONSTRAINT "League_ownerId_fkey" TO "Crew_ownerId_fkey";
ALTER INDEX "League_inviteCode_key" RENAME TO "Crew_inviteCode_key";

ALTER TABLE "LeagueMember" RENAME TO "CrewMember";
ALTER TABLE "CrewMember" RENAME COLUMN "leagueId" TO "crewId";
ALTER TABLE "CrewMember" RENAME CONSTRAINT "LeagueMember_pkey" TO "CrewMember_pkey";
ALTER TABLE "CrewMember" RENAME CONSTRAINT "LeagueMember_userId_fkey" TO "CrewMember_userId_fkey";
ALTER TABLE "CrewMember" DROP CONSTRAINT "LeagueMember_leagueId_fkey";
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER INDEX "LeagueMember_userId_leagueId_key" RENAME TO "CrewMember_userId_crewId_key";

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "rightsPolicyId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("eventId","participantId","role")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "t" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "actor" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "sourceClass" TEXT NOT NULL,
    "rightsPolicyId" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_sportId_slug_key" ON "Competition"("sportId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Season_competitionId_label_key" ON "Season"("competitionId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Event_sourceId_sourceRef_key" ON "Event"("sourceId", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_sourceId_sourceRef_key" ON "Participant"("sourceId", "sourceRef");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_supersedesId_key" ON "Incident"("supersedesId");

-- CreateIndex
CREATE INDEX "Incident_eventId_observedAt_idx" ON "Incident"("eventId", "observedAt");

-- CreateIndex
CREATE INDEX "Incident_eventId_t_seq_idx" ON "Incident"("eventId", "t", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_sourceId_sourceRef_key" ON "Incident"("sourceId", "sourceRef");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Incidents are append-only: corrections are new rows that supersede.
CREATE OR REPLACE FUNCTION incident_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Incident is append-only: % is not allowed (insert a correction with supersedesId instead)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Incident_append_only"
  BEFORE UPDATE OR DELETE ON "Incident"
  FOR EACH ROW EXECUTE FUNCTION incident_append_only();

-- The five sports.
INSERT INTO "Sport" ("id", "name") VALUES
  ('cricket', 'Cricket'),
  ('basketball', 'Basketball'),
  ('football', 'Football'),
  ('f1', 'Formula 1'),
  ('tennis', 'Tennis')
ON CONFLICT ("id") DO NOTHING;

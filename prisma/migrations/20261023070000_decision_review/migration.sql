-- CreateTable
CREATE TABLE "DecisionReview" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "graded" BOOLEAN NOT NULL,
    "coinFlip" BOOLEAN NOT NULL,
    "best" TEXT NOT NULL,
    "readPoints" DOUBLE PRECISION,
    "hit" BOOLEAN,
    "brier" DOUBLE PRECISION,
    "ratingBefore" DOUBLE PRECISION NOT NULL,
    "ratingAfter" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "momentsHash" TEXT NOT NULL,
    "outcomesHash" TEXT NOT NULL,
    "optionsHash" TEXT NOT NULL,
    "calibration" TEXT NOT NULL DEFAULT 'provisional',
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecisionReview_callId_key" ON "DecisionReview"("callId");

-- CreateIndex
CREATE INDEX "DecisionReview_userId_gradedAt_idx" ON "DecisionReview"("userId", "gradedAt");

-- AddForeignKey
ALTER TABLE "DecisionReview" ADD CONSTRAINT "DecisionReview_callId_fkey" FOREIGN KEY ("callId") REFERENCES "LabCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionReview" ADD CONSTRAINT "DecisionReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


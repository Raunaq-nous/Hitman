-- CreateTable
CREATE TABLE "LabCall" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabCall_userId_lockedAt_idx" ON "LabCall"("userId", "lockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabCall_userId_momentId_key" ON "LabCall"("userId", "momentId");

-- AddForeignKey
ALTER TABLE "LabCall" ADD CONSTRAINT "LabCall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


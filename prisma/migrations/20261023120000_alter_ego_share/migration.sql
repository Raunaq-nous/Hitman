-- CreateTable
CREATE TABLE "AlterEgoShare" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlterEgoShare_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlterEgoShare_userId_key" ON "AlterEgoShare"("userId");

-- AddForeignKey
ALTER TABLE "AlterEgoShare" ADD CONSTRAINT "AlterEgoShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "User" ADD COLUMN     "favouriteSports" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';


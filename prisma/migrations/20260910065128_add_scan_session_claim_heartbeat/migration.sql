-- AlterTable
ALTER TABLE "scan_sessions" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

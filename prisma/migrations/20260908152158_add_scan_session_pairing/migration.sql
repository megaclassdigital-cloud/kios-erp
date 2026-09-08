-- CreateTable
CREATE TABLE "scan_sessions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "scan_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scan_sessions_code_key" ON "scan_sessions"("code");

-- CreateIndex
CREATE INDEX "scan_sessions_code_idx" ON "scan_sessions"("code");

-- CreateIndex
CREATE INDEX "scan_events_sessionId_createdAt_idx" ON "scan_events"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_events" ADD CONSTRAINT "scan_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "scan_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

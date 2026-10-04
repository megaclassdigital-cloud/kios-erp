-- CreateEnum
CREATE TYPE "TerminalDeviceKind" AS ENUM ('SCANNER', 'PRINTER');

-- CreateTable
CREATE TABLE "pos_terminals" (
    "id" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terminal_devices" (
    "id" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "kind" "TerminalDeviceKind" NOT NULL,
    "label" TEXT NOT NULL,
    "medianIntervalMs" INTEGER,
    "codeLength" INTEGER,
    "terminator" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "terminal_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pos_terminals_deviceKey_key" ON "pos_terminals"("deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "terminal_devices_terminalId_kind_key" ON "terminal_devices"("terminalId", "kind");

-- AddForeignKey
ALTER TABLE "terminal_devices" ADD CONSTRAINT "terminal_devices_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "pos_terminals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerSample" (
    "at" TIMESTAMP(3) NOT NULL,
    "memUsedPct" DOUBLE PRECISION NOT NULL,
    "swapUsedPct" DOUBLE PRECISION NOT NULL,
    "cpuPct" DOUBLE PRECISION,
    "load1" DOUBLE PRECISION NOT NULL,
    "diskUsedPct" DOUBLE PRECISION NOT NULL,
    "appRssMb" INTEGER NOT NULL,
    "oomKills" INTEGER,

    CONSTRAINT "ServerSample_pkey" PRIMARY KEY ("at")
);

-- CreateIndex
CREATE INDEX "Visit_userId_startedAt_idx" ON "Visit"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Visit_startedAt_idx" ON "Visit"("startedAt");

-- CreateIndex
CREATE INDEX "Visit_lastAt_idx" ON "Visit"("lastAt");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


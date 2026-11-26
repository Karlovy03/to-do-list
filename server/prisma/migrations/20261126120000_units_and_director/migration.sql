-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DIRECTOR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Unit_parentId_idx" ON "Unit"("parentId");

-- CreateIndex
CREATE INDEX "User_unitId_idx" ON "User"("unitId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


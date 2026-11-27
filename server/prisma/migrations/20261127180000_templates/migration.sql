-- pg_trgm: індекс для пошуку підрядка в тексті шаблонів (ADR-0023); у PostgreSQL 13+ це довірене розширення
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "TemplateTextStatus" AS ENUM ('OK', 'EMPTY', 'FAILED');

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "ext" VARCHAR(8) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "storageKey" TEXT NOT NULL,
    "content" TEXT,
    "searchText" TEXT NOT NULL,
    "textStatus" "TemplateTextStatus" NOT NULL,
    "unitId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_sha256_key" ON "Template"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "Template_storageKey_key" ON "Template"("storageKey");

-- CreateIndex
CREATE INDEX "Template_createdAt_idx" ON "Template"("createdAt");

-- CreateIndex
CREATE INDEX "Template_searchText_idx" ON "Template" USING GIN ("searchText" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


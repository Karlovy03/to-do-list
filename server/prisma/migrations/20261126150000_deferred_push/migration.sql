-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "pushDeferred" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Notification_pushDeferred_idx" ON "Notification"("pushDeferred");


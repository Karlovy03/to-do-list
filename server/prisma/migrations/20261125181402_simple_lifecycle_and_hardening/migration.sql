-- ADR-0002: прибрано стан REVIEW і контрольний термін доповіді; частка «Виконано» на виконавця.
-- Дані переносяться, а не видаляються.

-- 1. Завдання «на прийнятті» вважаються виконаними
UPDATE "Task" SET "status" = 'DONE', "completedAt" = COALESCE("completedAt", CURRENT_TIMESTAMP) WHERE "status" = 'REVIEW';

BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED');
ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "TaskStatus_old";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- 2. Завдання: точка відліку порогів терміну; контрольний термін прибрано
ALTER TABLE "Task" ADD COLUMN "deadlineSetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Task" SET "deadlineSetAt" = "createdAt";
ALTER TABLE "Task" DROP COLUMN "controlDeadline";

-- 3. Виконавці: коли додано і коли позначив «Виконано»
ALTER TABLE "TaskAssignee" ADD COLUMN "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           ADD COLUMN "doneAt" TIMESTAMP(3);
UPDATE "TaskAssignee" ta SET "doneAt" = t."completedAt" FROM "Task" t WHERE t."id" = ta."taskId" AND t."status" = 'DONE';

-- 4. Анулювання токенів
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- 5. Типи сповіщень і платформ — enum зі збереженням наявних рядків
CREATE TYPE "NotificationKind" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'CONTROL_ON', 'CONTROL_CHANGED', 'CONTROL_OFF', 'CONTROL_REMINDER', 'DEADLINE_SOON', 'DEADLINE_CHANGED', 'OVERDUE', 'PROGRESS', 'COMMENT', 'STARTED', 'DONE_PART', 'DONE', 'RETURNED', 'CANCELLED', 'REOPENED');
ALTER TABLE "Notification" ALTER COLUMN "kind" TYPE "NotificationKind" USING (
  CASE "kind" WHEN 'UPDATE' THEN 'PROGRESS' WHEN 'REVIEW' THEN 'DONE_PART' ELSE "kind" END
)::"NotificationKind";

CREATE TYPE "DevicePlatform" AS ENUM ('android', 'ios');
ALTER TABLE "DeviceToken" ALTER COLUMN "platform" TYPE "DevicePlatform" USING ("platform"::"DevicePlatform");
ALTER TABLE "DeviceToken" ADD COLUMN "sandbox" BOOLEAN NOT NULL DEFAULT false;

-- 6. Індекси
DROP INDEX "Task_deadline_idx";
DROP INDEX "Task_status_idx";
CREATE INDEX "Task_status_deadline_idx" ON "Task"("status", "deadline");
CREATE INDEX "Task_controllerId_idx" ON "Task"("controllerId");
CREATE INDEX "Task_controlSetById_idx" ON "Task"("controlSetById");
CREATE INDEX "Task_completedAt_idx" ON "Task"("completedAt");
CREATE INDEX "ReminderLog_userId_idx" ON "ReminderLog"("userId");
CREATE INDEX "Snooze_userId_idx" ON "Snooze"("userId");

import { prisma } from '../../lib/prisma';
import { humanMinutes } from '../../lib/time';
import { tx } from '../../lib/texts';
import { getSettings } from '../settings/settings.service';
import { notify } from './notify';
import { planReminders, type PlanTask, type PlanUser } from './reminderPlan';


export async function runRemindersOnce(now = new Date()) {
  const [settings, rows] = await Promise.all([
    getSettings(),
    prisma.task.findMany({
      where: { status: { in: ['NEW', 'IN_PROGRESS'] } },
      include: { assignees: { select: { userId: true } } },
    }),
  ]);
  if (!rows.length) return 0;

  const taskIds = rows.map((r) => r.id);
  const userIds = [...new Set(rows.flatMap((r) => [r.authorId, ...r.assignees.map((a) => a.userId)]))];
  const [users, logs, snoozes] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds }, isActive: true } }),
    prisma.reminderLog.findMany({ where: { taskId: { in: taskIds } } }),
    prisma.snooze.findMany({ where: { taskId: { in: taskIds }, until: { gt: now } } }),
  ]);

  const tasks: PlanTask[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    priority: r.priority,
    deadline: r.deadline,
    createdAt: r.createdAt,
    isControlled: r.isControlled,
    controlSetAt: r.controlSetAt,
    reminderInterval: r.reminderInterval,
    authorId: r.authorId,
    assigneeIds: r.assignees.map((a) => a.userId),
  }));

  const plan = planReminders({
    now,
    settings,
    tasks,
    users: new Map(users.map((u) => [u.id, u as PlanUser])),
    logs: new Map(logs.map((l) => [`${l.taskId}:${l.userId}:${l.key}`, l.sentAt])),
    snoozes: new Map(snoozes.map((s) => [`${s.taskId}:${s.userId}`, s.until])),
  });

  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const r of plan) {
    const task = byId.get(r.taskId)!;
    const title =
      r.kind === 'DEADLINE_SOON'
        ? tx('notifications.deadline.soon', { left: humanMinutes(r.offsetMin!) })
        : tx(r.kind === 'OVERDUE' ? 'notifications.deadline.overdue' : 'notifications.control.reminder');
    // спершу журнал — щоб збій push не спричинив повторів кожну хвилину
    await prisma.$transaction(
      r.logKeys.map((key) =>
        prisma.reminderLog.upsert({
          where: { taskId_userId_key: { taskId: r.taskId, userId: r.userId, key } },
          create: { taskId: r.taskId, userId: r.userId, key, sentAt: now },
          update: { sentAt: now },
        }),
      ),
    );
    await notify({ userIds: [r.userId], kind: r.kind, task, title });
  }
  return plan.length;
}

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startReminderLoop(tickMs: number) {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runRemindersOnce();
    } catch (err) {
      console.error('[reminders]', err);
    } finally {
      running = false;
    }
  };
  timer = setInterval(tick, tickMs);
  void tick();
}

export function stopReminderLoop() {
  if (timer) clearInterval(timer);
}

import { LOCKS, withAdvisoryLock } from '../../../core/lock';
import { humanDuration } from '../../../core/time';
import { getSettings } from '../../settings';
import { notify } from '../notify.service';
import { planReminders, type PlanUser } from './plan';
import { remindersRepository as repo } from './reminders.repository';

/** Один прохід: план → журнал → сповіщення. Під advisory-lock — без дублів між процесами. */
export async function runRemindersOnce(now = new Date()): Promise<number> {
  const result = await withAdvisoryLock(LOCKS.reminders, async () => {
    const [settings, tasks] = await Promise.all([getSettings(), repo.openTasks()]);
    if (!tasks.length) return 0;

    const taskIds = tasks.map((t) => t.id);
    const userIds = [...new Set(tasks.flatMap((t) => [t.authorId, t.controllerUserId, t.controlSetById, ...t.assignees.map((a) => a.userId)]))]
      .filter((id): id is string => !!id);
    const [users, logs, snoozes] = await Promise.all([repo.usersByIds(userIds), repo.logs(taskIds), repo.activeSnoozes(taskIds, now)]);

    const plan = planReminders({
      now,
      settings,
      tasks,
      users: new Map(users.map((u) => [u.id, u as PlanUser])),
      logs: new Map(logs.map((l) => [`${l.taskId}:${l.userId}:${l.key}`, l.sentAt])),
      snoozes: new Map(snoozes.map((s) => [`${s.taskId}:${s.userId}`, s.until])),
    });
    if (!plan.length) return 0;

    // спершу журнал — збій push не повинен давати повторів щохвилини
    await repo.markSent(plan.flatMap((r) => r.logKeys.map((key) => ({ taskId: r.taskId, userId: r.userId, key }))), now);

    // одне сповіщення на (завдання, тип) з усіма отримувачами
    const groups = new Map<string, typeof plan>();
    for (const r of plan) groups.set(`${r.taskId}:${r.kind}`, [...(groups.get(`${r.taskId}:${r.kind}`) ?? []), r]);
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const group of groups.values()) {
      const { taskId, kind, leftMs } = group[0];
      await notify(
        { event: kind, task: byId.get(taskId)!, to: group.map((r) => r.userId), vars: leftMs !== undefined ? { left: humanDuration(leftMs) } : undefined },
        now,
      ).catch((err) => console.error('[reminders] notify', err));
    }
    return plan.length;
  });
  return result ?? 0;
}

const DAY = 24 * 3600_000;
let lastCleanup = 0;

async function cleanupIfDue(now = new Date()) {
  if (now.getTime() - lastCleanup < DAY) return;
  lastCleanup = now.getTime();
  const done = await withAdvisoryLock(LOCKS.cleanup, () => repo.cleanup(now));
  if (done) console.log('[cleanup]', done);
}

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startReminderLoop(tickMs: number) {
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runRemindersOnce();
      await cleanupIfDue();
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

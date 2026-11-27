import { LOCKS, withAdvisoryLock } from '../../../core/lock';
import { humanDuration } from '../../../core/time';
import { getSettings } from '../../settings';
import { deferredPushRepository } from '../feed.repository';
import { eventSubject, notify, pushPayload, taskSubject } from '../notify.service';
import { pushToUser } from '../push/dispatcher';
import { deferredBody, planDeferred } from './deferred';
import { planEventReminders, type EventReminder, type PlanEvent } from './event-plan';
import { planReminders, type PlanUser, type Reminder } from './plan';
import { remindersRepository as repo } from './reminders.repository';

type OpenTask = Awaited<ReturnType<typeof repo.openTasks>>[number];

/**
 * Під advisory-lock лише рішення й журнал — без дублів між процесами.
 * Надсилання — вже після зняття блокування: повільні push не тримають з'єднання з базою.
 */
async function decide(now: Date) {
  return withAdvisoryLock(LOCKS.reminders, async () => {
    const settings = await getSettings();
    const [tasks, deferredRows, upcoming] = await Promise.all([repo.openTasks(), deferredPushRepository.pending(), repo.upcomingEvents(now, settings.eventReminderMin)]);

    const deferred = planDeferred(deferredRows, now, settings);
    const released = [...deferred.send, ...deferred.drop];
    if (released.length) await deferredPushRepository.release(released.map((r) => r.id));

    const eventPlan = planEventReminders(now, settings, upcoming as PlanEvent[]);
    if (eventPlan.length) await repo.markEventReminded(eventPlan.flatMap((r) => r.userIds.map((userId) => ({ eventId: r.event.id, userId }))), now);
    if (!tasks.length) return { plan: [] as Reminder[], tasks, deferred: deferred.send, eventPlan };

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
    // спершу журнал — збій push не повинен давати повторів щохвилини
    if (plan.length) await repo.markSent(plan.flatMap((r) => r.logKeys.map((key) => ({ taskId: r.taskId, userId: r.userId, key }))), now);
    return { plan, tasks, deferred: deferred.send, eventPlan };
  });
}

async function send(plan: Reminder[], tasks: OpenTask[], now: Date) {
  // одне сповіщення на (завдання, тип) з усіма отримувачами
  const groups = new Map<string, Reminder[]>();
  for (const r of plan) groups.set(`${r.taskId}:${r.kind}`, [...(groups.get(`${r.taskId}:${r.kind}`) ?? []), r]);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const group of groups.values()) {
    const { taskId, kind, leftMs } = group[0];
    await notify(
      { event: kind, task: byId.get(taskId)!, to: group.map((r) => r.userId), vars: leftMs !== undefined ? { left: humanDuration(leftMs) } : undefined },
      now,
    ).catch((err) => console.error('[reminders] notify', err));
  }
}

async function sendEventReminders(plan: EventReminder[], now: Date) {
  for (const { event: e, userIds, leftMs } of plan) {
    await notify({ event: 'EVENT_SOON', calendarEvent: e, to: userIds, vars: { left: humanDuration(leftMs) } }, now).catch((err) => console.error('[reminders] event', err));
  }
}

/** Один прохід: рішення й журнал під блокуванням → надсилання */
export async function runRemindersOnce(now = new Date()): Promise<number> {
  const result = await decide(now);
  if (!result) return 0;
  await send(result.plan, result.tasks, now);
  await sendEventReminders(result.eventPlan, now);
  await Promise.all(
    result.deferred.map((r) =>
      pushToUser(r.userId, pushPayload(r.kind, r.task ? taskSubject(r.task) : eventSubject(r.event!.id), r.title, deferredBody(r))).catch((err) => console.error('[reminders] deferred push', err)),
    ),
  );
  return result.plan.length + result.deferred.length + result.eventPlan.length;
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

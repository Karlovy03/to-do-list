import type { Priority, TaskStatus } from '@prisma/client';
import type { ReminderSettings } from '../../settings';
import { canDisturb, prefAllows } from '../notify.service';

export interface PlanUser {
  id: string;
  quietFrom: number;
  quietTo: number;
  muteWeekends: boolean;
  notifyAssigned: boolean;
  notifyControl: boolean;
  notifyDeadline: boolean;
  notifyUpdates: boolean;
  notifyEvents: boolean;
  controlInterval: number | null;
}

export interface PlanTask {
  id: string;
  status: TaskStatus;
  priority: Priority;
  deadline: Date;
  deadlineSetAt: Date;
  isControlled: boolean;
  controlSetAt: Date | null;
  reminderInterval: number | null;
  authorId: string;
  controllerUserId: string | null;
  controlSetById: string | null;
  assignees: { userId: string; addedAt: Date; doneAt: Date | null }[];
}

export interface Reminder {
  taskId: string;
  userId: string;
  kind: 'CONTROL_REMINDER' | 'DEADLINE_SOON' | 'OVERDUE';
  /** ключі журналу нагадувань, які позначаються надісланими */
  logKeys: string[];
  /** для DEADLINE_SOON — фактичний залишок часу */
  leftMs?: number;
}

export interface PlanInput {
  now: Date;
  settings: ReminderSettings;
  tasks: PlanTask[];
  users: Map<string, PlanUser>;
  /** `${taskId}:${userId}:${key}` → коли надіслано */
  logs: Map<string, Date>;
  /** `${taskId}:${userId}` → до коли відкладено */
  snoozes: Map<string, Date>;
  /** хто сьогодні відсутній (ADR-0019): нагадувань не отримує, журнал не пишеться — після повернення нагадає раз */
  absent: ReadonlySet<string>;
}

const OPEN: TaskStatus[] = ['NEW', 'IN_PROGRESS'];
const MIN = 60_000;

export function controlIntervalFor(task: PlanTask, user: PlanUser, s: ReminderSettings): number {
  return task.reminderInterval ?? user.controlInterval ?? s.controlIntervalMin;
}

const latest = (...dates: (Date | null | undefined)[]) =>
  Math.max(...dates.filter((d): d is Date => !!d).map((d) => d.getTime()), 0);

/**
 * Обчислює, кому і що нагадати зараз. Чиста функція — нічого не надсилає (ADR-0004).
 * Нагадування в «тихі години» не губиться: умова лишається істинною і спрацює,
 * щойно людину знову можна турбувати.
 */
export function planReminders({ now, settings, tasks, users, logs, snoozes, absent }: PlanInput): Reminder[] {
  const out: Reminder[] = [];
  const t = now.getTime();

  for (const task of tasks) {
    if (!OPEN.includes(task.status)) continue;
    const overdue = t >= task.deadline.getTime();
    // хто ще не позначив «Виконано»
    const pending = new Map(task.assignees.filter((a) => !a.doneAt).map((a) => [a.userId, a]));
    const leads = [task.authorId, task.controllerUserId, task.controlSetById];

    const recipients = new Set(pending.keys());
    if (overdue && settings.overdueNotifyLeads) leads.forEach((id) => id && recipients.add(id));

    for (const userId of recipients) {
      const user = users.get(userId);
      if (!user || absent.has(userId)) continue;
      const snoozedUntil = snoozes.get(`${task.id}:${userId}`);
      if (snoozedUntil && snoozedUntil.getTime() > t) continue;
      if (!canDisturb(user, now, task.priority, settings.urgentBypassQuiet)) continue;

      const assignment = pending.get(userId);
      const last = (key: string) => logs.get(`${task.id}:${userId}:${key}`);
      // будь-яке нагадування виконавцю по контрольному скидає і таймер контролю — без двох push поспіль
      const withControl = (keys: string[]) => (task.isControlled && assignment ? [...keys, 'control'] : keys);

      if (overdue) {
        const sent = last('overdue');
        if (prefAllows('OVERDUE', user) && (!sent || t - sent.getTime() >= settings.overdueRepeatMin * MIN)) {
          out.push({ taskId: task.id, userId, kind: 'OVERDUE', logKeys: withControl(['overdue']) });
          continue;
        }
      } else if (assignment && prefAllows('DEADLINE_SOON', user)) {
        const left = task.deadline.getTime() - t;
        // поріг рахується лише якщо його перетнули після встановлення терміну
        const due = settings.deadlineOffsetsMin.filter(
          (off) => left <= off * MIN && task.deadline.getTime() - off * MIN > task.deadlineSetAt.getTime() && !last(`deadline:${off}`),
        );
        if (due.length) {
          out.push({ taskId: task.id, userId, kind: 'DEADLINE_SOON', leftMs: left, logKeys: withControl(due.map((off) => `deadline:${off}`)) });
          continue;
        }
      }

      if (task.isControlled && assignment && prefAllows('CONTROL_REMINDER', user)) {
        const interval = controlIntervalFor(task, user, settings) * MIN;
        // відлік — від пізнішого: останнього нагадування, постановки на контроль, додавання виконавця
        const since = latest(last('control'), task.controlSetAt, assignment.addedAt);
        if (t - since >= interval) out.push({ taskId: task.id, userId, kind: 'CONTROL_REMINDER', logKeys: ['control'] });
      }
    }
  }
  return out;
}

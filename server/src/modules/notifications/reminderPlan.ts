import type { Priority, TaskStatus } from '@prisma/client';
import type { ReminderSettings } from '../settings/settings.service';
import { canDisturb, prefAllows, type NotifyKind } from './notify';

export interface PlanUser {
  id: string;
  quietFrom: number;
  quietTo: number;
  muteWeekends: boolean;
  notifyAssigned: boolean;
  notifyControl: boolean;
  notifyDeadline: boolean;
  notifyUpdates: boolean;
  controlInterval: number | null;
}

export interface PlanTask {
  id: string;
  status: TaskStatus;
  priority: Priority;
  deadline: Date;
  createdAt: Date;
  isControlled: boolean;
  controlSetAt: Date | null;
  reminderInterval: number | null;
  authorId: string;
  assigneeIds: string[];
}

export interface Reminder {
  taskId: string;
  userId: string;
  kind: Extract<NotifyKind, 'CONTROL_REMINDER' | 'DEADLINE_SOON' | 'OVERDUE'>;
  /** ключі журналу, які треба позначити надісланими */
  logKeys: string[];
  /** для DEADLINE_SOON — поріг у хвилинах */
  offsetMin?: number;
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
}

const OPEN: TaskStatus[] = ['NEW', 'IN_PROGRESS'];
const MIN = 60_000;

export function controlIntervalFor(task: PlanTask, user: PlanUser, s: ReminderSettings): number {
  return task.reminderInterval ?? user.controlInterval ?? s.controlIntervalMin;
}

/**
 * Обчислює, кому і що нагадати зараз. Чиста функція — нічого не надсилає.
 * Нагадування, що припали на «тихі години», не губляться: умова лишається
 * істинною й спрацює, щойно людину знову можна турбувати.
 */
export function planReminders({ now, settings, tasks, users, logs, snoozes }: PlanInput): Reminder[] {
  const out: Reminder[] = [];
  const t = now.getTime();

  for (const task of tasks) {
    if (!OPEN.includes(task.status)) continue;
    const overdue = t >= task.deadline.getTime();

    const recipients = new Set(task.assigneeIds);
    if (overdue && settings.overdueNotifyAuthor) recipients.add(task.authorId);

    for (const userId of recipients) {
      const user = users.get(userId);
      if (!user) continue;
      const snoozedUntil = snoozes.get(`${task.id}:${userId}`);
      if (snoozedUntil && snoozedUntil.getTime() > t) continue;
      if (!canDisturb(user, now, task.priority, settings.urgentBypassQuiet)) continue;
      const isAssignee = task.assigneeIds.includes(userId);
      const last = (key: string) => logs.get(`${task.id}:${userId}:${key}`);
      // будь-яке нагадування по контрольному завданню скидає і 2-годинний таймер
      const withControl = (keys: string[]) => (task.isControlled && isAssignee ? [...keys, 'control'] : keys);

      if (overdue) {
        const sent = last('overdue');
        if (prefAllows('OVERDUE', user) && (!sent || t - sent.getTime() >= settings.overdueRepeatMin * MIN)) {
          out.push({ taskId: task.id, userId, kind: 'OVERDUE', logKeys: withControl(['overdue']) });
          continue;
        }
      } else if (isAssignee && prefAllows('DEADLINE_SOON', user)) {
        const left = task.deadline.getTime() - t;
        // поріг рахується лише якщо його перетнули вже після створення завдання
        const due = settings.deadlineOffsetsMin.filter(
          (off) => left <= off * MIN && task.deadline.getTime() - off * MIN > task.createdAt.getTime() && !last(`deadline:${off}`),
        );
        if (due.length) {
          out.push({
            taskId: task.id,
            userId,
            kind: 'DEADLINE_SOON',
            offsetMin: Math.min(...due),
            logKeys: withControl(due.map((off) => `deadline:${off}`)),
          });
          continue;
        }
      }

      if (task.isControlled && isAssignee && prefAllows('CONTROL_REMINDER', user)) {
        const interval = controlIntervalFor(task, user, settings) * MIN;
        const since = last('control') ?? task.controlSetAt;
        if (!since || t - since.getTime() >= interval) {
          out.push({ taskId: task.id, userId, kind: 'CONTROL_REMINDER', logKeys: ['control'] });
        }
      }
    }
  }
  return out;
}

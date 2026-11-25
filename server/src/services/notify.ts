import type { Priority, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { kyivParts, inQuietHours } from '../lib/time';
import { getSettings } from './settings';
import { sendPush } from './push';
import { tx } from '../lib/texts';

export type NotifyKind =
  | 'ASSIGNED'
  | 'CONTROL_ON'
  | 'CONTROL_OFF'
  | 'CONTROL_REMINDER'
  | 'DEADLINE_SOON'
  | 'OVERDUE'
  | 'UPDATE'
  | 'REVIEW'
  | 'DONE'
  | 'RETURNED'
  | 'CANCELLED';

type PrefUser = Pick<User, 'quietFrom' | 'quietTo' | 'muteWeekends' | 'notifyAssigned' | 'notifyControl' | 'notifyDeadline' | 'notifyUpdates'>;

export function prefAllows(kind: NotifyKind, u: PrefUser): boolean {
  switch (kind) {
    case 'ASSIGNED':
    case 'CANCELLED':
      return u.notifyAssigned;
    case 'CONTROL_ON':
    case 'CONTROL_OFF':
    case 'CONTROL_REMINDER':
      return u.notifyControl;
    case 'DEADLINE_SOON':
    case 'OVERDUE':
      return u.notifyDeadline;
    default:
      return u.notifyUpdates;
  }
}

/** Чи можна зараз турбувати людину push-сповіщенням */
export function canDisturb(u: PrefUser, now: Date, priority: Priority, urgentBypass: boolean): boolean {
  if (priority === 'URGENT' && urgentBypass) return true;
  const { hour, weekend } = kyivParts(now);
  if (weekend && u.muteWeekends) return false;
  return !inQuietHours(hour, u.quietFrom, u.quietTo);
}

interface NotifyInput {
  userIds: string[];
  kind: NotifyKind;
  task: { id: string; number: number; title: string; priority: Priority };
  title: string;
  body?: string;
  /** хто спричинив подію — йому не надсилаємо */
  actorId?: string | null;
}

/**
 * Подія: завжди лишає запис у стрічці сповіщень; push — лише якщо людина
 * його не вимкнула і зараз не «тихі години».
 */
export async function notify({ userIds, kind, task, title, body, actorId }: NotifyInput) {
  const ids = [...new Set(userIds)].filter((id) => id && id !== actorId);
  if (!ids.length) return;
  const [users, settings] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids }, isActive: true } }),
    getSettings(),
  ]);
  const text = body ?? tx('task_line', { number: task.number, title: task.title });
  const now = new Date();
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, taskId: task.id, kind, title, body: text })),
  });
  await Promise.all(
    users
      .filter((u) => prefAllows(kind, u) && canDisturb(u, now, task.priority, settings.urgentBypassQuiet))
      .map((u) =>
        sendPush(u.id, {
          title,
          body: text,
          url: `/tasks/${task.id}`,
          tag: `task-${task.id}-${kind}`,
          taskId: task.id,
          snooze: kind === 'CONTROL_REMINDER' || kind === 'DEADLINE_SOON' || kind === 'OVERDUE',
          urgent: task.priority === 'URGENT' || kind === 'OVERDUE',
        }),
      ),
  );
}

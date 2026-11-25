import type { NotificationKind, Priority } from '@prisma/client';
import { tx } from '../../core/texts';
import { kyivParts, inQuietHours, formatKyiv } from '../../core/time';
import { getSettings } from '../settings';
import { usersRepository } from '../users';
import { EVENTS, type PrefKey } from './events';
import { feedRepository } from './feed.repository';
import { pushToUser } from './push/dispatcher';

export interface NotifyTask {
  id: string;
  number: number;
  title: string;
  priority: Priority;
  deadline: Date;
}

export interface NotifyInput {
  event: NotificationKind;
  task: NotifyTask;
  to: (string | null | undefined)[];
  /** ініціатор — не отримує сповіщення про власну дію */
  actorId?: string | null;
  /** інший заголовок для того ж типу (напр. «на ваш контроль») */
  titleKey?: string;
  vars?: Record<string, string | number>;
  /** додати рядок із терміном у тіло */
  withDeadline?: 'line' | 'new_line';
  /** коментар — лише в стрічку застосунку, НЕ в push (ADR-0005) */
  comment?: { name: string; text: string };
}

type QuietUser = { quietFrom: number; quietTo: number; muteWeekends: boolean } & Record<PrefKey, boolean>;

/** Чи можна зараз турбувати людину push-сповіщенням */
export function canDisturb(u: QuietUser, now: Date, priority: Priority, urgentBypass: boolean): boolean {
  if (priority === 'URGENT' && urgentBypass) return true;
  const { hour, weekend } = kyivParts(now);
  if (weekend && u.muteWeekends) return false;
  return !inQuietHours(hour, u.quietFrom, u.quietTo);
}

export const prefAllows = (event: NotificationKind, u: QuietUser) => u[EVENTS[event].pref];

/** Унікальні отримувачі без ініціатора */
export function recipients(to: NotifyInput['to'], actorId?: string | null): string[] {
  return [...new Set(to.filter((id): id is string => !!id && id !== actorId))];
}

/**
 * Єдиний вхід для сповіщень: запис у стрічці — завжди;
 * push — якщо тип не вимкнено і зараз можна турбувати.
 */
export async function notify(input: NotifyInput, now = new Date()) {
  const ids = recipients(input.to, input.actorId);
  if (!ids.length) return;
  const [users, settings] = await Promise.all([usersRepository.findActiveByIds(ids), getSettings()]);
  if (!users.length) return;

  const meta = EVENTS[input.event];
  const { task } = input;
  const title = tx(input.titleKey ?? meta.title, input.vars);
  const lines = [tx('notifications.common.task_line', { number: task.number, title: task.title })];
  if (input.withDeadline) lines.push(tx(`notifications.deadline.${input.withDeadline}`, { deadline: formatKyiv(task.deadline) }));
  const pushBody = lines.join('\n');
  const feedBody = input.comment ? `${pushBody}\n${tx('notifications.common.comment_line', input.comment)}` : pushBody;

  await feedRepository.createMany(users.map((u) => ({ userId: u.id, taskId: task.id, kind: input.event, title, body: feedBody })));

  const urgent = !!meta.urgent || task.priority === 'URGENT';
  const payload = {
    title,
    body: pushBody,
    url: `/tasks/${task.id}`,
    tag: `task-${task.id}-${input.event}`,
    taskId: task.id,
    urgent,
    actions: { open: tx('notifications.push.action_open'), ...(meta.snooze ? { snooze: tx('notifications.push.action_snooze') } : {}) },
  };
  await Promise.all(
    users
      .filter((u) => prefAllows(input.event, u) && canDisturb(u, now, task.priority, settings.urgentBypassQuiet))
      .map((u) => pushToUser(u.id, payload)),
  );
}

/** Після коміту: не блокує відповідь, помилка лише логується */
export function notifyInBackground(input: NotifyInput) {
  notify(input).catch((err) => console.error('[notify]', input.event, err));
}

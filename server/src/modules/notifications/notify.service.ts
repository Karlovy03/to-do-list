import type { NotificationKind, Priority } from '@prisma/client';
import { tx } from '../../core/texts';
import { kyivParts, inQuietHours, formatKyiv } from '../../core/time';
import { getSettings } from '../settings';
import { usersRepository } from '../users';
import { EVENTS, type PrefKey } from './events';
import { feedRepository } from './feed.repository';
import { pushToUser } from './push/dispatcher';
import type { PushPayload } from './push/types';

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
  /** хто виконав дію — лише в стрічку: ПІБ не передаємо через сервери Google/Apple (ADR-0005) */
  who?: string;
}

/** Push про ці події не губиться в тихі години, а приходить, щойно їх закінчено (рішення власника) */
const DEFER_IN_QUIET = new Set<NotificationKind>(['ASSIGNED', 'CONTROL_ON', 'CONTROL_CHANGED']);

export type QuietUser = { quietFrom: number; quietTo: number; muteWeekends: boolean } & Record<PrefKey, boolean>;

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

  const { task } = input;
  const title = tx(input.titleKey ?? EVENTS[input.event].title, input.vars);
  const lines = [tx('notifications.common.task_line', { number: task.number, title: task.title })];
  if (input.withDeadline) lines.push(tx(`notifications.deadline.${input.withDeadline}`, { deadline: formatKyiv(task.deadline) }));
  const pushBody = lines.join('\n');
  const feedLines = [pushBody];
  if (input.who) feedLines.push(tx('notifications.common.who_line', { name: input.who }));
  if (input.comment) feedLines.push(tx('notifications.common.comment_line', input.comment));
  const feedBody = feedLines.join('\n');

  const wanted = users.filter((u) => prefAllows(input.event, u));
  const free = (u: QuietUser) => canDisturb(u, now, task.priority, settings.urgentBypassQuiet);
  const deferred = new Set(DEFER_IN_QUIET.has(input.event) ? wanted.filter((u) => !free(u)).map((u) => u.id) : []);

  await feedRepository.createMany(
    users.map((u) => ({ userId: u.id, taskId: task.id, kind: input.event, title, body: feedBody, pushDeferred: deferred.has(u.id) })),
  );

  const payload = pushPayload(input.event, task, title, pushBody);
  await Promise.all(wanted.filter(free).map((u) => pushToUser(u.id, payload)));
}

/** Вміст push (ADR-0005): тип події, № і назва завдання, термін — і нічого більше */
export function pushPayload(event: NotificationKind, task: Pick<NotifyTask, 'id' | 'priority'>, title: string, body: string): PushPayload {
  const meta = EVENTS[event];
  return {
    title,
    body,
    url: `/t/${task.id}`,
    tag: `task-${task.id}-${event}`,
    taskId: task.id,
    urgent: !!meta.urgent || task.priority === 'URGENT',
    actions: { open: tx('notifications.push.action_open'), ...(meta.snooze ? { snooze: tx('notifications.push.action_snooze') } : {}) },
  };
}

/** Після коміту: не блокує відповідь, помилка лише логується */
export function notifyInBackground(input: NotifyInput) {
  notify(input).catch((err) => console.error('[notify]', input.event, err));
}

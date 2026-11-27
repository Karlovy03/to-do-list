import type { NotificationKind, Priority } from '@prisma/client';
import { tx } from '../../core/texts';
import { kyivDay, kyivParts, inQuietHours, formatKyiv, formatKyivRange } from '../../core/time';
import { absencesRepository } from '../absences';
import { getSettings } from '../settings';
import { usersRepository } from '../users';
import { EVENTS, type PrefKey } from './events';
import { feedRepository } from './feed.repository';
import { pushToUser } from './push/dispatcher';
import type { PushPayload } from './push/types';
import { announce } from '../live';

export interface NotifyTask {
  id: string;
  number: number;
  title: string;
  priority: Priority;
  deadline: Date;
}

/** Захід у сповіщенні (ADR-0016). gone — захід видалено: у стрічці лишається текст без посилання */
export interface NotifyEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  gone?: boolean;
}

/** Про що сповіщення: завдання (з терміном за потреби) або захід */
type About =
  | { task: NotifyTask; withDeadline?: 'line' | 'new_line'; calendarEvent?: never }
  | { calendarEvent: NotifyEvent; task?: never; withDeadline?: never };

export type NotifyInput = About & {
  event: NotificationKind;
  to: (string | null | undefined)[];
  /** ініціатор — не отримує сповіщення про власну дію */
  actorId?: string | null;
  /** інший заголовок для того ж типу (напр. «на ваш контроль») */
  titleKey?: string;
  vars?: Record<string, string | number>;
  /** коментар — лише в стрічку застосунку, НЕ в push (ADR-0005) */
  comment?: { name: string; text: string };
  /** хто виконав дію — лише в стрічку: ПІБ не передаємо через сервери Google/Apple (ADR-0005) */
  who?: string;
};

/** Куди веде сповіщення і чим воно ідентифікується в push */
export interface NotifySubject {
  taskId?: string;
  eventId?: string;
  url: string;
  /** основа tag: повторне сповіщення про той самий предмет замінює попереднє */
  key: string;
  priority: Priority;
}

/** Рядок тіла про захід: назва й час (ADR-0005) — і для відкладеного push, і для звичайного */
export const eventLine = (e: { title: string; startsAt: Date; endsAt: Date }) =>
  tx('notifications.event.line', { title: e.title, when: formatKyivRange(e.startsAt, e.endsAt) });

/** Одна функція на обидва предмети: посилання, ключ і рядки тіла (ADR-0005: без описів і коментарів) */
function subjectOf(input: NotifyInput): { subject: NotifySubject; lines: string[] } {
  if (input.calendarEvent) {
    const e = input.calendarEvent;
    const subject = e.gone ? { ...eventSubject(e.id), eventId: undefined, url: '/events' } : eventSubject(e.id);
    return { subject, lines: [eventLine(e)] };
  }
  const { task } = input;
  const lines = [tx('notifications.common.task_line', { number: task.number, title: task.title })];
  if (input.withDeadline) lines.push(tx(`notifications.deadline.${input.withDeadline}`, { deadline: formatKyiv(task.deadline) }));
  return { subject: taskSubject(task), lines };
}

export const eventSubject = (id: string): NotifySubject => ({ eventId: id, url: `/events/e/${id}`, key: `event-${id}`, priority: 'NORMAL' });

export const taskSubject = (task: Pick<NotifyTask, 'id' | 'priority'>): NotifySubject => ({ taskId: task.id, url: `/t/${task.id}`, key: `task-${task.id}`, priority: task.priority });

/** Push про ці події не губиться в тихі години, а приходить, щойно їх закінчено (рішення власника) */
const DEFER_IN_QUIET = new Set<NotificationKind>(['ASSIGNED', 'CONTROL_ON', 'CONTROL_CHANGED', 'EVENT_INVITED', 'EVENT_CHANGED', 'EVENT_CANCELLED']);

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

  const { subject, lines } = subjectOf(input);
  const meta = EVENTS[input.event];
  const title = tx(input.titleKey ?? meta.title, input.vars);
  const pushBody = lines.join('\n');
  const feedLines = [pushBody];
  if (input.who) feedLines.push(tx('notifications.common.who_line', { name: input.who }));
  if (input.comment) feedLines.push(tx('notifications.common.comment_line', input.comment));
  const feedBody = feedLines.join('\n');

  // відсутнім (ADR-0019) — лише стрічка: ні push, ні відкладення до кінця тихих годин
  const absent = await absencesRepository.absentOn(users.map((u) => u.id), kyivDay(now));
  const wanted = users.filter((u) => prefAllows(input.event, u) && !absent.has(u.id));
  // нагадування про захід ігнорує тихі години: людина однаково йде на нараду
  const free = (u: QuietUser) => !!meta.ignoresQuiet || canDisturb(u, now, subject.priority, settings.urgentBypassQuiet);
  const deferred = new Set(DEFER_IN_QUIET.has(input.event) ? wanted.filter((u) => !free(u)).map((u) => u.id) : []);

  await feedRepository.createMany(
    users.map((u) => ({ userId: u.id, taskId: subject.taskId, eventId: subject.eventId, kind: input.event, title, body: feedBody, pushDeferred: deferred.has(u.id) })),
  );
  // відкритий застосунок одержувача оновлює стрічку й лічильник одразу (ADR-0021)
  const got = new Set(users.map((u) => u.id));
  announce({ t: 'feed' }, (v) => got.has(v.id));

  const payload = pushPayload(input.event, subject, title, pushBody);
  await Promise.all(wanted.filter(free).map((u) => pushToUser(u.id, payload)));
}

/** Вміст push (ADR-0005): тип події, № і назва завдання чи назва й час заходу — і нічого більше */
export function pushPayload(event: NotificationKind, subject: NotifySubject, title: string, body: string): PushPayload {
  const meta = EVENTS[event];
  return {
    title,
    body,
    url: subject.url,
    tag: `${subject.key}-${event}`,
    taskId: subject.taskId,
    urgent: !!meta.urgent || subject.priority === 'URGENT',
    actions: { open: tx('notifications.push.action_open'), ...(meta.snooze ? { snooze: tx('notifications.push.action_snooze') } : {}) },
  };
}

/** Після коміту: не блокує відповідь, помилка лише логується */
export function notifyInBackground(input: NotifyInput) {
  notify(input).catch((err) => console.error('[notify]', input.event, err));
}

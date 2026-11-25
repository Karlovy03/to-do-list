import type { NotificationKind } from '@prisma/client';

/** Яке налаштування людини вимикає цей тип сповіщень */
export type PrefKey = 'notifyAssigned' | 'notifyControl' | 'notifyDeadline' | 'notifyUpdates';

interface EventMeta {
  pref: PrefKey;
  /** ключ тексту заголовка */
  title: string;
  /** у сповіщенні є кнопка «Відкласти» */
  snooze?: boolean;
  urgent?: boolean;
}

export const EVENTS: Record<NotificationKind, EventMeta> = {
  ASSIGNED: { pref: 'notifyAssigned', title: 'notifications.assignment.assigned' },
  UNASSIGNED: { pref: 'notifyAssigned', title: 'notifications.assignment.unassigned' },
  RETURNED: { pref: 'notifyAssigned', title: 'notifications.assignment.returned' },
  CANCELLED: { pref: 'notifyAssigned', title: 'notifications.assignment.cancelled' },
  REOPENED: { pref: 'notifyAssigned', title: 'notifications.assignment.reopened' },
  CONTROL_ON: { pref: 'notifyControl', title: 'notifications.control.on' },
  CONTROL_CHANGED: { pref: 'notifyControl', title: 'notifications.control.changed' },
  CONTROL_OFF: { pref: 'notifyControl', title: 'notifications.control.off' },
  CONTROL_REMINDER: { pref: 'notifyControl', title: 'notifications.control.reminder', snooze: true },
  DEADLINE_SOON: { pref: 'notifyDeadline', title: 'notifications.deadline.soon', snooze: true },
  DEADLINE_CHANGED: { pref: 'notifyDeadline', title: 'notifications.deadline.changed' },
  OVERDUE: { pref: 'notifyDeadline', title: 'notifications.deadline.overdue', snooze: true, urgent: true },
  PROGRESS: { pref: 'notifyUpdates', title: 'notifications.progress.progress' },
  COMMENT: { pref: 'notifyUpdates', title: 'notifications.progress.comment' },
  STARTED: { pref: 'notifyUpdates', title: 'notifications.progress.started' },
  DONE_PART: { pref: 'notifyUpdates', title: 'notifications.progress.done_part' },
  DONE: { pref: 'notifyUpdates', title: 'notifications.progress.done' },
};

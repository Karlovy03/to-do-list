import type { EventStatus, Notification, Priority, TaskStatus, User } from '@prisma/client';
import type { ReminderSettings } from '../../settings';
import { canDisturb, eventLine } from '../notify.service';

export type DeferredRow = Notification & {
  user: User;
  task: { id: string; status: TaskStatus; priority: Priority } | null;
  event: { id: string; title: string; status: EventStatus; startsAt: Date; endsAt: Date } | null;
};

export interface DeferredDecision {
  /** надіслати зараз */
  send: DeferredRow[];
  /** зняти позначку без push: завдання закрите чи захід минув/скасований, сповіщення прочитане, людину вимкнено */
  drop: DeferredRow[];
}

/** Які відкладені push можна доставити зараз. Чиста функція — час і налаштування передаються (ADR-0004) */
export function planDeferred(rows: DeferredRow[], now: Date, settings: ReminderSettings): DeferredDecision {
  const out: DeferredDecision = { send: [], drop: [] };
  for (const r of rows) {
    const taskOpen = !!r.task && (r.task.status === 'NEW' || r.task.status === 'IN_PROGRESS');
    // скасування заходу теж варто донести, а от минулий захід — уже ні; запрошення на скасований — теж ні
    const eventRelevant = !!r.event && r.event.endsAt.getTime() > now.getTime() && (r.event.status === 'PLANNED' || r.kind === 'EVENT_CANCELLED');
    if (!(taskOpen || eventRelevant) || r.readAt || !r.user.isActive) out.drop.push(r);
    else if (canDisturb(r.user, now, r.task?.priority ?? 'NORMAL', settings.urgentBypassQuiet)) out.send.push(r);
  }
  return out;
}

/**
 * Тіло відкладеного push. Для заходу — заново з назви й часу: запис стрічки може містити причину
 * скасування, а її push не передає (ADR-0005). Для завдань стрічка коментарів не містить (ADR-0013).
 */
export const deferredBody = (r: DeferredRow) => (r.event ? eventLine(r.event) : r.body);

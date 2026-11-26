import type { Notification, Priority, TaskStatus, User } from '@prisma/client';
import type { ReminderSettings } from '../../settings';
import { canDisturb } from '../notify.service';

export type DeferredRow = Notification & { user: User; task: { id: string; status: TaskStatus; priority: Priority } | null };

export interface DeferredDecision {
  /** надіслати зараз */
  send: DeferredRow[];
  /** зняти позначку без push: завдання вже закрите, сповіщення прочитане, людину вимкнено */
  drop: DeferredRow[];
}

/** Які відкладені push можна доставити зараз. Чиста функція — час і налаштування передаються (ADR-0004) */
export function planDeferred(rows: DeferredRow[], now: Date, settings: ReminderSettings): DeferredDecision {
  const out: DeferredDecision = { send: [], drop: [] };
  for (const r of rows) {
    const open = r.task && (r.task.status === 'NEW' || r.task.status === 'IN_PROGRESS');
    if (!open || r.readAt || !r.user.isActive) out.drop.push(r);
    else if (canDisturb(r.user, now, r.task!.priority, settings.urgentBypassQuiet)) out.send.push(r);
  }
  return out;
}

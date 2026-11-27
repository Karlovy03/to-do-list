import type { ReminderSettings } from '../../settings';
import { prefAllows } from '../notify.service';
import type { PlanUser } from './plan';

export interface PlanEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  /** лише ті, кому ще не нагадали */
  participants: { userId: string; remindedAt: Date | null; user: PlanUser & { isActive: boolean } }[];
}

export interface EventReminder {
  event: PlanEvent;
  userIds: string[];
  leftMs: number;
}

/**
 * Кому нагадати про захід зараз. Чиста функція (ADR-0004). Раз на учасника; тихі години не діють —
 * людина однаково йде на нараду; той, хто вимкнув сповіщення про заходи, нагадування не отримує.
 */
export function planEventReminders(now: Date, settings: Pick<ReminderSettings, 'eventReminderMin'>, events: PlanEvent[], absent: ReadonlySet<string> = new Set()): EventReminder[] {
  const out: EventReminder[] = [];
  for (const e of events) {
    const leftMs = e.startsAt.getTime() - now.getTime();
    if (leftMs <= 0 || leftMs > settings.eventReminderMin * 60_000) continue;
    const userIds = e.participants.filter((p) => !p.remindedAt && p.user.isActive && !absent.has(p.userId) && prefAllows('EVENT_SOON', p.user)).map((p) => p.userId);
    if (userIds.length) out.push({ event: e, userIds, leftMs });
  }
  return out;
}

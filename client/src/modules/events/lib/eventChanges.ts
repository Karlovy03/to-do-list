import type { AppEvent } from '@/shared/api/types';
import type { EventChanges, EventInput } from '../api/events.api';

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Лише змінене: незмінений початок не надсилається — інакше захід, що вже триває,
 * не можна було б зберегти (початок у минулому), а учасникам прийшло б зайве «змінено час».
 */
export function eventChanges(e: AppEvent, v: EventInput): EventChanges {
  const c: EventChanges = {};
  if (v.title !== e.title) c.title = v.title;
  if (v.description !== e.description) c.description = v.description;
  if (Date.parse(v.startsAt) !== Date.parse(e.startsAt)) c.startsAt = v.startsAt;
  if (v.durationMin !== e.durationMin) c.durationMin = v.durationMin;
  if (!sameSet(v.participantIds, e.participants.map((p) => p.id))) c.participantIds = v.participantIds;
  return c;
}

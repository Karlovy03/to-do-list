import type { AppEvent } from '@/shared/api/types';
import { kyivParts } from '@/shared/lib/time';

export type EventGroupId = 'today' | 'tomorrow' | 'week' | 'later' | 'past';
export const EVENT_GROUP_ORDER: EventGroupId[] = ['today', 'tomorrow', 'week', 'later', 'past'];

const DAY = 864e5;

/** Порядковий номер київського дня — різниця в днях не залежить від переходу на літній час */
function dayNumber(d: Date) {
  const p = kyivParts(d);
  return Date.UTC(p.y, p.m - 1, p.d) / DAY;
}

/** Сьогодні (зокрема ті, що вже тривають) → завтра → до кінця цього тижня (неділя) → пізніше; що скінчились — минулі */
export function groupOf(e: Pick<AppEvent, 'startsAt' | 'endsAt'>, now: Date): EventGroupId {
  if (Date.parse(e.endsAt) <= now.getTime()) return 'past';
  const ahead = dayNumber(new Date(e.startsAt)) - dayNumber(now);
  if (ahead <= 0) return 'today';
  if (ahead === 1) return 'tomorrow';
  const weekday = new Date(dayNumber(now) * DAY).getUTCDay(); // 0 — неділя
  return ahead <= (7 - weekday) % 7 ? 'week' : 'later';
}

/** Найближчі — за початком; минулі — найсвіжіші першими. Порожні групи не показуються */
export function groupEvents(events: AppEvent[], now = new Date()): { id: EventGroupId; events: AppEvent[] }[] {
  const buckets = new Map<EventGroupId, AppEvent[]>(EVENT_GROUP_ORDER.map((g) => [g, []]));
  for (const e of events) buckets.get(groupOf(e, now))!.push(e);
  const byStart = (a: AppEvent, b: AppEvent) => Date.parse(a.startsAt) - Date.parse(b.startsAt);
  return EVENT_GROUP_ORDER.map((id) => ({ id, events: buckets.get(id)!.sort(id === 'past' ? (a, b) => byStart(b, a) : byStart) })).filter((g) => g.events.length > 0);
}

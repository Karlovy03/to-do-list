import type { AppEvent, Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { dayKey, formatDay, formatTime, shortDuration } from '@/shared/lib/time';
import type { TimeTone } from '@/shared/ui';

const MIN = 60_000;
const DAY = 864e5;

/** Стан заходу з часу: у базі лише «заплановано / скасовано» (ADR-0016) */
export type EventPhase = 'cancelled' | 'past' | 'live' | 'upcoming';

export function phaseOf(e: Pick<AppEvent, 'status' | 'startsAt' | 'endsAt'>, now: Date): EventPhase {
  if (e.status === 'CANCELLED') return 'cancelled';
  if (Date.parse(e.endsAt) <= now.getTime()) return 'past';
  return Date.parse(e.startsAt) <= now.getTime() ? 'live' : 'upcoming';
}

const hours = (n: number | string) => t('shared.time.hours', { n });
const minutes = (n: number) => t('shared.time.min', { n });

/** Орієнтовна тривалість: «30 хв», «1 год», «1,5 год», «1 год 20 хв» */
export function durationLabel(min: number): string {
  if (min < 60) return minutes(min);
  if (min % 60 === 0) return hours(min / 60);
  if (min % 30 === 0) return hours((min / 60).toLocaleString('uk-UA'));
  return `${hours(Math.floor(min / 60))} ${minutes(min % 60)}`;
}

/** Точніше за shortDuration — для картки заходу: «6 год 10 хв» */
function preciseDuration(ms: number): string {
  const min = Math.max(1, Math.round(ms / MIN));
  if (min >= 48 * 60) return shortDuration(ms);
  return durationLabel(min);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Часовий чип заходу: колір = наскільки скоро (як у завдань), «триває» — темно-синій.
 * precise — у картці заходу: «через 6 год 10 хв» замість «через 6 год».
 */
export function eventChip(e: AppEvent, now = new Date(), precise = false): { tone: TimeTone; time: string; rest?: string } {
  const phase = phaseOf(e, now);
  const start = new Date(e.startsAt);
  const otherDay = dayKey(start) !== dayKey(now) ? formatDay(start, now) : undefined;
  const span = precise ? preciseDuration : shortDuration;
  if (phase === 'cancelled') return { tone: 'calm', time: t('events.time.cancelled'), rest: otherDay };
  if (phase === 'past') return { tone: 'calm', time: t('events.time.past'), rest: otherDay };
  // залишок — у «rest»: на вузькій колонці він скорочується трьома крапками, а «Триває» лишається
  if (phase === 'live') return { tone: 'live', time: t('events.time.live'), rest: t('events.time.live_left', { left: span(Date.parse(e.endsAt) - now.getTime()) }) };
  if (!otherDay) return { tone: 'soon', time: t('events.time.in', { left: span(start.getTime() - now.getTime()) }) };
  const tomorrow = dayKey(start) === dayKey(new Date(now.getTime() + DAY));
  return { tone: tomorrow ? 'soon' : 'calm', time: otherDay };
}

/** «Сьогодні, 17:30–18:00» */
export function eventWhen(e: Pick<AppEvent, 'startsAt' | 'endsAt'>, now = new Date()): string {
  return `${capitalize(formatDay(e.startsAt, now))}, ${formatTime(e.startsAt)}–${formatTime(e.endsAt)}`;
}

/** Чи прийде мені нагадування: я в заході, він ще не почався, сповіщення про заходи не вимкнені */
export const remindsMe = (e: AppEvent, me: Me, now = new Date()) => e.mine && phaseOf(e, now) === 'upcoming' && me.prefs.notifyEvents;

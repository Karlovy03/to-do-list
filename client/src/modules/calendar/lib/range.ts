import { weekdayNames } from '@/shared/lib/calendar';
import { formatDate, formatDay, formatLongDate, fromKyiv, kyivParts } from '@/shared/lib/time';

export type Mode = 'day' | 'week';

/**
 * День — ключ «РРРР-ММ-ДД» за Києвом. Арифметика днів — у «цивільному» UTC (без поясів і літнього часу),
 * а миті початку годин — через fromKyiv: так 29 березня й 25 жовтня не з'їдають і не дублюють годину.
 */
const parse = (key: string) => key.split('-').map(Number) as [number, number, number];
const keyOf = (utc: number) => new Date(utc).toISOString().slice(0, 10);

export const isDayKey = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function todayKey(now = new Date()) {
  const p = kyivParts(now);
  return keyOf(Date.UTC(p.y, p.m - 1, p.d));
}

export function addDays(key: string, n: number) {
  const [y, m, d] = parse(key);
  return keyOf(Date.UTC(y, m - 1, d + n));
}

/** 0 — понеділок … 6 — неділя */
export const weekday = (key: string) => (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Мить, коли в Києві настає вказана година цього дня; 24 — північ наступного */
export function atHour(key: string, hour: number): Date {
  const [y, m, d] = parse(key);
  return hour >= 24 ? atHour(addDays(key, 1), hour - 24) : fromKyiv(y, m, d, hour);
}

/** Дні періоду й межі запиту: день — від півночі до півночі, тиждень — з понеділка */
export function period(mode: Mode, key: string) {
  const first = mode === 'week' ? addDays(key, -weekday(key)) : key;
  const days = Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) => addDays(first, i));
  return { days, from: atHour(first, 0), to: atHour(addDays(first, days.length), 0) };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «Сьогодні, 26 листопада», «П'ятниця, 4 грудня»; тиждень — «23–29 листопада» або «30 листопада – 6 грудня» */
export function periodTitle(mode: Mode, key: string, now = new Date()) {
  if (mode === 'day') {
    const noon = atHour(key, 12);
    const near = Math.abs(Date.parse(key) - Date.parse(todayKey(now))) <= 864e5; // вчора, сьогодні, завтра — словом
    return near ? `${cap(formatDay(noon, now))}, ${formatDate(noon)}` : cap(formatLongDate(noon));
  }
  const { days } = period('week', key);
  const a = atHour(days[0], 12);
  const b = atHour(days[6], 12);
  return days[0].slice(0, 7) === days[6].slice(0, 7) ? `${kyivParts(a).d}–${formatDate(b)}` : `${formatDate(a)} – ${formatDate(b)}`;
}

/** «Пн 23» — підпис рядка тижня */
export const dayLabel = (key: string) => `${weekdayNames()[weekday(key)]} ${parse(key)[2]}`;

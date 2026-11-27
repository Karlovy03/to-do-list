import { weekdayNames } from '@/shared/lib/calendar';
import { addDays, dayTitle, weekday } from '@/shared/lib/days';
import { formatDate, fromKyiv, kyivParts } from '@/shared/lib/time';

export type Mode = 'day' | 'week';

// дні за Києвом — спільні з відсутностями
export { addDays, isDayKey, todayKey, weekday } from '@/shared/lib/days';

const parse = (key: string) => key.split('-').map(Number) as [number, number, number];

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

/** «Сьогодні, 26 листопада», «Пʼятниця, 4 грудня»; тиждень — «23–29 листопада» або «30 листопада – 6 грудня» */
export function periodTitle(mode: Mode, key: string, now = new Date()) {
  if (mode === 'day') return dayTitle(key, now);
  const { days } = period('week', key);
  const a = atHour(days[0], 12);
  const b = atHour(days[6], 12);
  return days[0].slice(0, 7) === days[6].slice(0, 7) ? `${kyivParts(a).d}–${formatDate(b)}` : `${formatDate(a)} – ${formatDate(b)}`;
}

/** «Пн 23» — підпис рядка тижня */
export const dayLabel = (key: string) => `${weekdayNames()[weekday(key)]} ${parse(key)[2]}`;

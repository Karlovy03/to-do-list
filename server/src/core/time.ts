import { tx } from './texts';

const TZ = 'Europe/Kyiv';

const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false, weekday: 'short' });

export function kyivParts(d: Date): { hour: number; weekend: boolean } {
  let hour = 0;
  let weekday = '';
  for (const p of fmt.formatToParts(d)) {
    if (p.type === 'hour') hour = Number(p.value) % 24;
    if (p.type === 'weekday') weekday = p.value;
  }
  return { hour, weekend: weekday === 'Sat' || weekday === 'Sun' };
}

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * Календарний день за Києвом, «РРРР-ММ-ДД». Відсутності зберігаються саме днями (@db.Date):
 * у базі такий день — це опівніч UTC тієї дати, тож арифметика днів не залежить від переходу на літній час.
 */
export const kyivDay = (d: Date): string => dayFmt.format(d);
export const dayDate = (key: string): Date => new Date(`${key}T00:00:00.000Z`);
export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);
export const addDays = (key: string, n: number): string => dayKey(new Date(dayDate(key).getTime() + n * 864e5));
/** Скільки днів від a до b (b − a) */
export const daysBetween = (a: string, b: string): number => Math.round((dayDate(b).getTime() - dayDate(a).getTime()) / 864e5);

/** true, якщо година потрапляє в «тихий» проміжок [from, to) з переходом через північ */
export function inQuietHours(hour: number, from: number, to: number): boolean {
  if (from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

export function formatKyiv(d: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

const timeFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

/** «26.11, 17:30–18:00»; якщо кінець іншого дня — «26.11, 17:30 – 27.11, 09:00» */
export function formatKyivRange(start: Date, end: Date): string {
  const sameDay = formatKyiv(start).slice(0, 5) === formatKyiv(end).slice(0, 5);
  return sameDay ? `${formatKyiv(start)}–${timeFmt.format(end)}` : `${formatKyiv(start)} – ${formatKyiv(end)}`;
}

type Form = 'one' | 'few' | 'many';

/** Українська множина: 1, 21 день · 2–4, 22 дні · 5–20, 11–14 днів */
export function pluralForm(n: number): Form {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return 'one';
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'few';
  return 'many';
}

/** Людська тривалість для «залишилось …»: дні, години або хвилини (округлення вниз) */
export function humanDuration(ms: number): string {
  const min = Math.max(1, Math.floor(ms / 60_000));
  if (min >= 2 * 1440) {
    const n = Math.floor(min / 1440);
    return tx(`shared.durations.day_${pluralForm(n)}`, { n });
  }
  if (min >= 60) {
    const n = Math.floor(min / 60);
    return tx(`shared.durations.hour_${pluralForm(n)}`, { n });
  }
  return tx('shared.durations.minutes', { n: min });
}

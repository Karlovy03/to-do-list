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

function plural(n: number, base: 'day' | 'hour') {
  if (n === 1) return tx(`${base}_one`);
  return tx(n < 5 ? `${base}_few` : `${base}_many`, { n });
}

export function humanMinutes(min: number): string {
  if (min % 1440 === 0) return plural(min / 1440, 'day');
  if (min % 60 === 0) return plural(min / 60, 'hour');
  return tx('minutes', { n: min });
}

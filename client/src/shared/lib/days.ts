import { formatDate, formatDay, formatLongDate, fromKyiv, kyivParts } from './time';

/**
 * День — ключ «РРРР-ММ-ДД» за Києвом. Арифметика днів — у «цивільному» UTC (без поясів і літнього часу),
 * а миті — через fromKyiv: так 29 березня й 25 жовтня не з'їдають і не дублюють годину.
 * Тут живе все, що рахує цілими днями: календар, відсутності.
 */
const parse = (key: string) => key.split('-').map(Number) as [number, number, number];
const keyOf = (utc: number) => new Date(utc).toISOString().slice(0, 10);

export const isDayKey = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function todayKey(now = new Date()) {
  const p = kyivParts(now);
  return keyOf(Date.UTC(p.y, p.m - 1, p.d));
}

/** Київський день миті */
export const dayOf = (d: Date | string) => todayKey(new Date(d));

export function addDays(key: string, n: number) {
  const [y, m, d] = parse(key);
  return keyOf(Date.UTC(y, m - 1, d + n));
}

/** b − a, у днях */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

/** 0 — понеділок … 6 — неділя */
export const weekday = (key: string) => (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Полудень цього дня за Києвом — безпечна мить для форматування дати */
export const noonOf = (key: string) => {
  const [y, m, d] = parse(key);
  return fromKyiv(y, m, d, 12);
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «Сьогодні, 26 листопада», «Завтра, 27 листопада», «Пʼятниця, 4 грудня» */
export function dayTitle(key: string, now = new Date()) {
  const noon = noonOf(key);
  const near = Math.abs(daysBetween(todayKey(now), key)) <= 1;
  return near ? `${cap(formatDay(noon, now))}, ${formatDate(noon)}` : cap(formatLongDate(noon));
}

/** «28 листопада»; коротко — «28.11» (вузькі колонки Fold і Flip) */
export function dayText(key: string, short = false) {
  const [, m, d] = parse(key);
  return short ? `${d}.${String(m).padStart(2, '0')}` : formatDate(noonOf(key));
}

/** «1–14 грудня», «30 листопада – 3 грудня»; коротко — «1–14.12», «30.11–3.12»; один день — як dayText */
export function dayRange(start: string, end: string, short = false) {
  if (start === end) return dayText(start, short);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (short) return `${sameMonth ? parse(start)[2] : dayText(start, true)}–${dayText(end, true)}`;
  return sameMonth ? `${parse(start)[2]}–${dayText(end)}` : `${dayText(start)} – ${dayText(end)}`;
}

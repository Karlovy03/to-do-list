/** Календарна сітка місяця: 6 тижнів по 7 днів, тиждень з понеділка. Дні — «цивільні», без часових поясів */
export interface Day {
  y: number;
  m: number;
  d: number;
  inMonth: boolean;
}

export function monthGrid(y: number, m: number): Day[] {
  const first = new Date(Date.UTC(y, m - 1, 1));
  const shift = (first.getUTCDay() + 6) % 7; // понеділок = 0
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(Date.UTC(y, m - 1, 1 - shift + i));
    return { y: day.getUTCFullYear(), m: day.getUTCMonth() + 1, d: day.getUTCDate(), inMonth: day.getUTCMonth() === m - 1 };
  });
}

export const addMonths = (y: number, m: number, n: number) => {
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
};

/** Порівняння днів без часу: від'ємне — a раніше */
export const compareDays = (a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }) =>
  Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d);

const weekdayFmt = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('uk-UA', { month: 'long', timeZone: 'UTC' });

/** «Пн» … «Нд» */
export const weekdayNames = () =>
  Array.from({ length: 7 }, (_, i) => {
    const s = weekdayFmt.format(new Date(Date.UTC(2024, 0, 1 + i)));
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

/** «Листопад 2026» */
export const monthTitle = (y: number, m: number) => {
  const s = monthFmt.format(new Date(Date.UTC(y, m - 1, 1)));
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} ${y}`;
};

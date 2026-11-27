import { kyivParts } from '@/shared/lib/time';
import { atHour } from './range';

/** Відрізок часу в мс */
export interface Span {
  start: number;
  end: number;
}

/** Положення на доріжці у відсотках її ширини; cut — продовжується за межами видимого (стрілка) */
export interface Placed {
  left: number;
  width: number;
  cutStart: boolean;
  cutEnd: boolean;
}

export function place(item: Span, win: Span): Placed | null {
  if (item.end <= win.start || item.start >= win.end) return null;
  const total = win.end - win.start;
  const a = Math.max(item.start, win.start);
  const b = Math.min(item.end, win.end);
  return { left: ((a - win.start) / total) * 100, width: ((b - a) / total) * 100, cutStart: item.start < win.start, cutEnd: item.end > win.end };
}

/**
 * Доріжки накладань: кожен елемент — у першу вільну доріжку за початком.
 * minMs — найменша «видима» тривалість: короткий захід малюється ширшим, ніж триває, і не має налазити на сусіда.
 */
export function withLanes<T extends Span>(items: T[], minMs = 0): { items: (T & { lane: number })[]; lanes: number } {
  const ends: number[] = [];
  const out = [...items]
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .map((it) => {
      const end = Math.max(it.end, it.start + minMs);
      let lane = ends.findIndex((e) => e <= it.start);
      if (lane < 0) lane = ends.push(end) - 1;
      else ends[lane] = end;
      return { ...it, lane };
    });
  return { items: out, lanes: ends.length };
}

/** Робоча доба 08–19; ширше — лише якщо в ці дні є захід раніше чи пізніше (завдання тягнуться днями й межі не рухають) */
export const WORK_HOURS: [number, number] = [8, 19];

export function hourRange(days: string[], events: Span[]): [number, number] {
  let [from, to] = WORK_HOURS;
  for (const day of days) {
    const dayStart = atHour(day, 0).getTime();
    const dayEnd = atHour(day, 24).getTime();
    for (const e of events) {
      if (e.end <= dayStart || e.start >= dayEnd) continue;
      from = Math.min(from, e.start <= dayStart ? 0 : kyivParts(new Date(e.start)).h);
      const end = kyivParts(new Date(e.end));
      to = Math.max(to, e.end >= dayEnd ? 24 : end.min > 0 ? end.h + 1 : end.h);
    }
  }
  return [from, to];
}

/** Видиме вікно дня (межі можуть бути й дробові: 15,5 — це 15:30) і мітки цілих годин усередині */
export function dayWindow(day: string, [from, to]: [number, number]): { win: Span; ticks: { hour: number; at: number }[] } {
  const at = (h: number) => atHour(day, Math.floor(h)).getTime() + (h - Math.floor(h)) * 3600_000;
  const ticks = [];
  for (let h = Math.ceil(from); h <= to; h++) ticks.push({ hour: h, at: atHour(day, h).getTime() });
  return { win: { start: at(from), end: at(to) }, ticks };
}

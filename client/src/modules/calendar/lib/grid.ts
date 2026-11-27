import type { Person, Unit } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { kyivParts } from '@/shared/lib/time';
import type { CalendarData } from '../api/calendar.api';
import { dayWindow, hourRange } from './layout';
import type { CalendarParams } from './params';
import { period, todayKey, weekday } from './range';
import { dayGroups, weekRows, type RowContent } from './rows';

/** Рядок сітки: заголовок підрозділу, людина («День») або день («Тиждень») */
export type GridRow =
  | { kind: 'group'; key: string; title: string; count: number }
  | { kind: 'person'; key: string; group: string; person: Person; content: RowContent; nowPos: number | null }
  | { kind: 'day'; key: string; day: string; today: boolean; weekend: boolean; content: RowContent; nowPos: number | null };

export interface GridModel {
  /** видиме вікно, години (15,5 — це 15:30) */
  view: [number, number];
  /** мітки цілих годин і їхнє місце у відсотках ширини доріжки */
  ticks: { hour: number; pos: number }[];
  /** лінія «зараз», % ширини доріжки; null — сьогодні не в цьому періоді чи поза вікном */
  nowPos: number | null;
  rows: GridRow[];
}

/** Межі годин періоду (робоча доба, розширена заходами) і чи є сьогодні в періоді — до вибору видимого вікна */
export function gridHours(p: CalendarParams, data: CalendarData, now: Date) {
  const { days } = period(p.mode, p.day);
  const spans = data.items.flatMap((i) => (i.kind === 'event' ? [{ start: Date.parse(i.startsAt), end: Date.parse(i.endsAt) }] : []));
  const k = kyivParts(now);
  return { range: hourRange(days, spans), nowHour: days.includes(todayKey(now)) ? k.h + k.min / 60 : null };
}

export function gridModel(p: CalendarParams, data: CalendarData, units: Unit[], now: Date, view: [number, number]): GridModel {
  const { days } = period(p.mode, p.day);
  const today = todayKey(now);
  const { win, ticks } = dayWindow(days.includes(today) ? today : days[0], view);
  const pct = (at: number) => ((at - win.start) / (win.end - win.start)) * 100;
  const inWindow = days.includes(today) && now.getTime() >= win.start && now.getTime() <= win.end;
  const nowPos = inWindow ? pct(now.getTime()) : null;
  const base = { view, ticks: ticks.map((x) => ({ hour: x.hour, pos: pct(x.at) })), nowPos };

  if (p.mode === 'week') {
    const rows = weekRows(data.items, days.map((day) => ({ day, win: dayWindow(day, view).win })), now);
    return {
      ...base,
      rows: rows.map((r) => ({ kind: 'day', key: r.day, day: r.day, today: r.day === today, weekend: weekday(r.day) >= 5, content: r, nowPos: r.day === today ? nowPos : null })),
    };
  }

  const names = new Map(units.map((u) => [u.id, u.name]));
  return {
    ...base,
    rows: dayGroups(data.people, data.items, units, win, now).flatMap((g) => {
      const key = `g-${g.unitId ?? 'none'}`;
      const head: GridRow = { kind: 'group', key, title: g.unitId ? names.get(g.unitId) ?? '' : t('calendar.grid.no_unit'), count: g.rows.length };
      return [head, ...g.rows.map((r): GridRow => ({ kind: 'person', key: r.person.id, group: key, person: r.person, content: r, nowPos }))];
    }),
  };
}

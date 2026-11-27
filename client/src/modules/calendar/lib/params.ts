import type { Me } from '@/shared/api/types';
import type { RangeQuery } from '../api/calendar.api';
import { isDayKey, period, todayKey, type Mode } from './range';

/** Кого показати (ADR-0017): фільтр лише звужує — сервер однаково накладає видимість глядача */
export type Filter = { kind: 'me' } | { kind: 'unit'; unitId: string; sub: boolean } | { kind: 'person'; personId: string };

export interface CalendarParams {
  mode: Mode;
  day: string;
  filter: Filter;
}

/** Керівник одразу бачить свій підрозділ із підпорядкованими; виконавець — себе */
export const defaultFilter = (me: Me): Filter =>
  me.role !== 'MEMBER' && me.unitId ? { kind: 'unit', unitId: me.unitId, sub: true } : { kind: 'me' };

/** Стан календаря живе в адресі: ним можна поділитися, і він переживає оновлення сторінки */
export function readParams(sp: URLSearchParams, me: Me, now = new Date()): CalendarParams {
  const mode: Mode = sp.get('mode') === 'week' ? 'week' : 'day';
  const date = sp.get('date');
  const day = isDayKey(date) ? date : todayKey(now);
  const unit = sp.get('unit');
  const person = sp.get('person');
  let filter: Filter = person ? { kind: 'person', personId: person }
    : unit ? { kind: 'unit', unitId: unit, sub: sp.get('sub') !== '0' }
    : sp.get('who') === 'me' ? { kind: 'me' }
    : defaultFilter(me);
  // «Тиждень» — рядки дні однієї людини: підрозділ тут не має сенсу
  if (mode === 'week' && filter.kind === 'unit') filter = { kind: 'me' };
  return { mode, day, filter };
}

export function writeParams(p: CalendarParams, now = new Date()): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.mode === 'week') sp.set('mode', 'week');
  if (p.day !== todayKey(now)) sp.set('date', p.day);
  if (p.filter.kind === 'me') sp.set('who', 'me');
  if (p.filter.kind === 'unit') {
    sp.set('unit', p.filter.unitId);
    if (!p.filter.sub) sp.set('sub', '0');
  }
  if (p.filter.kind === 'person') sp.set('person', p.filter.personId);
  return sp;
}

export function rangeQuery(p: CalendarParams): RangeQuery {
  const { from, to } = period(p.mode, p.day);
  const q: RangeQuery = { from: from.toISOString(), to: to.toISOString() };
  if (p.filter.kind === 'unit') return { ...q, unit: p.filter.unitId, sub: p.filter.sub ? '1' : '0' };
  if (p.filter.kind === 'person') return { ...q, person: p.filter.personId };
  return q;
}

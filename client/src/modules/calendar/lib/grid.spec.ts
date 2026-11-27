import { describe, expect, it } from 'vitest';
import type { Person, Unit } from '@/shared/api/types';
import type { CalendarData } from '../api/calendar.api';
import { gridHours, gridModel } from './grid';

// четвер, 2026-11-26 11:20 за Києвом
const NOW = new Date('2026-11-26T09:20:00Z');
const units = [{ id: 'u1', name: 'Відділ аналітики', parentId: null }] as Unit[];
const people = [{ id: 'p1', fullName: 'Бондар Андрій', role: 'MEMBER', unitId: 'u1' }] as Person[];
const data = (items: CalendarData['items'] = []): CalendarData => ({ from: '', to: '', people, items });
const day = (d: string) => ({ mode: 'day' as const, day: d, filter: { kind: 'me' as const } });
const week = { mode: 'week' as const, day: '2026-11-26', filter: { kind: 'me' as const } };

describe('модель сітки', () => {
  it('«День» сьогодні: заголовок підрозділу, рядок людини, лінія «зараз» на 3 год 20 хв з 11 год', () => {
    const m = gridModel(day('2026-11-26'), data(), units, NOW, [8, 19]);
    expect(m.rows.map((r) => r.kind)).toEqual(['group', 'person']);
    expect(m.rows[0]).toMatchObject({ title: 'Відділ аналітики', count: 1 });
    expect(m.ticks.map((x) => x.hour)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(m.nowPos).toBeCloseTo((200 / 660) * 100);
  });
  it('вікно 10:00–13:30 на телефоні: мітки цілих годин на своїх місцях, «зараз» усередині', () => {
    const m = gridModel(day('2026-11-26'), data(), units, NOW, [10, 13.5]);
    expect(m.ticks.map((x) => [x.hour, Math.round(x.pos)])).toEqual([[10, 0], [11, 29], [12, 57], [13, 86]]);
    expect(m.nowPos).toBeCloseTo((80 / 210) * 100);
  });
  it('інший день — без лінії «зараз»', () => {
    expect(gridModel(day('2026-11-27'), data(), units, NOW, [8, 19]).nowPos).toBeNull();
    expect(gridHours(day('2026-11-27'), data(), NOW).nowHour).toBeNull();
  });
  it('«Тиждень»: сім днів, лінія лише в сьогоднішньому, субота й неділя — вихідні', () => {
    const days = gridModel(week, data(), units, NOW, [8, 19]).rows.filter((r) => r.kind === 'day');
    expect(days.map((r) => r.nowPos !== null)).toEqual([false, false, false, true, false, false, false]);
    expect(days.map((r) => r.weekend)).toEqual([false, false, false, false, false, true, true]);
  });
  it('захід о 07:00 розширює години для всього тижня', () => {
    const early = { kind: 'event' as const, id: 'e', title: 'Збір', status: 'PLANNED' as const, startsAt: '2026-11-24T05:00:00Z', endsAt: '2026-11-24T05:30:00Z', personIds: ['p1'] };
    expect(gridHours(week, data([early]), NOW)).toEqual({ range: [7, 19], nowHour: 11 + 20 / 60 });
  });
});

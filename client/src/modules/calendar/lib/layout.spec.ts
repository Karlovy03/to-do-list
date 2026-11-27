import { describe, expect, it } from 'vitest';
import { dayWindow, hourRange, place, withLanes } from './layout';

const H = 3600_000;
const win = { start: 0, end: 10 * H };

describe('положення на доріжці', () => {
  it('у відсотках вікна', () => {
    expect(place({ start: 1 * H, end: 3 * H }, win)).toEqual({ left: 10, width: 20, cutStart: false, cutEnd: false });
  });
  it('обрізається по краях і позначає, що триває далі', () => {
    expect(place({ start: -5 * H, end: 2 * H }, win)).toEqual({ left: 0, width: 20, cutStart: true, cutEnd: false });
    expect(place({ start: 9 * H, end: 30 * H }, win)).toEqual({ left: 90, width: 10, cutStart: false, cutEnd: true });
  });
  it('поза вікном — не показується (дотик краю — теж)', () => {
    expect(place({ start: 10 * H, end: 11 * H }, win)).toBeNull();
    expect(place({ start: -2 * H, end: 0 }, win)).toBeNull();
  });
});

describe('доріжки накладань', () => {
  it('накладені — у різні доріжки, наступний після кінця — знову в першу', () => {
    const { items, lanes } = withLanes([
      { id: 'a', start: 0, end: 2 * H },
      { id: 'b', start: 1 * H, end: 3 * H },
      { id: 'c', start: 2 * H, end: 4 * H },
    ]);
    expect(items.map((x) => [x.id, x.lane])).toEqual([['a', 0], ['b', 1], ['c', 0]]);
    expect(lanes).toBe(2);
  });
  it('короткий захід займає щонайменше minMs: сусід через 15 хв іде в іншу доріжку', () => {
    const q = 15 * 60_000;
    const { lanes } = withLanes([{ start: 0, end: q }, { start: q, end: 2 * q }], 40 * 60_000);
    expect(lanes).toBe(2);
  });
});

describe('межі годин', () => {
  it('типово 08–19', () => {
    expect(hourRange(['2026-11-26'], [])).toEqual([8, 19]);
  });
  it('розширюється заходом о 07:30 і до 20:15 за Києвом', () => {
    const early = { start: Date.parse('2026-11-26T05:30:00Z'), end: Date.parse('2026-11-26T06:00:00Z') };
    const late = { start: Date.parse('2026-11-26T17:30:00Z'), end: Date.parse('2026-11-26T18:15:00Z') };
    expect(hourRange(['2026-11-26'], [early, late])).toEqual([7, 21]);
  });
  it('захід іншого дня межі не рухає', () => {
    const other = { start: Date.parse('2026-11-27T04:00:00Z'), end: Date.parse('2026-11-27T05:00:00Z') };
    expect(hourRange(['2026-11-26'], [other])).toEqual([8, 19]);
  });
  it('мітки годин — київські', () => {
    const { win: w, ticks } = dayWindow('2026-11-26', [8, 19]);
    expect(new Date(w.start).toISOString()).toBe('2026-11-26T06:00:00.000Z');
    expect(ticks).toHaveLength(12);
  });
});

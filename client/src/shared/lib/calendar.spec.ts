import { describe, expect, it } from 'vitest';
import { addMonths, compareDays, monthGrid, weekdayNames } from './calendar';

describe('календар', () => {
  it('листопад 2026 починається з неділі — сітка з понеділка 26 жовтня', () => {
    const g = monthGrid(2026, 11);
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ y: 2026, m: 10, d: 26, inMonth: false });
    expect(g[6]).toEqual({ y: 2026, m: 11, d: 1, inMonth: true });
    expect(g.filter((d) => d.inMonth)).toHaveLength(30);
  });
  it('перехід через рік', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ y: 2025, m: 12 });
  });
  it('порівнює дні і називає дні тижня з понеділка', () => {
    expect(compareDays({ y: 2026, m: 11, d: 25 }, { y: 2026, m: 11, d: 26 })).toBeLessThan(0);
    expect(weekdayNames()).toHaveLength(7);
    expect(weekdayNames()[0]).not.toBe(weekdayNames()[6]);
  });
});

import { describe, expect, it } from 'vitest';
import { fromKyiv, kyivAt, kyivParts } from './time';

describe('kyivAt', () => {
  it('рахує годину за Києвом взимку (UTC+2)', () => {
    expect(kyivAt(0, 18, new Date('2026-11-25T08:00:00Z')).toISOString()).toBe('2026-11-25T16:00:00.000Z');
  });
  it('рахує годину за Києвом влітку (UTC+3) і переходить на наступний день', () => {
    expect(kyivAt(1, 10, new Date('2026-07-01T22:30:00Z')).toISOString()).toBe('2026-07-03T07:00:00.000Z');
  });
});

describe('fromKyiv / kyivParts', () => {
  it('перетворюють туди й назад, зокрема в день переходу на літній час', () => {
    for (const [y, m, d, h] of [[2026, 11, 25, 18], [2027, 3, 28, 4], [2027, 10, 31, 3]]) {
      const p = kyivParts(fromKyiv(y, m, d, h, 30));
      expect([p.y, p.m, p.d, p.h, p.min]).toEqual([y, m, d, h, 30]);
    }
  });
});

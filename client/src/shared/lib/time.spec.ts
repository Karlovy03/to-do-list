import { describe, expect, it } from 'vitest';
import { formatAsOf, formatStamp, fromKyiv, kyivAt, kyivParts } from './time';

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

describe('довідка: дати', () => {
  const NOW = new Date('2026-11-27T06:00:00Z');
  it('термін цього року — без року; наступного — з роком; за Києвом, а не UTC', () => {
    expect(formatStamp('2026-11-25T16:00:00Z', NOW)).toBe('25.11, 18:00');
    expect(formatStamp('2027-01-05T08:00:00Z', NOW)).toBe('05.01.2027, 10:00');
    expect(formatStamp('2026-12-31T22:30:00Z', NOW)).toBe('01.01.2027, 00:30');
  });
  it('«станом на» — на екрані без року, на папері з роком', () => {
    expect(formatAsOf(NOW)).toBe('27 листопада, 08:00');
    expect(formatAsOf(NOW, true)).toBe('27 листопада 2026, 08:00');
  });
});

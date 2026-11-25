import { describe, expect, it } from 'vitest';
import { humanDuration, inQuietHours, kyivParts, pluralForm } from './time';

const H = 3600_000;

describe('українська множина', () => {
  it.each([
    [1, 'one'], [21, 'one'], [101, 'one'],
    [2, 'few'], [4, 'few'], [22, 'few'], [34, 'few'],
    [5, 'many'], [11, 'many'], [12, 'many'], [14, 'many'], [20, 'many'], [25, 'many'],
  ])('%i → %s', (n, form) => expect(pluralForm(n)).toBe(form));
});

describe('тривалість «залишилось»', () => {
  it('показує фактичний залишок, а не поріг', () => {
    expect(humanDuration(14 * H)).toBe('14 годин');
    expect(humanDuration(1 * H + 5 * 60_000)).toBe('1 годину');
    expect(humanDuration(45 * 60_000)).toBe('45 хв');
    expect(humanDuration(3 * 24 * H)).toBe('3 дні');
    expect(humanDuration(21 * 24 * H)).toBe('21 день');
    expect(humanDuration(30 * H)).toBe('30 годин');
  });
});

describe('київський час', () => {
  it('враховує зимовий час (UTC+2) і вихідні', () => {
    expect(kyivParts(new Date('2026-11-25T08:00:00Z'))).toEqual({ hour: 10, weekend: false });
    expect(kyivParts(new Date('2026-11-28T08:00:00Z')).weekend).toBe(true);
  });
  it('тихі години з переходом через північ', () => {
    expect(inQuietHours(22, 20, 8)).toBe(true);
    expect(inQuietHours(7, 20, 8)).toBe(true);
    expect(inQuietHours(8, 20, 8)).toBe(false);
    expect(inQuietHours(12, 13, 14)).toBe(false);
    expect(inQuietHours(10, 10, 10)).toBe(false);
  });
});

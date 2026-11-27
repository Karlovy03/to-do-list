import { describe, expect, it } from 'vitest';
import { addDays, dayRange, dayText, dayTitle, daysBetween, todayKey } from './days';

const NOW = new Date('2026-11-26T21:30:00Z'); // 23:30 за Києвом, четвер 26-го

describe('київські дні', () => {
  it('сьогодні — київська дата', () => {
    expect(todayKey(NOW)).toBe('2026-11-26');
    expect(todayKey(new Date('2026-11-26T22:30:00Z'))).toBe('2026-11-27');
  });
  it('арифметика через межу місяця', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(daysBetween('2026-11-26', '2026-11-28')).toBe(2);
  });
});

describe('підписи днів', () => {
  it('день: сьогодні/завтра словом', () => {
    expect(dayTitle('2026-11-26', NOW)).toBe('Сьогодні, 26 листопада');
    expect(dayTitle('2026-11-27', NOW)).toBe('Завтра, 27 листопада');
  });
  it('довго й коротко', () => {
    expect(dayText('2026-11-28')).toBe('28 листопада');
    expect(dayText('2026-12-01', true)).toBe('1.12');
  });
  it('діапазон: у межах місяця, через межу, коротко, один день', () => {
    expect(dayRange('2026-12-01', '2026-12-14')).toBe('1–14 грудня');
    expect(dayRange('2026-11-30', '2026-12-03')).toBe('30 листопада – 3 грудня');
    expect(dayRange('2026-12-01', '2026-12-14', true)).toBe('1–14.12');
    expect(dayRange('2026-11-30', '2026-12-03', true)).toBe('30.11–3.12');
    expect(dayRange('2026-12-02', '2026-12-02')).toBe('2 грудня');
  });
});

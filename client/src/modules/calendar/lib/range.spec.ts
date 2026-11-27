import { describe, expect, it } from 'vitest';
import { addDays, atHour, dayLabel, period, periodTitle, todayKey, weekday } from './range';

// четвер, 2026-11-26 23:30 за Києвом — в UTC це ще 21:30 того ж дня; о 00:30 Києва в UTC — ще «вчора»
const NOW = new Date('2026-11-26T21:30:00Z');

describe('дні за Києвом', () => {
  it('сьогодні — київська дата, а не UTC', () => {
    expect(todayKey(new Date('2026-11-26T22:30:00Z'))).toBe('2026-11-27');
    expect(todayKey(NOW)).toBe('2026-11-26');
  });
  it('арифметика днів через межу місяця й року', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(weekday('2026-11-26')).toBe(3); // четвер
    expect(weekday('2026-11-29')).toBe(6); // неділя
  });
});

describe('межі періоду', () => {
  it('день — від київської півночі до наступної', () => {
    const p = period('day', '2026-11-26');
    expect([p.from.toISOString(), p.to.toISOString()]).toEqual(['2026-11-25T22:00:00.000Z', '2026-11-26T22:00:00.000Z']);
  });
  it('тиждень — з понеділка, сім днів', () => {
    const p = period('week', '2026-11-26');
    expect(p.days).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
    expect(p.from.toISOString()).toBe('2026-11-22T22:00:00.000Z');
  });
  it('тиждень із переходом на літній час коротший на годину, а 08:00 лишається 08:00', () => {
    const p = period('week', '2027-03-28');
    expect((p.to.getTime() - p.from.getTime()) / 3600_000).toBe(167);
    expect(atHour('2027-03-28', 8).toISOString()).toBe('2027-03-28T05:00:00.000Z');
    expect(atHour('2027-03-27', 8).toISOString()).toBe('2027-03-27T06:00:00.000Z');
  });
});

describe('підписи', () => {
  it('день: сьогодні/завтра — словом, далі — з днем тижня', () => {
    expect(periodTitle('day', '2026-11-26', NOW)).toBe('Сьогодні, 26 листопада');
    expect(periodTitle('day', '2026-11-27', NOW)).toBe('Завтра, 27 листопада');
    expect(periodTitle('day', '2026-12-04', NOW)).toBe('Пʼятниця, 4 грудня'); // апостроф — U+02BC, як дає Intl
  });
  it('тиждень: в одному місяці й через межу місяців', () => {
    expect(periodTitle('week', '2026-11-26', NOW)).toBe('23–29 листопада');
    expect(periodTitle('week', '2026-12-01', NOW)).toBe('30 листопада – 6 грудня');
  });
  it('рядок тижня', () => {
    expect(dayLabel('2026-11-23')).toBe('Пн 23');
  });
});

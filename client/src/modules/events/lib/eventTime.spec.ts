import { describe, expect, it } from 'vitest';
import type { AppEvent, Me } from '@/shared/api/types';
import { durationLabel, eventChip, eventWhen, phaseOf, remindsMe } from './eventTime';

// четвер, 2026-11-26 11:40 за Києвом
const NOW = new Date('2026-11-26T09:40:00Z');
const ev = (startsAt: string, min: number, over: Partial<AppEvent> = {}): AppEvent =>
  ({ startsAt, endsAt: new Date(Date.parse(startsAt) + min * 60_000).toISOString(), status: 'PLANNED', mine: true, ...over }) as AppEvent;

describe('стан заходу — з часу', () => {
  it('найближчий, триває, минув, скасований', () => {
    expect(phaseOf(ev('2026-11-26T15:30:00Z', 30), NOW)).toBe('upcoming');
    expect(phaseOf(ev('2026-11-26T09:00:00Z', 60), NOW)).toBe('live');
    expect(phaseOf(ev('2026-11-26T07:00:00Z', 15), NOW)).toBe('past');
    expect(phaseOf(ev('2026-11-26T15:30:00Z', 30, { status: 'CANCELLED' }), NOW)).toBe('cancelled');
  });
});

describe('тривалість', () => {
  it('хвилини, цілі години, півгодини комою, решта — години й хвилини', () => {
    expect([15, 60, 90, 80, 720].map(durationLabel)).toEqual(['15 хв', '1 год', '1,5 год', '1 год 20 хв', '12 год']);
  });
});

describe('часовий чип', () => {
  it('сьогодні — «через …», у картці точніше', () => {
    const e = ev('2026-11-26T15:50:00Z', 30); // 17:50, через 6 год 10 хв
    expect(eventChip(e, NOW)).toEqual({ tone: 'soon', time: 'через 6 год' });
    expect(eventChip(e, NOW, true).time).toBe('через 6 год 10 хв');
  });
  it('триває — темно-синій із залишком', () => {
    expect(eventChip(ev('2026-11-26T09:00:00Z', 60), NOW)).toEqual({ tone: 'live', time: 'Триває', rest: '· ще 20 хв' });
  });
  it('завтра — блакитний, далі — спокійний з датою', () => {
    expect(eventChip(ev('2026-11-27T08:00:00Z', 90), NOW)).toEqual({ tone: 'soon', time: 'завтра' });
    expect(eventChip(ev('2026-12-03T08:00:00Z', 90), NOW)).toEqual({ tone: 'calm', time: '3 грудня' });
  });
  it('минулий і скасований — сірі; день показується, якщо не сьогодні', () => {
    expect(eventChip(ev('2026-11-26T07:00:00Z', 15), NOW)).toEqual({ tone: 'calm', time: 'Минув', rest: undefined });
    expect(eventChip(ev('2026-11-25T07:00:00Z', 15), NOW).rest).toBe('вчора');
    expect(eventChip(ev('2026-11-26T15:30:00Z', 30, { status: 'CANCELLED' }), NOW).time).toBe('Скасовано');
  });
});

describe('коли й нагадування', () => {
  it('«Сьогодні, 17:30–18:00» за київським часом', () => {
    expect(eventWhen(ev('2026-11-26T15:30:00Z', 30), NOW)).toBe('Сьогодні, 17:30–18:00');
  });
  it('нагадаємо лише учаснику, до початку і якщо сповіщення про заходи ввімкнені', () => {
    const me = { prefs: { notifyEvents: true } } as Me;
    const off = { prefs: { notifyEvents: false } } as Me;
    const soon = ev('2026-11-26T15:30:00Z', 30);
    expect(remindsMe(soon, me, NOW)).toBe(true);
    expect(remindsMe(soon, off, NOW)).toBe(false);
    expect(remindsMe({ ...soon, mine: false }, me, NOW)).toBe(false);
    expect(remindsMe(ev('2026-11-26T09:00:00Z', 60), me, NOW)).toBe(false);
  });
});

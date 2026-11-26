import { describe, expect, it } from 'vitest';
import type { AppEvent } from '@/shared/api/types';
import { groupEvents, groupOf } from './grouping';

// четвер, 2026-11-26 11:40 за Києвом (UTC+2)
const NOW = new Date('2026-11-26T09:40:00Z');
const at = (startsAt: string, min = 30): AppEvent =>
  ({ id: startsAt, startsAt, endsAt: new Date(Date.parse(startsAt) + min * 60_000).toISOString(), status: 'PLANNED' }) as AppEvent;

describe('групи заходів за київським днем', () => {
  it('сьогодні, зокрема той, що вже триває, і пізно ввечері за Києвом', () => {
    expect(groupOf(at('2026-11-26T09:00:00Z', 60), NOW)).toBe('today'); // триває
    expect(groupOf(at('2026-11-26T21:30:00Z'), NOW)).toBe('today'); // 23:30 Київ
  });
  it('завтра починається з київської півночі, а не з UTC', () => {
    expect(groupOf(at('2026-11-26T22:30:00Z'), NOW)).toBe('tomorrow'); // 00:30 п'ятниці
  });
  it('цього тижня — до неділі включно, далі — пізніше', () => {
    expect(groupOf(at('2026-11-29T10:00:00Z'), NOW)).toBe('week'); // неділя
    expect(groupOf(at('2026-11-30T08:00:00Z'), NOW)).toBe('later'); // понеділок
  });
  it('у неділю «цього тижня» немає: наступний день — уже завтра, після нього — пізніше', () => {
    const sunday = new Date('2026-11-29T09:00:00Z');
    expect(groupOf(at('2026-11-30T08:00:00Z'), sunday)).toBe('tomorrow');
    expect(groupOf(at('2026-12-01T08:00:00Z'), sunday)).toBe('later');
  });
  it('той, що скінчився, — серед минулих', () => {
    expect(groupOf(at('2026-11-26T07:00:00Z', 15), NOW)).toBe('past');
  });

  it('найближчі за початком, минулі — найсвіжіші першими; порожні групи не показуються', () => {
    const groups = groupEvents(
      [at('2026-11-26T15:30:00Z'), at('2026-11-26T10:00:00Z'), at('2026-11-25T07:00:00Z'), at('2026-11-26T07:00:00Z')],
      NOW,
    );
    expect(groups.map((g) => [g.id, g.events.map((e) => e.startsAt.slice(5, 16))])).toEqual([
      ['today', ['11-26T10:00', '11-26T15:30']],
      ['past', ['11-26T07:00', '11-25T07:00']],
    ]);
  });
});

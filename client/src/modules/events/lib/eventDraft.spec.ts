import { describe, expect, it } from 'vitest';
import { parseEventDraft } from './eventDraft';

const NOW = new Date('2026-11-27T08:00:00Z');

describe('чернетка нового заходу', () => {
  it('відновлює назву, опис, учасників, тривалість і початок, що ще не минув', () => {
    expect(parseEventDraft({ title: 'Нарада', description: '', participants: ['a'], duration: 60, startsAt: '2026-11-27T10:00:00Z' }, NOW))
      .toEqual({ title: 'Нарада', description: '', participants: ['a'], duration: 60, startsAt: '2026-11-27T10:00:00Z' });
  });
  it('минулий початок і зіпсована тривалість — відкидаються', () => {
    expect(parseEventDraft({ title: 'Нарада', duration: -5, startsAt: '2026-11-27T07:00:00Z' }, NOW)).toMatchObject({ duration: 30, startsAt: null });
    expect(parseEventDraft(null, NOW)).toBeNull();
  });
});

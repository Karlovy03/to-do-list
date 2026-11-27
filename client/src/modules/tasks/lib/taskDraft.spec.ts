import { describe, expect, it } from 'vitest';
import { parseTaskDraft } from './taskDraft';

const NOW = new Date('2026-11-27T08:00:00Z');

describe('чернетка нового завдання', () => {
  it('відновлює назву, опис, виконавців, пріоритет і власний термін, що ще не минув', () => {
    const raw = { title: 'Довідка', description: 'деталі', assignees: ['a', 7, 'b'], priority: 'URGENT', control: null, deadline: '2026-11-28T08:00:00Z' };
    expect(parseTaskDraft(raw, NOW)).toEqual({ title: 'Довідка', description: 'деталі', assignees: ['a', 'b'], priority: 'URGENT', control: null, deadline: '2026-11-28T08:00:00Z' });
  });
  it('термін, що вже минув, і невідомий пріоритет — відкидаються; без назви — не чернетка', () => {
    expect(parseTaskDraft({ title: 'x', priority: 'MEGA', deadline: '2026-11-26T08:00:00Z' }, NOW)).toMatchObject({ priority: 'NORMAL', deadline: null });
    expect(parseTaskDraft({ description: 'x' }, NOW)).toBeNull();
    expect(parseTaskDraft('рядок', NOW)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import type { Task } from '@/shared/api/types';
import { groupOf, groupTasks } from './grouping';

// 2026-11-25 10:00 за Києвом
const NOW = new Date('2026-11-25T08:00:00Z');
const task = (id: string, over: Partial<Task> = {}): Task =>
  ({ id, status: 'IN_PROGRESS', deadline: '2026-11-26T08:00:00Z', control: null, completedAt: null, ...over }) as Task;

describe('групування за терміновістю', () => {
  it('прострочене, сьогоднішнє (київський день), найближче, завершене', () => {
    expect(groupOf(task('a', { deadline: '2026-11-25T07:00:00Z' }), NOW)).toBe('late');
    expect(groupOf(task('b', { deadline: '2026-11-25T21:30:00Z' }), NOW)).toBe('today'); // 23:30 Київ
    expect(groupOf(task('c', { deadline: '2026-11-25T22:30:00Z' }), NOW)).toBe('upcoming'); // 00:30 наступного дня
    expect(groupOf(task('d', { status: 'DONE' }), NOW)).toBe('done');
  });

  it('контрольні вгорі групи, далі за терміном; порожні групи не показуються', () => {
    const groups = groupTasks(
      [
        task('later', { deadline: '2026-11-25T16:00:00Z' }),
        task('sooner', { deadline: '2026-11-25T10:00:00Z' }),
        task('ctrl', { deadline: '2026-11-25T17:00:00Z', control: {} as Task['control'] }),
      ],
      NOW,
    );
    expect(groups.map((g) => g.id)).toEqual(['today']);
    expect(groups[0].tasks.map((x) => x.id)).toEqual(['ctrl', 'sooner', 'later']);
  });
});

import { describe, expect, it } from 'vitest';
import type { Task } from '@/shared/api/types';
import { sortReport, stateText, totals } from './report';

const task = (id: string, deadline: string, overdue: boolean, over: Partial<Task> = {}) => ({ id, deadline, overdue, status: 'IN_PROGRESS', progress: 40, ...over }) as Task;

describe('довідка', () => {
  const list = [task('b', '2026-11-28T16:00:00Z', false), task('late2', '2026-11-26T16:00:00Z', true), task('a', '2026-11-25T16:00:00Z', false), task('late1', '2026-11-24T16:00:00Z', true)];
  it('прострочені першими, далі за терміном', () => {
    expect(sortReport(list).map((x) => x.id)).toEqual(['late1', 'late2', 'a', 'b']);
  });
  it('стан: прострочене — «Прострочено», інакше стан і хід', () => {
    expect([stateText(list[1]), stateText(list[0])]).toEqual(['Прострочено', 'У роботі, 40%']);
  });
  it('підсумок', () => {
    expect(totals(list)).toEqual({ total: 4, overdue: 2, in_time: 2 });
  });
});

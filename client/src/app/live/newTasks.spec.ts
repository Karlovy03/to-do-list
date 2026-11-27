import { describe, expect, it } from 'vitest';
import type { AppNotification } from '@/shared/api/types';
import { freshAssignments } from './newTasks';

const n = (id: string, over: Partial<AppNotification> = {}) =>
  ({ id, taskId: `t-${id}`, eventId: null, kind: 'ASSIGNED', title: '', body: '', readAt: null, createdAt: '2026-11-27T10:00:00Z', ...over }) as AppNotification;

describe('нове доручене завдання — коли повідомляти', () => {
  it('перше завантаження стрічки — нічого: це не нове, а вже наявне', () => {
    expect(freshAssignments(null, [n('1'), n('2')]).fresh).toEqual([]);
  });
  it('новий непрочитаний запис «доручено» — так; інший вид, прочитаний чи без завдання — ні', () => {
    const { seen } = freshAssignments(null, [n('1')]);
    const items = [n('5'), n('4', { kind: 'DONE' }), n('3', { readAt: '2026-11-27T10:01:00Z' }), n('2', { taskId: null }), n('1')];
    expect(freshAssignments(seen, items).fresh.map((x) => x.id)).toEqual(['5']);
  });
  it('раз повідомлене повторно не повідомляється', () => {
    const first = freshAssignments(freshAssignments(null, []).seen, [n('7')]);
    expect(first.fresh.map((x) => x.id)).toEqual(['7']);
    expect(freshAssignments(first.seen, [n('7')]).fresh).toEqual([]);
  });
});

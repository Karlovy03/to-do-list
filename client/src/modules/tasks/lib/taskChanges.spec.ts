import { describe, expect, it } from 'vitest';
import { taskChanges } from './taskChanges';

const task = {
  title: 'Довідка',
  description: '',
  priority: 'NORMAL' as const,
  deadline: '2026-11-20T08:00:00.000Z',
  assignees: [{ id: 'a' }, { id: 'b' }],
} as Parameters<typeof taskChanges>[0];
const same = { title: 'Довідка', description: '', priority: 'NORMAL' as const, deadline: new Date('2026-11-20T08:00:00.000Z'), assigneeIds: ['b', 'a'] };

describe('зміни завдання', () => {
  it('нічого не змінено — порожньо (порядок виконавців не важить)', () => {
    expect(taskChanges(task, same)).toEqual({});
  });
  it('минулий термін, якого не чіпали, не надсилається — правка назви проходить', () => {
    expect(taskChanges(task, { ...same, title: ' Довідка до наради ' })).toEqual({ title: 'Довідка до наради' });
  });
  it('змінені термін і виконавці потрапляють у запит', () => {
    const c = taskChanges(task, { ...same, deadline: new Date('2026-12-01T08:00:00.000Z'), assigneeIds: ['a'] });
    expect(c).toEqual({ deadline: '2026-12-01T08:00:00.000Z', assigneeIds: ['a'] });
  });
});

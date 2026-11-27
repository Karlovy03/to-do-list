import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import type { PolicyTask } from './task.policy';

// ADR-0012: відділи A і B — у вертикалі управління dept; керівник B відділу A не бачить
vi.mock('../units', () => ({
  unitTree: async () => [{ id: 'dept', parentId: null }, { id: 'a', parentId: 'dept' }, { id: 'b', parentId: 'dept' }],
  subtreeIds: (id: string) => new Set(id === 'dept' ? ['dept', 'a', 'b'] : [id]),
}));

const { liveHub } = await import('../live');
const { announceTask } = await import('./task-live');

const people: Record<string, Partial<User>> = {
  chief: { role: 'MANAGER', unitId: 'dept' },
  headB: { role: 'MANAGER', unitId: 'b' },
  dir: { role: 'DIRECTOR', unitId: null },
  exec: { role: 'MEMBER', unitId: 'a' },
  exec3: { role: 'MEMBER', unitId: 'b' },
  stranger: { role: 'MEMBER', unitId: 'a' },
};
let got: Record<string, number>;
const settle = () => new Promise((r) => setTimeout(r, 0));

const task = (assignee: string, unitId: string): PolicyTask => ({
  status: 'IN_PROGRESS', authorId: 'exec', isControlled: false, controllerUserId: null, author: { unitId: 'a' },
  assignees: [{ userId: assignee, doneAt: null, user: { unitId } }],
});

beforeEach(() => {
  liveHub.closeAll();
  got = {};
  for (const [id, p] of Object.entries(people)) {
    got[id] = 0;
    liveHub.add({ id, ...p } as User, { write: () => (got[id] += 1), end: () => undefined });
  }
});

describe('сигнал «змінилось завдання» — лише тим, хто його бачить (ADR-0021)', () => {
  it('автор, керівник вертикалі й директор — так; керівник сусіднього відділу й сторонній — ні', async () => {
    announceTask('t1', task('exec', 'a'));
    await settle();
    expect(got).toEqual({ chief: 1, headB: 0, dir: 1, exec: 1, exec3: 0, stranger: 0 });
  });

  it('передали іншому виконавцю — сигнал і тому, хто бачив до зміни, і тому, хто бачить після', async () => {
    const before = { ...task('stranger', 'a'), authorId: 'chief', author: { unitId: 'dept' } };
    const after = { ...task('exec3', 'b'), authorId: 'chief', author: { unitId: 'dept' } };
    announceTask('t1', before, after);
    await settle();
    expect([got.stranger, got.exec3, got.headB, got.exec]).toEqual([1, 1, 1, 0]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import type { PolicyEvent } from './events.policy';

vi.mock('../units', () => ({
  unitTree: async () => [{ id: 'dept', parentId: null }, { id: 'a', parentId: 'dept' }, { id: 'b', parentId: 'dept' }],
  subtreeIds: (id: string) => new Set(id === 'dept' ? ['dept', 'a', 'b'] : [id]),
}));

const { liveHub } = await import('../live');
const { announceEvent } = await import('./event-live');

const got: Record<string, number> = {};
const settle = () => new Promise((r) => setTimeout(r, 0));
const event: PolicyEvent = { status: 'PLANNED', endsAt: new Date(Date.now() + 3600_000), organizerId: 'org', organizer: { unitId: 'a' }, participants: [{ userId: 'guest', user: { unitId: 'a' } }] };

beforeEach(() => {
  liveHub.closeAll();
  const people: Record<string, Partial<User>> = { org: { role: 'MEMBER', unitId: 'a' }, guest: { role: 'MEMBER', unitId: 'a' }, outsider: { role: 'MEMBER', unitId: 'a' }, headB: { role: 'MANAGER', unitId: 'b' } };
  for (const [id, p] of Object.entries(people)) {
    got[id] = 0;
    liveHub.add({ id, ...p } as User, { write: () => (got[id] += 1), end: () => undefined });
  }
});

describe('сигнал «змінився захід» — лише тим, хто його бачить', () => {
  it('організатор і учасник — так; чужий учасник і керівник сусіднього відділу — ні', async () => {
    announceEvent('e1', event);
    await settle();
    expect(got).toEqual({ org: 1, guest: 1, outsider: 0, headB: 0 });
  });
});

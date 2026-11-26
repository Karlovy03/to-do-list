import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Viewer } from '../access';

const tasks = vi.hoisted(() => ({ inRange: vi.fn() }));
const events = vi.hoisted(() => ({ inRange: vi.fn() }));
const users = vi.hoisted(() => ({ findActiveByIds: vi.fn(), findActiveByUnits: vi.fn() }));
vi.mock('../tasks', () => ({ taskQueryService: tasks }));
vi.mock('../events', () => ({ eventsQueryService: events }));
vi.mock('../users', () => ({ usersRepository: users, publicUser: (u: { id: string }) => ({ id: u.id }) }));
vi.mock('../units', () => ({ unitTree: async () => [{ id: 'dept', parentId: null }, { id: 'a', parentId: 'dept' }, { id: 'b', parentId: 'dept' }], subtreeIds: (id: string) => new Set(id === 'dept' ? ['dept', 'a', 'b'] : [id]) }));

const { calendarService } = await import('./calendar.service');
const viewer = { id: 'me', role: 'MANAGER', scope: new Set(['a']) } as unknown as Viewer;
const range = { from: new Date('2026-11-25T22:00:00Z'), to: new Date('2026-11-26T22:00:00Z'), sub: '1' as const };
const person = (id: string) => ({ id });

beforeEach(() => {
  vi.clearAllMocks();
  tasks.inRange.mockResolvedValue([{ id: 't1', assignees: [{ userId: 'x' }, { userId: 'y' }] }]);
  events.inRange.mockResolvedValue([{ id: 'e1', participants: [{ userId: 'y' }, { userId: 'z' }] }]);
});

describe('календар', () => {
  it('без фільтра — лише мої рядки', async () => {
    await calendarService.range(viewer, range);
    expect(tasks.inRange.mock.calls[0][3]).toEqual(['me']);
  });

  it('підрозділ із підпорядкованими — люди всієї гілки; дані завжди через видимість глядача', async () => {
    users.findActiveByUnits.mockResolvedValue([person('x'), person('y')]);
    const out = await calendarService.range(viewer, { ...range, unit: 'dept' });
    expect(users.findActiveByUnits).toHaveBeenCalledWith(['dept', 'a', 'b']);
    expect(tasks.inRange.mock.calls[0][0]).toBe(viewer);
    expect(events.inRange.mock.calls[0][0]).toBe(viewer);
    expect(out.items.find((i) => i.id === 't1')?.personIds).toEqual(['x', 'y']);
    // учасник поза вибраними людьми рядка не отримує
    expect(out.items.find((i) => i.id === 'e1')?.personIds).toEqual(['y']);
  });

  it('конкретна людина — лише її смуги й блоки', async () => {
    users.findActiveByIds.mockResolvedValue([person('z')]);
    const out = await calendarService.range(viewer, { ...range, person: 'z' });
    expect(out.items.map((i) => i.id)).toEqual(['e1']);
  });
});

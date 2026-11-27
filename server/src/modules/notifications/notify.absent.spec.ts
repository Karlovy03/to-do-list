import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings/settings.schemas';

const users = vi.hoisted(() => ({ findActiveByIds: vi.fn() }));
const feed = vi.hoisted(() => ({ createMany: vi.fn() }));
const push = vi.hoisted(() => vi.fn());
const absences = vi.hoisted(() => ({ absentOn: vi.fn() }));
vi.mock('../users', () => ({ usersRepository: users }));
vi.mock('../settings', () => ({ getSettings: async () => DEFAULT_SETTINGS }));
vi.mock('./feed.repository', () => ({ feedRepository: feed }));
vi.mock('./push/dispatcher', () => ({ pushToUser: push }));
vi.mock('../absences', () => ({ absencesRepository: absences }));

const { notify } = await import('./notify.service');

// середа 2026-11-25, 10:00 за Києвом — не тихі години
const NOW = new Date('2026-11-25T08:00:00Z');
const person = (id: string) => ({ id, isActive: true, quietFrom: 20, quietTo: 8, muteWeekends: true, notifyAssigned: true, notifyControl: true, notifyDeadline: true, notifyUpdates: true, notifyEvents: true });
const task = { id: 't1', number: 7, title: 'Довідка', priority: 'NORMAL' as const, deadline: new Date('2026-11-27T16:00:00Z') };

beforeEach(() => {
  vi.clearAllMocks();
  users.findActiveByIds.mockResolvedValue([person('here'), person('away')]);
  push.mockResolvedValue(undefined);
});

describe('відсутній не отримує push (ADR-0019)', () => {
  it('стрічка — обом, push — лише тому, хто на службі; у тихі години відсутньому нічого не відкладається', async () => {
    absences.absentOn.mockResolvedValue(new Set(['away']));
    await notify({ event: 'ASSIGNED', task, to: ['here', 'away'] }, NOW);
    const rows = feed.createMany.mock.calls[0][0] as { userId: string; pushDeferred: boolean }[];
    expect(rows.map((r) => r.userId).sort()).toEqual(['away', 'here']);
    expect(rows.every((r) => !r.pushDeferred)).toBe(true);
    expect(push.mock.calls.map((c) => c[0])).toEqual(['here']);
    expect(absences.absentOn).toHaveBeenCalledWith(['here', 'away'], '2026-11-25');
  });
  it('без відсутності push отримують обидва', async () => {
    absences.absentOn.mockResolvedValue(new Set());
    await notify({ event: 'ASSIGNED', task, to: ['here', 'away'] }, NOW);
    expect(push.mock.calls.map((c) => c[0]).sort()).toEqual(['away', 'here']);
  });
});

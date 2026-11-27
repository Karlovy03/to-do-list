import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Viewer } from '../access';

const repo = vi.hoisted(() => ({ findById: vi.fn(), overlapping: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), inRange: vi.fn() }));
const users = vi.hoisted(() => ({ findById: vi.fn() }));
vi.mock('./absences.repository', () => ({ absencesRepository: repo }));
vi.mock('../users', () => ({ usersRepository: users }));

const { absencesService: svc } = await import('./absences.service');

// четвер 2026-11-26, 11:00 за Києвом
const NOW = new Date('2026-11-26T09:00:00Z');
const viewer = (id: string, role: Viewer['role'] = 'MEMBER', scope: Viewer['scope'] = new Set(), unitId: string | null = 'analytics') => ({ id, role, scope, unitId, isActive: true }) as Viewer;
const bondar = viewer('bondar');
const lead = viewer('melnyk', 'MANAGER', new Set(['analytics']));
const absence = (over: Record<string, unknown> = {}) => ({
  id: 'a1', userId: 'bondar', kind: 'SICK_LEAVE', createdById: 'bondar', user: { unitId: 'analytics' },
  startDay: new Date('2026-11-25T00:00:00Z'), endDay: new Date('2026-11-28T00:00:00Z'), ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  repo.overlapping.mockResolvedValue(null);
  repo.create.mockImplementation(async (d: object) => d);
  repo.update.mockImplementation(async (_id: string, d: object) => d);
  repo.findById.mockResolvedValue(absence());
});

describe('заведення', () => {
  it('собі: лікарняний на 3 дні з сьогодні', async () => {
    await svc.create(bondar, { kind: 'SICK_LEAVE', startDay: '2026-11-26', endDay: '2026-11-28' }, NOW);
    expect(repo.create).toHaveBeenCalledWith({ userId: 'bondar', kind: 'SICK_LEAVE', startDay: '2026-11-26', endDay: '2026-11-28', createdById: 'bondar' });
  });
  it('виконавець не заводить іншому — 403', async () => {
    users.findById.mockResolvedValue({ id: 'savchuk', unitId: 'analytics', isActive: true });
    await expect(svc.create(bondar, { userId: 'savchuk', kind: 'VACATION', startDay: '2026-12-01', endDay: '2026-12-14' }, NOW)).rejects.toMatchObject({ status: 403 });
  });
  it('накладання з наявною — 409; кінець раніше початку, понад 120 днів, давніше 60 днів — 400', async () => {
    repo.overlapping.mockResolvedValueOnce({ id: 'x' });
    await expect(svc.create(bondar, { kind: 'FAMILY', startDay: '2026-11-27', endDay: '2026-11-27' }, NOW)).rejects.toMatchObject({ status: 409, code: 'absence_overlap' });
    await expect(svc.create(bondar, { kind: 'FAMILY', startDay: '2026-11-27', endDay: '2026-11-26' }, NOW)).rejects.toMatchObject({ status: 400 });
    await expect(svc.create(bondar, { kind: 'VACATION', startDay: '2026-12-01', endDay: '2027-04-01' }, NOW)).rejects.toMatchObject({ code: 'absence_too_long' });
    await expect(svc.create(bondar, { kind: 'SICK_LEAVE', startDay: '2026-09-20', endDay: '2026-09-22' }, NOW)).rejects.toMatchObject({ code: 'absence_too_old' });
  });
});

describe('«Вийшов на службу»', () => {
  it('почалась раніше — кінець учора', async () => {
    await svc.end(bondar, 'a1', NOW);
    expect(repo.update).toHaveBeenCalledWith('a1', { endDay: '2026-11-25' });
  });
  it('почалась сьогодні чи ще попереду — знімається', async () => {
    repo.findById.mockResolvedValue(absence({ startDay: new Date('2026-11-26T00:00:00Z') }));
    expect(await svc.end(bondar, 'a1', NOW)).toBeNull();
    expect(repo.remove).toHaveBeenCalledWith('a1');
  });
  it('людина не закінчує заведене керівником; керівник — так', async () => {
    repo.findById.mockResolvedValue(absence({ createdById: 'melnyk' }));
    await expect(svc.end(bondar, 'a1', NOW)).rejects.toMatchObject({ status: 403 });
    await svc.end(lead, 'a1', NOW);
    expect(repo.update).toHaveBeenCalled();
  });
});

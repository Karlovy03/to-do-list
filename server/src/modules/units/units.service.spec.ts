import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ findById: vi.fn(), all: vi.fn(), update: vi.fn(), withTreeLock: vi.fn() }));
const cache = vi.hoisted(() => ({ unitTree: vi.fn(), invalidateUnitTree: vi.fn() }));
vi.mock('./units.repository', () => ({ unitsRepository: repo }));
vi.mock('./units.cache', () => cache);

const { unitsService } = await import('./units.service');

beforeEach(() => {
  vi.clearAllMocks();
  repo.findById.mockResolvedValue({ id: 'x', _count: { users: 0, children: 0 } });
  repo.withTreeLock.mockImplementation((fn: (db: object) => unknown) => fn({}));
  // застарілий кеш іншого процесу: «a1» ще не під «a»
  cache.unitTree.mockResolvedValue([{ id: 'a', name: 'A', parentId: null }, { id: 'a1', name: 'A1', parentId: null }]);
  repo.all.mockResolvedValue([{ id: 'a', name: 'A', parentId: null }, { id: 'a1', name: 'A1', parentId: 'a' }]);
});

describe('структура підрозділів', () => {
  it('цикл перевіряється за деревом з бази, а не з кешу, і під блокуванням', async () => {
    await expect(unitsService.update('a', { parentId: 'a1' })).rejects.toMatchObject({ status: 400, code: 'unit_cycle' });
    expect(repo.withTreeLock).toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('переміщення без циклу зберігається і скидає кеш дерева', async () => {
    repo.update.mockResolvedValue({ id: 'a1' });
    await unitsService.update('a1', { parentId: null, name: 'Сектор' });
    expect(repo.update).toHaveBeenCalled();
    expect(cache.invalidateUnitTree).toHaveBeenCalled();
  });
});

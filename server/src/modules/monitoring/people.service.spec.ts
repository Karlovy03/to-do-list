import { beforeEach, describe, expect, it, vi } from 'vitest';

const repo = vi.hoisted(() => ({ personStats: vi.fn(), dailyPeople: vi.fn(), visitsOf: vi.fn(), activeDaysOf: vi.fn() }));
const users = vi.hoisted(() => ({ list: vi.fn() }));
const live = vi.hoisted(() => ({ onlineUserIds: vi.fn() }));
vi.mock('./monitoring.repository', () => ({ monitoringRepository: repo, VISITS_PAGE: 30 }));
vi.mock('../users', () => ({ usersRepository: users, publicUser: (u: { id: string; fullName: string }) => ({ id: u.id, fullName: u.fullName }) }));
vi.mock('../live', () => ({ liveHub: live }));
vi.mock('../units', () => ({ unitTree: async () => [{ id: 'an', name: 'Відділ аналітики', parentId: null }] }));
const { peopleService } = await import('./people.service');

// субота 28.11.2026, 09:00 за Києвом
const NOW = new Date('2026-11-28T07:00:00Z');
const person = (id: string, fullName: string) => ({ id, fullName, unitId: 'an' });

beforeEach(() => {
  vi.clearAllMocks();
  users.list.mockResolvedValue([person('a', 'Бондар Андрій'), person('b', 'Шевченко Оксана'), person('c', 'Ткаченко Дмитро'), person('d', 'Лисенко Марія'), person('e', 'Петренко Віктор')]);
  live.onlineUserIds.mockReturnValue(new Set(['b']));
  repo.personStats.mockResolvedValue([
    { userId: 'a', lastAt: new Date('2026-11-27T22:30:00Z'), visits: 9, days: 6 }, // 00:30 28.11 за Києвом — це вже сьогодні
    { userId: 'b', lastAt: new Date('2026-11-25T10:00:00Z'), visits: 2, days: 2 },
    { userId: 'c', lastAt: new Date('2026-11-27T21:30:00Z'), visits: 4, days: 3 }, // 23:30 27.11 — учора
    { userId: 'e', lastAt: new Date('2026-11-10T10:00:00Z'), visits: 1, days: 1 },
  ]);
  repo.dailyPeople.mockResolvedValue([{ day: '2026-11-27', people: 3 }, { day: '2026-11-28', people: 1 }]);
});

describe('«Відвідування»', () => {
  it('онлайн першими, далі за останнім візитом; хто ще не заходив — наприкінці', async () => {
    const r = await peopleService.overview(NOW);
    expect(r.items.map((i) => i.person.id)).toEqual(['b', 'a', 'c', 'e', 'd']);
    expect(r.items[0]).toMatchObject({ online: true, unitName: 'Відділ аналітики', visits30: 2, days30: 2 });
    expect(r.items.at(-1)).toMatchObject({ lastAt: null, visits30: 0, days30: 0 });
  });
  it('підсумок: сьогодні — за київським днем; давно — понад 7 днів або ще ні разу', async () => {
    const r = await peopleService.overview(NOW);
    expect(r.summary).toEqual({ total: 5, online: 1, today: 2, week: 3, away: 2 });
  });
  it('стовпчики — рівно 30 київських днів до сьогодні, дні без візитів — нулі', async () => {
    const { daily } = await peopleService.overview(NOW);
    expect(daily).toHaveLength(30);
    expect(daily[0]).toEqual({ day: '2026-10-30', people: 0 });
    expect(daily.slice(-2)).toEqual([{ day: '2026-11-27', people: 3 }, { day: '2026-11-28', people: 1 }]);
  });
});

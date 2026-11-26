import { describe, expect, it, vi } from 'vitest';
import { Prisma, type User } from '@prisma/client';

const repo = vi.hoisted(() => ({ findById: vi.fn(), findByLogin: vi.fn(), update: vi.fn(), create: vi.fn() }));
vi.mock('./users.repository', () => ({ usersRepository: repo }));
vi.mock('../units', () => ({ unitsRepository: { findById: vi.fn() } }));
vi.mock('../settings', () => ({ getSettings: async () => ({ defaultQuietFrom: 20, defaultQuietTo: 8, defaultMuteWeekends: true }) }));

const { usersService } = await import('./users.service');
const admin = { id: 'admin', role: 'ADMIN', login: 'admin' } as User;

describe('користувачі', () => {
  it('логін, який зайняли одночасно з перевіркою, дає «логін зайнятий», а не 500', async () => {
    repo.findById.mockResolvedValue({ id: 'u1', login: 'old', role: 'MEMBER' });
    repo.findByLogin.mockResolvedValue(null);
    repo.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' }));
    await expect(usersService.update(admin, 'u1', { login: 'taken' })).rejects.toMatchObject({ status: 400, code: 'login_taken' });
  });

  it('адміністратор не може зняти з себе роль чи вимкнути себе', async () => {
    repo.findById.mockResolvedValue(admin);
    await expect(usersService.update(admin, 'admin', { role: 'MANAGER' })).rejects.toMatchObject({ code: 'cannot_demote_self' });
    await expect(usersService.update(admin, 'admin', { isActive: false })).rejects.toMatchObject({ code: 'cannot_demote_self' });
  });
});

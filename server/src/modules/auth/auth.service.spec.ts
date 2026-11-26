import { beforeEach, describe, expect, it, vi } from 'vitest';

const users = vi.hoisted(() => ({ update: vi.fn(), findByLogin: vi.fn() }));
const subs = vi.hoisted(() => ({ removeAllForUser: vi.fn() }));
vi.mock('../users', () => ({ usersRepository: users, BCRYPT_ROUNDS: 4 }));
vi.mock('../notifications', () => ({ pushSubscriptions: subs }));

const { authService } = await import('./auth.service');

beforeEach(() => vi.clearAllMocks());

describe('вихід', () => {
  it('завершує всі сесії людини і прибирає її підписки на push', async () => {
    await authService.logout('u1');
    expect(users.update).toHaveBeenCalledWith('u1', { tokenVersion: { increment: 1 } });
    expect(subs.removeAllForUser).toHaveBeenCalledWith('u1');
  });
});

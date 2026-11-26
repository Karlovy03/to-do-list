import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';

const repo = vi.hoisted(() => ({ findUser: vi.fn() }));
vi.mock('./session.repository', () => ({ sessionRepository: repo }));

const { loadUser } = await import('./middleware');
const { signToken } = await import('./jwt');
const { config } = await import('../config');

const user = { id: 'u1', isActive: true, tokenVersion: 3 };
const run = async (headers: Record<string, string>, cookies: Record<string, string> = {}) => {
  const req = { headers, cookies } as unknown as Request;
  const res = { cookie: vi.fn() } as unknown as Response & { cookie: ReturnType<typeof vi.fn> };
  await loadUser(req, res, () => undefined);
  return { req, res };
};
const old = (version: number) => jwt.sign({ sub: 'u1', v: version, iat: Math.floor(Date.now() / 1000) - 2 * 86400 }, config.JWT_SECRET, { algorithm: 'HS256' });

beforeEach(() => {
  vi.clearAllMocks();
  repo.findUser.mockResolvedValue(user);
});

describe('сесія', () => {
  it('дійсний токен поточної версії — користувача впізнано', async () => {
    const { req } = await run({ authorization: `Bearer ${signToken('u1', 3)}` });
    expect(req.user).toBe(user);
  });

  it('токен старої версії (після виходу, зміни пароля чи ролі) не діє', async () => {
    const { req } = await run({ authorization: `Bearer ${signToken('u1', 2)}` });
    expect(req.user).toBeUndefined();
  });

  it('вимкнений користувач не проходить навіть зі свіжим токеном', async () => {
    repo.findUser.mockResolvedValue({ ...user, isActive: false });
    const { req } = await run({ authorization: `Bearer ${signToken('u1', 3)}` });
    expect(req.user).toBeUndefined();
  });

  it('токен, підписаний іншим алгоритмом, відхиляється', async () => {
    const none = jwt.sign({ sub: 'u1', v: 3 }, '', { algorithm: 'none' });
    const { req } = await run({ authorization: `Bearer ${none}` });
    expect(req.user).toBeUndefined();
  });

  it('веб-сесії, старшій за добу, видається свіжа cookie; свіжу не чіпаємо', async () => {
    const stale = await run({}, { kt_session: old(3) });
    expect(stale.req.user).toBe(user);
    expect(stale.res.cookie).toHaveBeenCalledTimes(1);
    const fresh = await run({}, { kt_session: signToken('u1', 3) });
    expect(fresh.res.cookie).not.toHaveBeenCalled();
  });
});

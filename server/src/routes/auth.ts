import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { clearSession, me, selfUser, setSession, signToken } from '../lib/auth';
import { HttpError } from '../lib/http';

export const authRouter = Router();

// Простий захист від перебору: 10 спроб на 15 хв з однієї адреси
const attempts = new Map<string, { n: number; until: number }>();
const WINDOW = 15 * 60_000;

authRouter.post('/login', async (req, res) => {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const a = attempts.get(key);
  if (a && a.until > now && a.n >= 10) throw new HttpError(429, 'too_many_attempts');

  const { login, password } = z.object({ login: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { login: login.toLowerCase() } });
  const ok = user?.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok || !user) {
    attempts.set(key, { n: (a && a.until > now ? a.n : 0) + 1, until: a && a.until > now ? a.until : now + WINDOW });
    throw new HttpError(401, 'invalid_credentials');
  }
  attempts.delete(key);
  if (req.headers['x-client'] === 'native') {
    res.json({ ...selfUser(user), token: signToken(user.id) });
    return;
  }
  setSession(res, user.id);
  res.json(selfUser(user));
});

authRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  res.json(selfUser(me(req)));
});

const prefsInput = z.object({
  quietFrom: z.number().int().min(0).max(23),
  quietTo: z.number().int().min(0).max(23),
  muteWeekends: z.boolean(),
  notifyAssigned: z.boolean(),
  notifyControl: z.boolean(),
  notifyDeadline: z.boolean(),
  notifyUpdates: z.boolean(),
  controlInterval: z.number().int().min(15).max(7 * 1440).nullable(),
});

authRouter.put('/me/prefs', async (req, res) => {
  const u = me(req);
  const data = prefsInput.parse(req.body);
  const updated = await prisma.user.update({ where: { id: u.id }, data });
  res.json(selfUser(updated));
});

authRouter.put('/me/password', async (req, res) => {
  const u = me(req);
  const { current, next } = z.object({ current: z.string(), next: z.string().min(8).max(200) }).parse(req.body);
  if (!(await bcrypt.compare(current, u.passwordHash))) throw new HttpError(400, 'wrong_password');
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  res.json({ ok: true });
});

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { me, publicUser, requireRole } from '../lib/auth';
import { badRequest, notFound } from '../lib/http';
import { getSettings } from '../services/settings';

export const usersRouter = Router();

// Список колег — потрібен усім для вибору виконавця/контролера
usersRouter.get('/', async (req, res) => {
  const u = me(req);
  const all = u.role === 'ADMIN' && req.query.all === '1';
  const users = await prisma.user.findMany({
    where: all ? {} : { isActive: true },
    orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
  });
  res.json(users.map((x) => (all ? { ...publicUser(x), login: x.login } : publicUser(x))));
});

const userInput = z.object({
  login: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/),
  fullName: z.string().trim().min(3).max(150),
  position: z.string().trim().max(200).default(''),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
  password: z.string().min(8).max(200),
});

usersRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const input = userInput.parse(req.body);
  if (await prisma.user.findUnique({ where: { login: input.login } })) throw badRequest('login_taken');
  const s = await getSettings();
  const user = await prisma.user.create({
    data: {
      login: input.login,
      fullName: input.fullName,
      position: input.position,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
      quietFrom: s.defaultQuietFrom,
      quietTo: s.defaultQuietTo,
      muteWeekends: s.defaultMuteWeekends,
    },
  });
  res.status(201).json({ ...publicUser(user), login: user.login });
});

usersRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const actor = me(req);
  const input = userInput.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) throw notFound();
  if (target.id === actor.id && (input.isActive === false || (input.role && input.role !== 'ADMIN'))) {
    throw badRequest('cannot_demote_self');
  }
  if (input.login && input.login !== target.login && (await prisma.user.findUnique({ where: { login: input.login } }))) {
    throw badRequest('login_taken');
  }
  const { password, ...rest } = input;
  const user = await prisma.user.update({
    where: { id: target.id },
    data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
  });
  res.json({ ...publicUser(user), login: user.login });
});

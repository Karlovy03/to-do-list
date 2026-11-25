import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../lib/auth';
import { notFound } from '../../lib/http';

/** Довідник осіб, що ставлять контроль, але не користуються системою */
export const controllersRouter = Router();

controllersRouter.get('/', async (req, res) => {
  const rows = await prisma.controller.findMany({
    where: req.query.all === '1' ? {} : { isActive: true },
    orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
  });
  res.json(rows);
});

const input = z.object({
  fullName: z.string().trim().min(3).max(150),
  position: z.string().trim().max(200).default(''),
  organization: z.string().trim().max(200).default(''),
});

controllersRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  res.status(201).json(await prisma.controller.create({ data: input.parse(req.body) }));
});

controllersRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const data = input.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
  if (!(await prisma.controller.findUnique({ where: { id: String(req.params.id) } }))) throw notFound();
  res.json(await prisma.controller.update({ where: { id: String(req.params.id) }, data }));
});

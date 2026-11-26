import type { Prisma } from '@prisma/client';
import { LOCKS } from '../../core/lock';
import { prisma, type Db } from '../../core/prisma';

export const unitsRepository = {
  list: () => prisma.unit.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { users: true, children: true } } } }),
  all: (db: Db = prisma) => db.unit.findMany({ select: { id: true, name: true, parentId: true } }),
  findById: (id: string) => prisma.unit.findUnique({ where: { id }, include: { _count: { select: { users: true, children: true } } } }),
  create: (data: Prisma.UnitUncheckedCreateInput) => prisma.unit.create({ data }),
  update: (id: string, data: Prisma.UnitUncheckedUpdateInput, db: Db = prisma) => db.unit.update({ where: { id }, data }),
  /** Зміни структури — по одній: два одночасні переміщення не можуть разом утворити цикл */
  withTreeLock: <T>(fn: (db: Prisma.TransactionClient) => Promise<T>) =>
    prisma.$transaction(async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(${LOCKS.unitTree})`;
      return fn(db);
    }),
  remove: (id: string) => prisma.unit.delete({ where: { id } }),
};

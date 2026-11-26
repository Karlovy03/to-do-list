import type { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma';

export const unitsRepository = {
  list: () => prisma.unit.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { users: true, children: true } } } }),
  all: () => prisma.unit.findMany({ select: { id: true, name: true, parentId: true } }),
  findById: (id: string) => prisma.unit.findUnique({ where: { id }, include: { _count: { select: { users: true, children: true } } } }),
  create: (data: Prisma.UnitUncheckedCreateInput) => prisma.unit.create({ data }),
  update: (id: string, data: Prisma.UnitUncheckedUpdateInput) => prisma.unit.update({ where: { id }, data }),
  remove: (id: string) => prisma.unit.delete({ where: { id } }),
};

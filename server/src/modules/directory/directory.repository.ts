import type { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma';

export const directoryRepository = {
  list: (includeInactive: boolean) =>
    prisma.controller.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
    }),
  findById: (id: string) => prisma.controller.findUnique({ where: { id } }),
  findActive: (id: string) => prisma.controller.findFirst({ where: { id, isActive: true } }),
  create: (data: Prisma.ControllerCreateInput) => prisma.controller.create({ data }),
  update: (id: string, data: Prisma.ControllerUpdateInput) => prisma.controller.update({ where: { id }, data }),
};

import type { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma';

export const usersRepository = {
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  findByLogin: (login: string) => prisma.user.findUnique({ where: { login } }),
  count: () => prisma.user.count(),

  list: (includeInactive: boolean) =>
    prisma.user.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
    }),

  findActiveByUnits: (unitIds: string[]) =>
    prisma.user.findMany({ where: { unitId: { in: unitIds }, isActive: true }, orderBy: { fullName: 'asc' } }),
  findActiveByIds: (ids: string[]) => prisma.user.findMany({ where: { id: { in: ids }, isActive: true } }),
  countActiveByIds: (ids: string[]) => prisma.user.count({ where: { id: { in: ids }, isActive: true } }),

  create: (data: Prisma.UserCreateInput) => prisma.user.create({ data }),
  update: (id: string, data: Prisma.UserUpdateInput) => prisma.user.update({ where: { id }, data }),
};

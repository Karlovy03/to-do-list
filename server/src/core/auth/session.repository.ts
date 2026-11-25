import { prisma } from '../prisma';

/** Користувач сесії — ядро не залежить від модуля users */
export const sessionRepository = {
  findUser: (id: string) => prisma.user.findUnique({ where: { id } }),
};

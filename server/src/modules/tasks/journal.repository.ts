import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../core/prisma';

export const JOURNAL_PAGE = 50;

/** Журнал ходу виконання. Дія системи — authorId = null, не вигадана особа */
export const journalRepository = {
  add: (entry: Prisma.TaskUpdateUncheckedCreateInput, db: Db = prisma) => db.taskUpdate.create({ data: entry }),

  addMany: (entries: Prisma.TaskUpdateCreateManyInput[], db: Db = prisma) => db.taskUpdate.createMany({ data: entries }),

  page: (taskId: string, offset: number) =>
    prisma.taskUpdate.findMany({
      where: { taskId },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: JOURNAL_PAGE + 1,
    }),
};

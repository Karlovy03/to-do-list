import type { AbsenceKind, Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma';
import { dayDate } from '../../core/time';

export const absenceInclude = { user: true, createdBy: true } satisfies Prisma.AbsenceInclude;
export type AbsenceFull = Prisma.AbsenceGetPayload<{ include: typeof absenceInclude }>;

/** Дні перетинаються: [start, end] і [from, to], усе включно */
const overlaps = (from: string, to: string) => ({ startDay: { lte: dayDate(to) }, endDay: { gte: dayDate(from) } });

export const absencesRepository = {
  findById: (id: string) => prisma.absence.findUnique({ where: { id }, include: absenceInclude }),

  /** Відсутності активних людей, що перетинають період; userIds — лише цих людей */
  inRange: (from: string, to: string, userIds?: string[]) =>
    prisma.absence.findMany({
      where: { ...overlaps(from, to), user: { isActive: true }, ...(userIds ? { userId: { in: userIds } } : {}) },
      include: absenceInclude,
      orderBy: [{ startDay: 'asc' }, { userId: 'asc' }],
    }),

  /** Хто з цих людей відсутній у цей день — для «не турбувати» */
  absentOn: async (userIds: string[], day: string): Promise<Set<string>> => {
    if (!userIds.length) return new Set();
    const rows = await prisma.absence.findMany({ where: { userId: { in: userIds }, ...overlaps(day, day) }, select: { userId: true } });
    return new Set(rows.map((r) => r.userId));
  },

  /** Інша відсутність тієї ж людини, що накладається на ці дні */
  overlapping: (userId: string, from: string, to: string, exceptId?: string) =>
    prisma.absence.findFirst({ where: { userId, ...overlaps(from, to), ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } }),

  create: (data: { userId: string; kind: AbsenceKind; startDay: string; endDay: string; createdById: string }) =>
    prisma.absence.create({ data: { ...data, startDay: dayDate(data.startDay), endDay: dayDate(data.endDay) }, include: absenceInclude }),

  update: (id: string, data: { kind?: AbsenceKind; startDay?: string; endDay?: string }) =>
    prisma.absence.update({
      where: { id },
      data: { kind: data.kind, startDay: data.startDay && dayDate(data.startDay), endDay: data.endDay && dayDate(data.endDay) },
      include: absenceInclude,
    }),

  remove: (id: string) => prisma.absence.delete({ where: { id } }),
};

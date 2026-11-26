import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../core/prisma';

export const eventInclude = {
  organizer: true,
  participants: { include: { user: true }, orderBy: { addedAt: 'asc' } },
} satisfies Prisma.EventInclude;

export type EventFull = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

export const EVENT_PAGE = 50;
/** Календар показує щонайбільше тиждень; стеля — лише запобіжник */
const RANGE_CAP = 2000;

export const eventsRepository = {
  findById: (id: string, db: Db = prisma) => db.event.findUnique({ where: { id }, include: eventInclude }),

  list: (where: Prisma.EventWhereInput, orderBy: Prisma.EventOrderByWithRelationInput, offset: number) =>
    prisma.event.findMany({ where, include: eventInclude, orderBy, skip: offset, take: EVENT_PAGE + 1 }),

  /** Заходи, що перетинають період [from, to) */
  inRange: (where: Prisma.EventWhereInput, from: Date, to: Date) =>
    prisma.event.findMany({
      where: { AND: [where, { startsAt: { lt: to } }, { endsAt: { gt: from } }] },
      include: eventInclude,
      orderBy: { startsAt: 'asc' },
      take: RANGE_CAP,
    }),

  create: (data: Prisma.EventUncheckedCreateInput, db: Db = prisma) => db.event.create({ data, include: eventInclude }),

  update: (id: string, data: Prisma.EventUncheckedUpdateInput, db: Db = prisma) => db.event.update({ where: { id }, data, include: eventInclude }),

  addParticipants: (eventId: string, userIds: string[], db: Db = prisma) =>
    db.eventParticipant.createMany({ data: userIds.map((userId) => ({ eventId, userId })), skipDuplicates: true }),

  removeParticipants: (eventId: string, userIds: string[], db: Db = prisma) =>
    db.eventParticipant.deleteMany({ where: { eventId, userId: { in: userIds } } }),

  /** Новий час — нове нагадування кожному учаснику */
  resetReminders: (eventId: string, db: Db = prisma) => db.eventParticipant.updateMany({ where: { eventId }, data: { remindedAt: null } }),

  /** Умовне скасування: два одночасні кліки не дадуть двох скасувань */
  async cancel(id: string, at: Date, db: Db = prisma) {
    const { count } = await db.event.updateMany({ where: { id, status: 'PLANNED' }, data: { status: 'CANCELLED', cancelledAt: at } });
    return count === 1;
  },

  /** Разом з учасниками й сповіщеннями (onDelete: Cascade) */
  remove: (id: string) => prisma.event.delete({ where: { id } }),
};

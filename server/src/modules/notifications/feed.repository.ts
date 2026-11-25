import type { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma';

const PAGE = 50;

export const feedRepository = {
  createMany: (rows: Prisma.NotificationCreateManyInput[]) => prisma.notification.createMany({ data: rows }),

  list: (userId: string, offset: number) =>
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: offset, take: PAGE + 1 }),

  unreadCount: (userId: string) => prisma.notification.count({ where: { userId, readAt: null } }),

  markRead: (userId: string, ids?: string[]) =>
    prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    }),
};

export const FEED_PAGE = PAGE;

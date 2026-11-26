import { prisma } from '../../../core/prisma';

const OPEN = ['NEW', 'IN_PROGRESS'] as const;

export const remindersRepository = {
  openTasks: () =>
    prisma.task.findMany({
      where: { status: { in: [...OPEN] } },
      include: { assignees: { select: { userId: true, addedAt: true, doneAt: true } } },
    }),

  logs: (taskIds: string[]) => prisma.reminderLog.findMany({ where: { taskId: { in: taskIds } } }),

  activeSnoozes: (taskIds: string[], now: Date) =>
    prisma.snooze.findMany({ where: { taskId: { in: taskIds }, until: { gt: now } } }),

  usersByIds: (ids: string[]) => prisma.user.findMany({ where: { id: { in: ids }, isActive: true } }),

  markSent: (entries: { taskId: string; userId: string; key: string }[], now: Date) =>
    prisma.$transaction(
      entries.map((e) =>
        prisma.reminderLog.upsert({
          where: { taskId_userId_key: e },
          create: { ...e, sentAt: now },
          update: { sentAt: now },
        }),
      ),
    ),

  /** Заходи, що почнуться впродовж найближчих minutes хв, з учасниками, яким ще не нагадали */
  upcomingEvents: (now: Date, minutes: number) =>
    prisma.event.findMany({
      where: { status: 'PLANNED', startsAt: { gt: now, lte: new Date(now.getTime() + minutes * 60_000) } },
      include: { participants: { where: { remindedAt: null }, include: { user: true } } },
    }),

  /** Позначка «нагадано» — перед надсиланням, як журнал нагадувань (ADR-0004) */
  markEventReminded: (pairs: { eventId: string; userId: string }[], now: Date) =>
    prisma.$transaction(pairs.map((p) => prisma.eventParticipant.update({ where: { eventId_userId: p }, data: { remindedAt: now } }))),

  snooze: (taskId: string, userId: string, until: Date) =>
    prisma.snooze.upsert({ where: { taskId_userId: { taskId, userId } }, create: { taskId, userId, until }, update: { until } }),

  /** Журнали й відкладення закритих завдань, прострочені відкладення, старі прочитані сповіщення */
  async cleanup(now: Date) {
    const closed = { task: { status: { notIn: [...OPEN] } } };
    const [logs, snoozes, feed] = await prisma.$transaction([
      prisma.reminderLog.deleteMany({ where: closed }),
      prisma.snooze.deleteMany({ where: { OR: [closed, { until: { lt: now } }] } }),
      prisma.notification.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 90 * 24 * 3600_000) } } }),
    ]);
    return { logs: logs.count, snoozes: snoozes.count, feed: feed.count };
  },
};

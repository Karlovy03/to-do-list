import type { Prisma, TaskStatus } from '@prisma/client';
import { prisma, type Db } from '../../core/prisma';

export const taskInclude = {
  author: true,
  assignees: { include: { user: true }, orderBy: { addedAt: 'asc' } },
  controlSetBy: true,
  controllerUser: true,
  controller: true,
} satisfies Prisma.TaskInclude;

export type TaskFull = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export const OPEN_STATUSES: TaskStatus[] = ['NEW', 'IN_PROGRESS'];
export const LIST_PAGE = 50;
/** «Довідка» друкується одним документом; стеля — лише запобіжник від випадкового величезного запиту */
export const REPORT_CAP = 1000;

export const taskRepository = {
  /** Разом із виконавцями, журналом, сповіщеннями й нагадуваннями (onDelete: Cascade) */
  remove: (id: string) => prisma.task.delete({ where: { id } }),
  findById: (id: string, db: Db = prisma) => db.task.findUnique({ where: { id }, include: taskInclude }),

  list: (where: Prisma.TaskWhereInput, orderBy: Prisma.TaskOrderByWithRelationInput[], offset: number) =>
    prisma.task.findMany({ where, include: taskInclude, orderBy, skip: offset, take: LIST_PAGE + 1 }),

  listAll: (where: Prisma.TaskWhereInput, orderBy: Prisma.TaskOrderByWithRelationInput[]) =>
    prisma.task.findMany({ where, include: taskInclude, orderBy, take: REPORT_CAP }),

  count: (where: Prisma.TaskWhereInput) => prisma.task.count({ where }),

  create: (data: Prisma.TaskUncheckedCreateInput, db: Db = prisma) => db.task.create({ data, include: taskInclude }),

  update: (id: string, data: Prisma.TaskUncheckedUpdateInput, db: Db = prisma) => db.task.update({ where: { id }, data, include: taskInclude }),

  /**
   * Умовна зміна стану: спрацьовує, лише якщо стан досі той, що очікувався.
   * Два одночасні кліки не дадуть двох переходів (повертає кількість змінених рядків).
   */
  async transition(id: string, from: TaskStatus[], data: Prisma.TaskUpdateManyMutationInput, db: Db = prisma) {
    const { count } = await db.task.updateMany({ where: { id, status: { in: from } }, data });
    return count === 1;
  },

  /**
   * Блокує рядок завдання до кінця транзакції. Без цього два одночасні «Виконано» від різних
   * виконавців кожен бачать іншого незавершеним (READ COMMITTED) і жоден не закриває завдання.
   */
  lockForUpdate: (id: string, db: Db) => db.$executeRaw`SELECT 1 FROM "Task" WHERE "id" = ${id} FOR UPDATE`,

  // ----- виконавці -----
  addAssignees: (taskId: string, userIds: string[], db: Db = prisma) =>
    db.taskAssignee.createMany({ data: userIds.map((userId) => ({ taskId, userId })), skipDuplicates: true }),

  removeAssignees: (taskId: string, userIds: string[], db: Db = prisma) =>
    db.taskAssignee.deleteMany({ where: { taskId, userId: { in: userIds } } }),

  /** Позначити «Виконано» за себе; false — якщо вже позначено */
  async markAssigneeDone(taskId: string, userId: string, at: Date, db: Db = prisma) {
    const { count } = await db.taskAssignee.updateMany({ where: { taskId, userId, doneAt: null }, data: { doneAt: at } });
    return count === 1;
  },

  /** Хто ще має позначити «Виконано»; вимкнений користувач не може цього зробити, тож не блокує завдання */
  pendingAssignees: (taskId: string, db: Db = prisma) =>
    db.taskAssignee.count({ where: { taskId, doneAt: null, user: { isActive: true } } }),

  resetAssigneesDone: (taskId: string, db: Db = prisma) =>
    db.taskAssignee.updateMany({ where: { taskId }, data: { doneAt: null } }),

  markAllAssigneesDone: (taskId: string, at: Date, db: Db = prisma) =>
    db.taskAssignee.updateMany({ where: { taskId, doneAt: null }, data: { doneAt: at } }),

  // ----- журнал нагадувань по завданню -----
  /** Нові умови (термін, повернення) — нові попередження; таймер контролю можна зберегти */
  clearReminderLogs: (taskId: string, opts: { keepControl: boolean }, db: Db = prisma) =>
    db.reminderLog.deleteMany({ where: { taskId, ...(opts.keepControl ? { key: { not: 'control' } } : {}) } }),

  clearControlLogs: (taskId: string, db: Db = prisma) => db.reminderLog.deleteMany({ where: { taskId, key: 'control' } }),

  /** Людину зняли із завдання — прибрати її нагадування й відкладення */
  forgetUsers: async (taskId: string, userIds: string[], db: Db = prisma) => {
    await db.reminderLog.deleteMany({ where: { taskId, userId: { in: userIds } } });
    await db.snooze.deleteMany({ where: { taskId, userId: { in: userIds } } });
  },
};

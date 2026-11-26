import type { Viewer } from '../access';
import type { Prisma } from '@prisma/client';
import { notFound } from '../../core/http-error';
import { canView, visibilityWhere } from './task.policy';
import { LIST_PAGE, OPEN_STATUSES, taskRepository } from './task.repository';
import { JOURNAL_PAGE, journalRepository } from './journal.repository';
import type { ListQuery } from './task.schemas';

/** Завдання, яке людина має право бачити; інакше 404 — не розкриваємо існування */
export async function loadVisible(id: string, viewer: Viewer) {
  const t = await taskRepository.findById(id);
  if (!t || !canView(t, viewer)) throw notFound();
  return t;
}

export const taskQueryService = {
  async list(viewer: Viewer, q: ListQuery) {
    const and: Prisma.TaskWhereInput[] = [visibilityWhere(viewer)];
    if (q.scope === 'mine') and.push({ assignees: { some: { userId: viewer.id } } });
    if (q.scope === 'authored') and.push({ OR: [{ authorId: viewer.id }, { controllerUserId: viewer.id }, { controlSetById: viewer.id }] });
    if (q.scope === 'controlled') and.push({ isControlled: true });
    if (q.status === 'open') and.push({ status: { in: OPEN_STATUSES } });
    if (q.status === 'done') and.push({ status: { in: ['DONE', 'CANCELLED'] } });
    if (q.assignee) and.push({ assignees: { some: { userId: q.assignee } } });
    if (q.q) {
      const n = Number(q.q.replace(/^№\s*/, ''));
      and.push({
        OR: [
          { title: { contains: q.q, mode: 'insensitive' } },
          { description: { contains: q.q, mode: 'insensitive' } },
          ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
        ],
      });
    }
    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      q.status === 'done' ? [{ completedAt: 'desc' }, { updatedAt: 'desc' }] : [{ isControlled: 'desc' }, { deadline: 'asc' }];
    const rows = await taskRepository.list({ AND: and }, orderBy, q.offset);
    return { rows: rows.slice(0, LIST_PAGE), hasMore: rows.length > LIST_PAGE };
  },

  /** Довідка для наради: усі відкриті контрольні, які людина бачить, — без сторінок */
  report(viewer: Viewer) {
    return taskRepository.listAll({ AND: [visibilityWhere(viewer), { isControlled: true, status: { in: OPEN_STATUSES } }] }, [{ deadline: 'asc' }]);
  },

  async summary(viewer: Viewer, now = new Date()) {
    const visible = visibilityWhere(viewer);
    const open = { ...visible, status: { in: OPEN_STATUSES } };
    const [mine, controlled, overdue, dueSoon] = await Promise.all([
      taskRepository.count({ status: { in: OPEN_STATUSES }, assignees: { some: { userId: viewer.id, doneAt: null } } }),
      taskRepository.count({ ...open, isControlled: true }),
      taskRepository.count({ ...open, deadline: { lt: now } }),
      taskRepository.count({ ...open, deadline: { gte: now, lt: new Date(now.getTime() + 24 * 3600_000) } }),
    ]);
    return { mine, controlled, overdue, dueSoon };
  },

  async journal(id: string, viewer: Viewer, offset: number) {
    await loadVisible(id, viewer);
    const rows = await journalRepository.page(id, offset);
    return { rows: rows.slice(0, JOURNAL_PAGE), hasMore: rows.length > JOURNAL_PAGE };
  },
};

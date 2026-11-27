import type { Viewer } from '../access';
import { badRequest, conflict, forbidden } from '../../core/http-error';
import { transaction } from '../../core/prisma';
import { notifyInBackground } from '../notifications';
import { journalRepository } from './journal.repository';
import { executors, leads, stakeholders } from './stakeholders';
import { permissions, type TaskPermissions } from './task.policy';
import { OPEN_STATUSES, taskRepository } from './task.repository';
import { loadVisible } from './task-query.service';
import { announceTask } from './task-live';

/** Зміни стану завдання (ADR-0002). Кожен перехід — умовний: подвійний клік дає 409, а не два переходи. */

async function guard(actor: Viewer, id: string, right: keyof TaskPermissions) {
  const t = await loadVisible(id, actor);
  if (!permissions(t, actor)[right]) throw forbidden('transition_not_allowed');
  return t;
}

/** Термін, що вже минув, треба замінити при поверненні в роботу */
function nextDeadline(current: Date, proposed: Date | undefined, now: Date) {
  if (proposed) return proposed;
  if (current.getTime() <= now.getTime()) throw badRequest('deadline_required');
  return undefined;
}

export const taskLifecycleService = {
  async start(actor: Viewer, id: string) {
    const t = await guard(actor, id, 'start');
    const task = await transaction(async (db) => {
      if (!(await taskRepository.transition(t.id, ['NEW'], { status: 'IN_PROGRESS' }, db))) throw conflict();
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'STATUS', meta: { action: 'start' } }, db);
      return taskRepository.findById(t.id, db);
    });
    notifyInBackground({ event: 'STARTED', task: task!, to: leads(t), actorId: actor.id });
    announceTask(t.id, t, task!);
    return task!;
  },

  /** «Виконано» за себе; завдання DONE, коли позначили всі виконавці */
  async markDone(actor: Viewer, id: string, comment: string) {
    const t = await guard(actor, id, 'markDone');
    const now = new Date();
    const { task, finished } = await transaction(async (db) => {
      await taskRepository.lockForUpdate(t.id, db);
      if (!(await taskRepository.markAssigneeDone(t.id, actor.id, now, db))) throw conflict();
      const finished = (await taskRepository.pendingAssignees(t.id, db)) === 0;
      if (finished && !(await taskRepository.transition(t.id, OPEN_STATUSES, { status: 'DONE', completedAt: now, progress: 100 }, db))) {
        throw conflict();
      }
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'STATUS', text: comment, meta: { action: finished ? 'done' : 'done_part' } }, db);
      return { task: (await taskRepository.findById(t.id, db))!, finished };
    });
    notifyInBackground({
      event: finished ? 'DONE' : 'DONE_PART',
      task,
      to: leads(t),
      actorId: actor.id,
      who: actor.fullName,
      comment: comment ? { name: actor.fullName, text: comment } : undefined,
    });
    announceTask(t.id, t, task);
    return task;
  },

  /** Повернути виконане в роботу — лише з коментарем */
  async returnBack(actor: Viewer, id: string, comment: string, deadline?: Date) {
    const t = await guard(actor, id, 'returnBack');
    const now = new Date();
    const newDeadline = nextDeadline(t.deadline, deadline, now);
    const task = await transaction(async (db) => {
      const data = { status: 'IN_PROGRESS' as const, completedAt: null, progress: 0, ...(newDeadline ? { deadline: newDeadline, deadlineSetAt: now } : {}) };
      if (!(await taskRepository.transition(t.id, ['DONE'], data, db))) throw conflict();
      await taskRepository.resetAssigneesDone(t.id, db);
      await taskRepository.clearReminderLogs(t.id, { keepControl: true }, db);
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'STATUS', text: comment, meta: { action: 'return' } }, db);
      if (newDeadline) {
        await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'DEADLINE', meta: { from: t.deadline.toISOString(), to: newDeadline.toISOString() } }, db);
      }
      return (await taskRepository.findById(t.id, db))!;
    });
    notifyInBackground({
      event: 'RETURNED',
      task,
      to: executors(task),
      actorId: actor.id,
      withDeadline: newDeadline ? 'new_line' : undefined,
      comment: { name: actor.fullName, text: comment },
    });
    announceTask(t.id, t, task);
    return task;
  },

  /** Автор/керівник закриває достроково — лише з коментарем */
  async closeEarly(actor: Viewer, id: string, comment: string) {
    const t = await guard(actor, id, 'closeEarly');
    const now = new Date();
    const task = await transaction(async (db) => {
      if (!(await taskRepository.transition(t.id, OPEN_STATUSES, { status: 'DONE', completedAt: now, progress: 100 }, db))) throw conflict();
      await taskRepository.markAllAssigneesDone(t.id, now, db);
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'STATUS', text: comment, meta: { action: 'close_early' } }, db);
      return (await taskRepository.findById(t.id, db))!;
    });
    notifyInBackground({
      event: 'DONE',
      task,
      to: stakeholders(task),
      actorId: actor.id,
      titleKey: 'notifications.progress.closed_early',
      comment: { name: actor.fullName, text: comment },
    });
    announceTask(t.id, t, task);
    return task;
  },

  async cancel(actor: Viewer, id: string, comment: string) {
    const t = await guard(actor, id, 'cancel');
    const task = await transaction(async (db) => {
      if (!(await taskRepository.transition(t.id, OPEN_STATUSES, { status: 'CANCELLED', completedAt: new Date() }, db))) throw conflict();
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'STATUS', text: comment, meta: { action: 'cancel' } }, db);
      return (await taskRepository.findById(t.id, db))!;
    });
    notifyInBackground({ event: 'CANCELLED', task, to: stakeholders(task), actorId: actor.id, comment: comment ? { name: actor.fullName, text: comment } : undefined });
    announceTask(t.id, t, task);
    return task;
  },

  async reopen(actor: Viewer, id: string, deadline?: Date) {
    const t = await guard(actor, id, 'reopen');
    const now = new Date();
    const newDeadline = nextDeadline(t.deadline, deadline, now);
    const task = await transaction(async (db) => {
      const data = { status: 'IN_PROGRESS' as const, completedAt: null, ...(newDeadline ? { deadline: newDeadline, deadlineSetAt: now } : {}) };
      if (!(await taskRepository.transition(t.id, ['CANCELLED'], data, db))) throw conflict();
      await taskRepository.resetAssigneesDone(t.id, db);
      await taskRepository.clearReminderLogs(t.id, { keepControl: false }, db);
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'STATUS', meta: { action: 'reopen' } }, db);
      return (await taskRepository.findById(t.id, db))!;
    });
    notifyInBackground({ event: 'REOPENED', task, to: executors(task), actorId: actor.id, withDeadline: 'line' });
    announceTask(t.id, t, task);
    return task;
  },
};

import type { User } from '@prisma/client';
import type { z } from 'zod';
import { badRequest, forbidden } from '../../core/http-error';
import { transaction } from '../../core/prisma';
import { NO_CONTROL, resolveControl } from '../control';
import { notifyInBackground } from '../notifications';
import { usersRepository } from '../users';
import { journalRepository } from './journal.repository';
import { pendingExecutors } from './stakeholders';
import { canAssignTo, canControlOnCreate, permissions } from './task.policy';
import { taskRepository } from './task.repository';
import { loadVisible } from './task-query.service';
import type { createTaskSchema, updateTaskSchema } from './task.schemas';

async function checkAssignees(actor: User, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!canAssignTo(actor, unique)) throw forbidden('only_self_assign');
  if ((await usersRepository.countActiveByIds(unique)) !== unique.length) throw badRequest('assignee_not_found');
  return unique;
}

export const taskCrudService = {
  async create(actor: User, input: z.infer<typeof createTaskSchema>) {
    if (input.control && !canControlOnCreate(actor)) throw forbidden('control_requires_manager');
    const assigneeIds = await checkAssignees(actor, input.assigneeIds);
    const control = input.control ? await resolveControl(input.control, actor) : NO_CONTROL;

    const task = await transaction(async (db) => {
      const t = await taskRepository.create(
        {
          title: input.title,
          description: input.description,
          priority: input.priority,
          deadline: input.deadline,
          authorId: actor.id,
          ...control,
          assignees: { create: assigneeIds.map((userId) => ({ userId })) },
        },
        db,
      );
      await journalRepository.addMany(
        [
          { taskId: t.id, authorId: actor.id, kind: 'CREATED' },
          ...(t.isControlled ? [{ taskId: t.id, authorId: actor.id, kind: 'CONTROL_ON' as const, text: t.controlBasis ?? '' }] : []),
        ],
        db,
      );
      return t;
    });

    notifyInBackground({
      event: 'ASSIGNED',
      task,
      to: assigneeIds,
      actorId: actor.id,
      titleKey: task.isControlled ? 'notifications.assignment.assigned_controlled' : undefined,
      withDeadline: 'line',
    });
    if (task.controllerUserId && !assigneeIds.includes(task.controllerUserId)) {
      notifyInBackground({ event: 'CONTROL_ON', task, to: [task.controllerUserId], actorId: actor.id, titleKey: 'notifications.control.yours' });
    }
    return task;
  },

  async update(actor: User, id: string, input: z.infer<typeof updateTaskSchema>) {
    const t = await loadVisible(id, actor);
    if (!permissions(t, actor).edit) throw forbidden();

    const prev = t.assignees.map((a) => a.userId);
    const next = input.assigneeIds ? await checkAssignees(actor, input.assigneeIds) : prev;
    const added = next.filter((x) => !prev.includes(x));
    const removed = prev.filter((x) => !next.includes(x));
    const deadlineChanged = !!input.deadline && input.deadline.getTime() !== t.deadline.getTime();
    const now = new Date();

    const task = await transaction(async (db) => {
      if (removed.length) {
        await taskRepository.removeAssignees(t.id, removed, db);
        await taskRepository.forgetUsers(t.id, removed, db);
      }
      if (added.length) await taskRepository.addAssignees(t.id, added, db);
      if (deadlineChanged) await taskRepository.clearReminderLogs(t.id, { keepControl: true }, db);
      const journal = [
        ...(added.length || removed.length ? [{ taskId: t.id, authorId: actor.id, kind: 'ASSIGNEES' as const, meta: { added, removed } }] : []),
        ...(deadlineChanged ? [{ taskId: t.id, authorId: actor.id, kind: 'DEADLINE' as const, meta: { from: t.deadline.toISOString(), to: input.deadline!.toISOString() } }] : []),
      ];
      if (journal.length) await journalRepository.addMany(journal, db);
      return taskRepository.update(
        t.id,
        {
          title: input.title,
          description: input.description,
          priority: input.priority,
          ...(deadlineChanged ? { deadline: input.deadline, deadlineSetAt: now } : {}),
        },
        db,
      );
    });

    const controlled = task.isControlled ? 'notifications.assignment.assigned_controlled' : undefined;
    notifyInBackground({ event: 'ASSIGNED', task, to: added, actorId: actor.id, titleKey: controlled, withDeadline: 'line' });
    notifyInBackground({ event: 'UNASSIGNED', task, to: removed, actorId: actor.id });
    if (deadlineChanged) {
      const to = [...pendingExecutors(task).filter((x) => !added.includes(x)), task.controllerUserId];
      notifyInBackground({ event: 'DEADLINE_CHANGED', task, to, actorId: actor.id, withDeadline: 'new_line' });
    }
    return task;
  },

  async remove(actor: User, id: string) {
    const task = await loadVisible(id, actor);
    if (!permissions(task, actor).delete) throw forbidden('delete_not_allowed');
    await taskRepository.remove(task.id);
  },
};

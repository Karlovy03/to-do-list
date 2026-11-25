import type { User } from '@prisma/client';
import { forbidden } from '../../core/http-error';
import { transaction } from '../../core/prisma';
import { notifyInBackground, snoozeReminders } from '../notifications';
import { journalRepository } from './journal.repository';
import { stakeholders } from './stakeholders';
import { permissions } from './task.policy';
import { taskRepository } from './task.repository';
import { loadVisible } from './task-query.service';

export const taskProgressService = {
  /** Необов'язкова нотатка про хід і/або відсоток готовності */
  async addNote(actor: User, id: string, input: { text: string; progress?: number }) {
    const t = await loadVisible(id, actor);
    if (!permissions(t, actor).note) throw forbidden();
    const progressChanged = input.progress !== undefined && input.progress !== t.progress;
    const executor = t.assignees.some((a) => a.userId === actor.id);

    const task = await transaction(async (db) => {
      // перша нотатка виконавця = завдання в роботі; перехід теж іде в журнал
      if (t.status === 'NEW' && executor && (await taskRepository.transition(t.id, ['NEW'], { status: 'IN_PROGRESS' }, db))) {
        await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'STATUS', meta: { action: 'start', auto: true } }, db);
      }
      await journalRepository.add(
        {
          taskId: t.id,
          authorId: actor.id,
          kind: progressChanged ? 'PROGRESS' : 'COMMENT',
          text: input.text,
          progress: progressChanged ? input.progress : null,
        },
        db,
      );
      return taskRepository.update(t.id, progressChanged ? { progress: input.progress } : {}, db);
    });

    notifyInBackground({
      event: progressChanged ? 'PROGRESS' : 'COMMENT',
      task,
      to: stakeholders(task),
      actorId: actor.id,
      vars: progressChanged ? { progress: input.progress! } : undefined,
      comment: input.text ? { name: actor.fullName, text: input.text.slice(0, 300) } : undefined,
    });
    return task;
  },

  async snooze(actor: User, id: string, minutes: number) {
    const t = await loadVisible(id, actor);
    if (!permissions(t, actor).snooze) throw forbidden();
    return snoozeReminders(t.id, actor.id, minutes);
  },
};

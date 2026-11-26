import type { Viewer } from './viewer';
import { forbidden } from '../../core/http-error';
import { transaction } from '../../core/prisma';
import { NO_CONTROL, resolveControl, type ControlInput } from '../control';
import { notifyInBackground } from '../notifications';
import { journalRepository } from './journal.repository';
import { executors, pendingExecutors, stakeholders } from './stakeholders';
import { permissions } from './task.policy';
import { taskRepository } from './task.repository';
import { loadVisible } from './task-query.service';

export const taskControlService = {
  /** Поставити на контроль або змінити умови; таймер нагадувань починається заново */
  async set(actor: Viewer, id: string, input: ControlInput) {
    const t = await loadVisible(id, actor);
    if (!permissions(t, actor).control) throw forbidden();
    const fields = await resolveControl(input, actor);
    const changed = t.isControlled;

    const task = await transaction(async (db) => {
      await taskRepository.clearControlLogs(t.id, db);
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'CONTROL_ON', text: fields.controlBasis ?? '', meta: { changed } }, db);
      return taskRepository.update(t.id, fields, db);
    });

    notifyInBackground({ event: changed ? 'CONTROL_CHANGED' : 'CONTROL_ON', task, to: pendingExecutors(task), actorId: actor.id });
    if (task.controllerUserId && !executors(task).includes(task.controllerUserId)) {
      notifyInBackground({ event: 'CONTROL_ON', task, to: [task.controllerUserId], actorId: actor.id, titleKey: 'notifications.control.yours' });
    }
    return task;
  },

  async remove(actor: Viewer, id: string, reason: string) {
    const t = await loadVisible(id, actor);
    if (!permissions(t, actor).removeControl) throw forbidden();
    // отримувачі — за станом ДО зняття, щоб дізнався й колишній контролер
    const to = stakeholders(t);

    const task = await transaction(async (db) => {
      await taskRepository.clearControlLogs(t.id, db);
      await journalRepository.add({ taskId: t.id, authorId: actor.id, kind: 'CONTROL_OFF', text: reason }, db);
      return taskRepository.update(t.id, NO_CONTROL, db);
    });

    notifyInBackground({ event: 'CONTROL_OFF', task, to, actorId: actor.id });
    return task;
  },
};

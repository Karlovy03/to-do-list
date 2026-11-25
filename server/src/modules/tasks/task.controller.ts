import type { Request, Response } from 'express';
import { currentUser } from '../../core/auth';
import { param } from '../../core/http-error';
import { controlInputSchema } from '../control';
import * as s from './task.schemas';
import { serializeTask, serializeUpdate } from './task.serializer';
import { loadVisible, taskQueryService } from './task-query.service';
import { taskCrudService } from './task-crud.service';
import { taskControlService } from './task-control.service';
import { taskLifecycleService as life } from './task-lifecycle.service';
import { taskProgressService } from './task-progress.service';
import type { TaskFull } from './task.repository';

/** Відповідь на будь-яку дію — оновлене завдання з правами поточного користувача */
const reply = (req: Request, res: Response, task: TaskFull, status = 200) => res.status(status).json(serializeTask(task, currentUser(req)));

export const taskController = {
  async list(req: Request, res: Response) {
    const viewer = currentUser(req);
    const { rows, hasMore } = await taskQueryService.list(viewer, s.listQuery.parse(req.query));
    res.json({ items: rows.map((t) => serializeTask(t, viewer)), hasMore });
  },
  async summary(req: Request, res: Response) {
    res.json(await taskQueryService.summary(currentUser(req)));
  },
  async get(req: Request, res: Response) {
    const viewer = currentUser(req);
    const task = await loadVisible(param(req, 'id'), viewer);
    const journal = await taskQueryService.journal(task.id, viewer, 0);
    res.json({ ...serializeTask(task, viewer), updates: journal.rows.map(serializeUpdate), hasMoreUpdates: journal.hasMore });
  },
  async journal(req: Request, res: Response) {
    const { rows, hasMore } = await taskQueryService.journal(param(req, 'id'), currentUser(req), s.journalQuery.parse(req.query).offset);
    res.json({ items: rows.map(serializeUpdate), hasMore });
  },

  async create(req: Request, res: Response) {
    reply(req, res, await taskCrudService.create(currentUser(req), s.createTaskSchema.parse(req.body)), 201);
  },
  async update(req: Request, res: Response) {
    reply(req, res, await taskCrudService.update(currentUser(req), param(req, 'id'), s.updateTaskSchema.parse(req.body)));
  },

  async setControl(req: Request, res: Response) {
    reply(req, res, await taskControlService.set(currentUser(req), param(req, 'id'), controlInputSchema.parse(req.body)));
  },
  async removeControl(req: Request, res: Response) {
    const { reason } = s.removeControlSchema.parse(req.body ?? {});
    reply(req, res, await taskControlService.remove(currentUser(req), param(req, 'id'), reason));
  },

  async addNote(req: Request, res: Response) {
    reply(req, res, await taskProgressService.addNote(currentUser(req), param(req, 'id'), s.noteSchema.parse(req.body)), 201);
  },
  async snooze(req: Request, res: Response) {
    const { minutes } = s.snoozeSchema.parse(req.body ?? {});
    res.json({ until: await taskProgressService.snooze(currentUser(req), param(req, 'id'), minutes) });
  },

  async start(req: Request, res: Response) {
    reply(req, res, await life.start(currentUser(req), param(req, 'id')));
  },
  async markDone(req: Request, res: Response) {
    reply(req, res, await life.markDone(currentUser(req), param(req, 'id'), s.markDoneSchema.parse(req.body ?? {}).comment));
  },
  async returnBack(req: Request, res: Response) {
    const { comment, deadline } = s.returnSchema.parse(req.body ?? {});
    reply(req, res, await life.returnBack(currentUser(req), param(req, 'id'), comment, deadline));
  },
  async closeEarly(req: Request, res: Response) {
    reply(req, res, await life.closeEarly(currentUser(req), param(req, 'id'), s.closeEarlySchema.parse(req.body ?? {}).comment));
  },
  async cancel(req: Request, res: Response) {
    reply(req, res, await life.cancel(currentUser(req), param(req, 'id'), s.cancelSchema.parse(req.body ?? {}).comment));
  },
  async reopen(req: Request, res: Response) {
    reply(req, res, await life.reopen(currentUser(req), param(req, 'id'), s.reopenSchema.parse(req.body ?? {}).deadline));
  },
};

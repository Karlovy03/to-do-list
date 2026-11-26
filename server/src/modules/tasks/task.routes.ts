import { Router } from 'express';
import { taskController as c } from './task.controller';

export const tasksRouter = Router();

tasksRouter.get('/', c.list);
tasksRouter.get('/summary', c.summary);
tasksRouter.get('/report', c.report);
tasksRouter.post('/', c.create);
tasksRouter.get('/:id', c.get);
tasksRouter.patch('/:id', c.update);
tasksRouter.delete('/:id', c.remove);
tasksRouter.get('/:id/updates', c.journal);

tasksRouter.post('/:id/control', c.setControl);
tasksRouter.post('/:id/control/remove', c.removeControl);

tasksRouter.post('/:id/notes', c.addNote);
tasksRouter.post('/:id/snooze', c.snooze);

tasksRouter.post('/:id/start', c.start);
tasksRouter.post('/:id/done', c.markDone);
tasksRouter.post('/:id/return', c.returnBack);
tasksRouter.post('/:id/close', c.closeEarly);
tasksRouter.post('/:id/cancel', c.cancel);
tasksRouter.post('/:id/reopen', c.reopen);

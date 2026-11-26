import { Router } from 'express';
import { eventsController as c } from './events.controller';

export const eventsRouter = Router();

eventsRouter.get('/', c.list);
eventsRouter.post('/', c.create);
eventsRouter.get('/:id', c.get);
eventsRouter.patch('/:id', c.update);
eventsRouter.delete('/:id', c.remove);
eventsRouter.post('/:id/cancel', c.cancel);

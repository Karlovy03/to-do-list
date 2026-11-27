import { Router } from 'express';
import { absencesController as c } from './absences.controller';

export const absencesRouter = Router();

absencesRouter.get('/', c.list);
absencesRouter.post('/', c.create);
absencesRouter.patch('/:id', c.update);
absencesRouter.delete('/:id', c.remove);
absencesRouter.post('/:id/end', c.end);

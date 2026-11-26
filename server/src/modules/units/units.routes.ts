import { Router } from 'express';
import { requireRole } from '../../core/auth';
import { unitsController } from './units.controller';

export const unitsRouter = Router();

unitsRouter.get('/', unitsController.list);
unitsRouter.post('/', requireRole('ADMIN'), unitsController.create);
unitsRouter.patch('/:id', requireRole('ADMIN'), unitsController.update);
unitsRouter.delete('/:id', requireRole('ADMIN'), unitsController.remove);

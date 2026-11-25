import { Router } from 'express';
import { requireRole } from '../../core/auth';
import { directoryController } from './directory.controller';

export const directoryRouter = Router();

directoryRouter.get('/', directoryController.list);
directoryRouter.post('/', requireRole('ADMIN', 'MANAGER'), directoryController.create);
directoryRouter.patch('/:id', requireRole('ADMIN', 'MANAGER'), directoryController.update);

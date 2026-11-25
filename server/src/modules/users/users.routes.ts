import { Router } from 'express';
import { requireRole } from '../../core/auth';
import { usersController } from './users.controller';

export const usersRouter = Router();

// Список колег потрібен усім — для вибору виконавця і контролера
usersRouter.get('/', usersController.list);
usersRouter.post('/', requireRole('ADMIN'), usersController.create);
usersRouter.patch('/:id', requireRole('ADMIN'), usersController.update);

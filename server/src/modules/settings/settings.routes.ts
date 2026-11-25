import { Router } from 'express';
import { requireRole } from '../../core/auth';
import { settingsController } from './settings.controller';

export const settingsRouter = Router();

settingsRouter.get('/', settingsController.get);
settingsRouter.put('/', requireRole('ADMIN'), settingsController.put);

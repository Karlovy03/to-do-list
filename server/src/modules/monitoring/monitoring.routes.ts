import { Router } from 'express';
import { requireRole } from '../../core/auth';
import { monitoringController as c } from './monitoring.controller';

/** Моніторинг бачить лише адміністратор (рішення власника, ADR-0024): директор і керівники отримують 403 */
export const monitoringRouter = Router();

monitoringRouter.use(requireRole('ADMIN'));
monitoringRouter.get('/people', c.people);
monitoringRouter.get('/people/:id/visits', c.visits);
monitoringRouter.get('/server', c.server);

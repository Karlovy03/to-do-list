import { Router } from 'express';
import { calendarController } from './calendar.controller';

export const calendarRouter = Router();

calendarRouter.get('/', calendarController.range);

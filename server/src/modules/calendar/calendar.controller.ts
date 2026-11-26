import type { Request, Response } from 'express';
import { viewerOf } from '../access';
import { calendarQuery } from './calendar.schemas';
import { calendarService } from './calendar.service';

export const calendarController = {
  async range(req: Request, res: Response) {
    res.json(await calendarService.range(await viewerOf(req), calendarQuery.parse(req.query)));
  },
};

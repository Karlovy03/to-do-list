import type { Request, Response } from 'express';
import { param } from '../../core/http-error';
import { peopleService } from './people.service';
import { serverQuery, visitsQuery } from './monitoring.schemas';
import { serverService } from './server.service';

export const monitoringController = {
  async people(_req: Request, res: Response) {
    res.json(await peopleService.overview());
  },
  async visits(req: Request, res: Response) {
    res.json(await peopleService.visits(param(req, 'id'), visitsQuery.parse(req.query).offset));
  },
  async server(req: Request, res: Response) {
    res.json(await serverService.status(serverQuery.parse(req.query).range));
  },
};

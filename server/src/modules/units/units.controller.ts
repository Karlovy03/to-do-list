import type { Request, Response } from 'express';
import { param } from '../../core/http-error';
import { createUnitSchema, updateUnitSchema } from './units.schemas';
import { unitsService } from './units.service';

export const unitsController = {
  async list(_req: Request, res: Response) {
    res.json(await unitsService.list());
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await unitsService.create(createUnitSchema.parse(req.body)));
  },
  async update(req: Request, res: Response) {
    res.json(await unitsService.update(param(req, 'id'), updateUnitSchema.parse(req.body)));
  },
  async remove(req: Request, res: Response) {
    await unitsService.remove(param(req, 'id'));
    res.status(204).end();
  },
};

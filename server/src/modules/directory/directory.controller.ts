import type { Request, Response } from 'express';
import { param } from '../../core/http-error';
import { createPersonSchema, listQuery, updatePersonSchema } from './directory.schemas';
import { directoryService } from './directory.service';

export const directoryController = {
  async list(req: Request, res: Response) {
    res.json(await directoryService.list(listQuery.parse(req.query).all === '1'));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await directoryService.create(createPersonSchema.parse(req.body)));
  },
  async update(req: Request, res: Response) {
    res.json(await directoryService.update(param(req, 'id'), updatePersonSchema.parse(req.body)));
  },
};

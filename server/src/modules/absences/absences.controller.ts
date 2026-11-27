import type { Request, Response } from 'express';
import { param } from '../../core/http-error';
import { viewerOf } from '../access';
import { createAbsenceSchema, listAbsencesQuery, updateAbsenceSchema } from './absences.schemas';
import { serializeAbsence } from './absences.serializer';
import { absencesService as svc } from './absences.service';

export const absencesController = {
  async list(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    res.json((await svc.list(listAbsencesQuery.parse(req.query))).map((a) => serializeAbsence(a, viewer)));
  },
  async create(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    res.status(201).json(serializeAbsence(await svc.create(viewer, createAbsenceSchema.parse(req.body)), viewer));
  },
  async update(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    res.json(serializeAbsence(await svc.update(viewer, param(req, 'id'), updateAbsenceSchema.parse(req.body)), viewer));
  },
  async remove(req: Request, res: Response) {
    await svc.remove(await viewerOf(req), param(req, 'id'));
    res.status(204).end();
  },
  async end(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    const a = await svc.end(viewer, param(req, 'id'));
    if (a) res.json(serializeAbsence(a, viewer));
    else res.status(204).end();
  },
};

import type { Request, Response } from 'express';
import { param } from '../../core/http-error';
import { viewerOf } from '../access';
import { eventsCrudService as crud } from './events-crud.service';
import { eventsQueryService, loadVisibleEvent } from './events-query.service';
import { cancelEventSchema, createEventSchema, listEventsQuery, updateEventSchema } from './events.schemas';
import { serializeEvent } from './events.serializer';
import type { EventFull } from './events.repository';

const reply = async (req: Request, res: Response, e: EventFull, status = 200) => res.status(status).json(serializeEvent(e, await viewerOf(req)));

export const eventsController = {
  async list(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    const { rows, hasMore } = await eventsQueryService.list(viewer, listEventsQuery.parse(req.query));
    res.json({ items: rows.map((e) => serializeEvent(e, viewer)), hasMore });
  },
  async get(req: Request, res: Response) {
    const viewer = await viewerOf(req);
    res.json(serializeEvent(await loadVisibleEvent(param(req, 'id'), viewer), viewer));
  },
  async create(req: Request, res: Response) {
    await reply(req, res, await crud.create(await viewerOf(req), createEventSchema.parse(req.body)), 201);
  },
  async update(req: Request, res: Response) {
    await reply(req, res, await crud.update(await viewerOf(req), param(req, 'id'), updateEventSchema.parse(req.body)));
  },
  async cancel(req: Request, res: Response) {
    await reply(req, res, await crud.cancel(await viewerOf(req), param(req, 'id'), cancelEventSchema.parse(req.body ?? {}).reason));
  },
  async remove(req: Request, res: Response) {
    await crud.remove(await viewerOf(req), param(req, 'id'));
    res.status(204).end();
  },
};

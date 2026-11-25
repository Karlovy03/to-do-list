import type { Request, Response } from 'express';
import { currentUser } from '../../core/auth';
import { vapidPublicKey } from './push/web';
import { deviceSchema, feedQuery, markReadSchema, unsubscribeSchema, webSubscriptionSchema } from './notifications.schemas';
import { notificationsService as svc } from './notifications.service';

export const notificationsController = {
  async feed(req: Request, res: Response) {
    res.json(await svc.feed(currentUser(req), feedQuery.parse(req.query).offset));
  },
  async markRead(req: Request, res: Response) {
    await svc.markRead(currentUser(req), markReadSchema.parse(req.body ?? {}).ids);
    res.json({ ok: true });
  },
};

export const pushController = {
  key(_req: Request, res: Response) {
    res.json({ publicKey: vapidPublicKey() });
  },
  async subscribe(req: Request, res: Response) {
    await svc.subscribeWeb(currentUser(req), webSubscriptionSchema.parse(req.body), String(req.headers['user-agent'] ?? ''));
    res.json({ ok: true });
  },
  async unsubscribe(req: Request, res: Response) {
    await svc.unsubscribeWeb(currentUser(req), unsubscribeSchema.parse(req.body).endpoint);
    res.json({ ok: true });
  },
  async device(req: Request, res: Response) {
    await svc.registerDevice(currentUser(req), deviceSchema.parse(req.body));
    res.json({ ok: true });
  },
  async test(req: Request, res: Response) {
    await svc.sendTest(currentUser(req));
    res.json({ ok: true });
  },
};

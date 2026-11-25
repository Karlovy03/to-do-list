import { Router } from 'express';
import { notificationsController as feed, pushController as push } from './notifications.controller';

export const notificationsRouter = Router();
notificationsRouter.get('/', feed.feed);
notificationsRouter.post('/read', feed.markRead);

export const pushRouter = Router();
pushRouter.get('/key', push.key);
pushRouter.post('/subscribe', push.subscribe);
pushRouter.post('/unsubscribe', push.unsubscribe);
pushRouter.post('/device', push.device);
pushRouter.post('/test', push.test);

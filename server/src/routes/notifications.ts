import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { me } from '../lib/auth';
import { sendPush, vapidPublicKey } from '../services/push';
import { tx } from '../lib/texts';

export const notificationsRouter = Router();

notificationsRouter.get('/', async (req, res) => {
  const u = me(req);
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.notification.count({ where: { userId: u.id, readAt: null } }),
  ]);
  res.json({ items, unread });
});

notificationsRouter.post('/read', async (req, res) => {
  const u = me(req);
  const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(req.body ?? {});
  await prisma.notification.updateMany({
    where: { userId: u.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

export const pushRouter = Router();

pushRouter.get('/key', (_req, res) => {
  res.json({ publicKey: vapidPublicKey() });
});

const subInput = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

pushRouter.post('/subscribe', async (req, res) => {
  const u = me(req);
  const s = subInput.parse(req.body);
  const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 300);
  await prisma.pushSubscription.upsert({
    where: { endpoint: s.endpoint },
    create: { userId: u.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent },
    update: { userId: u.id, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent },
  });
  res.json({ ok: true });
});

pushRouter.post('/unsubscribe', async (req, res) => {
  const u = me(req);
  const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: u.id } });
  res.json({ ok: true });
});

// Мобільний застосунок реєструє свій токен після входу
pushRouter.post('/device', async (req, res) => {
  const u = me(req);
  const { token, platform } = z.object({ token: z.string().min(10).max(4096), platform: z.enum(['android', 'ios']) }).parse(req.body);
  await prisma.deviceToken.upsert({ where: { token }, create: { userId: u.id, token, platform }, update: { userId: u.id, platform } });
  res.json({ ok: true });
});

pushRouter.delete('/device', async (req, res) => {
  const u = me(req);
  const { token } = z.object({ token: z.string() }).parse(req.body);
  await prisma.deviceToken.deleteMany({ where: { token, userId: u.id } });
  res.json({ ok: true });
});

pushRouter.post('/test', async (req, res) => {
  const u = me(req);
  await sendPush(u.id, { title: tx('push_test_title'), body: tx('push_test_body'), url: '/settings', tag: 'test' });
  res.json({ ok: true });
});

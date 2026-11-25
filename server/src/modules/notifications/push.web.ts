import webpush from 'web-push';
import { prisma } from '../../lib/prisma';
import { config } from '../../lib/config';
import { sendNative } from './push.native';

let publicKey = '';
let ready = false;

/** Ключі VAPID: з оточення, інакше генеруються один раз і зберігаються в БД. */
export async function initPush() {
  let pub = config.vapidPublic;
  let priv = config.vapidPrivate;
  if (!pub || !priv) {
    const row = await prisma.setting.findUnique({ where: { key: 'vapid' } });
    const stored = row?.value as { publicKey?: string; privateKey?: string } | undefined;
    if (stored?.publicKey && stored.privateKey) {
      pub = stored.publicKey;
      priv = stored.privateKey;
    } else {
      const keys = webpush.generateVAPIDKeys();
      pub = keys.publicKey;
      priv = keys.privateKey;
      await prisma.setting.create({ data: { key: 'vapid', value: { publicKey: keys.publicKey, privateKey: keys.privateKey } } });
    }
  }
  const subject = config.vapidSubject || (config.publicUrl.startsWith('https://') ? config.publicUrl : 'mailto:admin@example.org');
  webpush.setVapidDetails(subject, pub, priv);
  publicKey = pub;
  ready = true;
}

export const vapidPublicKey = () => publicKey;

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  taskId?: string;
  snooze?: boolean;
  urgent?: boolean;
}

export async function sendPush(userId: string, payload: PushPayload) {
  await Promise.all([sendWeb(userId, payload), sendNative(userId, payload)]);
}

async function sendWeb(userId: string, payload: PushPayload) {
  if (!ready) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12, urgency: payload.urgent ? 'high' : 'normal' },
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        } else {
          console.warn('[push] send failed', status ?? err);
        }
      }
    }),
  );
}

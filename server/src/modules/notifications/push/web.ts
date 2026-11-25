import * as webpush from 'web-push';
import { config } from '../../../core/config';
import { settingsRepository } from '../../settings';
import { PUSH_TIMEOUT_MS, type PushPayload, type SendResult } from './types';

let publicKey = '';
let ready = false;

/**
 * Ключі VAPID: у продакшені — з оточення; у розробці генеруються один раз
 * і зберігаються (upsert — без гонки між процесами).
 */
export async function initWebPush() {
  let pub = config.VAPID_PUBLIC_KEY;
  let priv = config.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    if (config.isProd) {
      console.warn('[push:web] VAPID keys are not set — web push disabled');
      return;
    }
    const row = await settingsRepository.get('vapid');
    const stored = row?.value as { publicKey?: string; privateKey?: string } | undefined;
    if (stored?.publicKey && stored.privateKey) {
      ({ publicKey: pub, privateKey: priv } = stored as { publicKey: string; privateKey: string });
    } else {
      const keys = webpush.generateVAPIDKeys();
      await settingsRepository.put('vapid', { publicKey: keys.publicKey, privateKey: keys.privateKey });
      const saved = (await settingsRepository.get('vapid'))?.value as { publicKey: string; privateKey: string };
      ({ publicKey: pub, privateKey: priv } = saved);
    }
  }
  const subject = config.VAPID_SUBJECT ?? (config.PUBLIC_URL.startsWith('https://') ? config.PUBLIC_URL : 'mailto:admin@example.org');
  webpush.setVapidDetails(subject, pub!, priv!);
  publicKey = pub!;
  ready = true;
}

export const vapidPublicKey = () => publicKey;

export async function sendWeb(sub: { endpoint: string; p256dh: string; auth: string }, p: PushPayload): Promise<SendResult> {
  if (!ready) return 'ok';
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(p), {
      TTL: 60 * 60 * 12,
      // high — щоб Android не відкладав доставку в режимі економії заряду; усі наші push видимі людині
      urgency: 'high',
      timeout: PUSH_TIMEOUT_MS,
    });
    return 'ok';
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return 'dead';
    console.warn('[push:web]', status ?? err);
    return 'error';
  }
}

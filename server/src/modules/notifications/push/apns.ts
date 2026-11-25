import fs from 'node:fs';
import http2 from 'node:http2';
import jwt from 'jsonwebtoken';
import { config } from '../../../core/config';
import { PUSH_TIMEOUT_MS, type PushPayload, type SendResult } from './types';

/** iPhone: Apple Push Notification service напряму, ключ .p8 (ADR-0008) */

const HOSTS = { production: 'https://api.push.apple.com', sandbox: 'https://api.sandbox.push.apple.com' } as const;
type Env = keyof typeof HOSTS;

let provider: { value: string; at: number } | null = null;
const sessions = new Map<Env, http2.ClientHttp2Session>();

export const apnsConfigured = () =>
  !!(config.APNS_KEY_FILE && config.APNS_KEY_ID && config.APNS_TEAM_ID && config.APNS_BUNDLE_ID && fs.existsSync(config.APNS_KEY_FILE));

/** Apple: оновлювати не частіше ніж раз на 20 хв і не рідше ніж раз на 60 хв */
function providerToken() {
  if (provider && Date.now() - provider.at < 40 * 60_000) return provider.value;
  const key = fs.readFileSync(config.APNS_KEY_FILE!, 'utf8');
  const value = jwt.sign({ iss: config.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, key, {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: config.APNS_KEY_ID },
  });
  provider = { value, at: Date.now() };
  return value;
}

function session(env: Env) {
  const existing = sessions.get(env);
  if (existing && !existing.closed && !existing.destroyed) return existing;
  const s = http2.connect(HOSTS[env]);
  s.on('error', () => s.destroy());
  s.on('goaway', () => s.close());
  sessions.set(env, s);
  return s;
}

export function sendApns(token: string, sandbox: boolean, p: PushPayload): Promise<SendResult> {
  if (!apnsConfigured()) return Promise.resolve('ok');
  return new Promise((resolve) => {
    let status = 0;
    let body = '';
    const req = session(sandbox ? 'sandbox' : 'production').request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${providerToken()}`,
      'apns-topic': config.APNS_BUNDLE_ID!,
      'apns-push-type': 'alert',
      'apns-priority': p.urgent ? '10' : '5',
      'apns-collapse-id': p.tag.slice(0, 64),
    });
    req.setTimeout(PUSH_TIMEOUT_MS, () => {
      req.close();
      resolve('error');
    });
    req.on('response', (h) => (status = Number(h[':status'])));
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (status === 200) return resolve('ok');
      if (/ExpiredProviderToken|InvalidProviderToken/.test(body)) provider = null;
      if (status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(body)) return resolve('dead');
      console.warn('[push:apns]', status, body.slice(0, 200));
      resolve('error');
    });
    req.on('error', () => resolve('error'));
    req.end(
      JSON.stringify({
        aps: {
          alert: { title: p.title, body: p.body },
          sound: 'default',
          'thread-id': p.taskId ?? 'general',
          'interruption-level': p.urgent ? 'time-sensitive' : 'active',
          ...(p.actions?.snooze ? { category: 'TASK_REMINDER' } : {}),
        },
        url: p.url,
        taskId: p.taskId,
      }),
    );
  });
}

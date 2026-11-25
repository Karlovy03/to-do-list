import fs from 'node:fs';
import http2 from 'node:http2';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import type { PushPayload } from './push.web';

/*
 * Push у мобільні застосунки без сторонніх SDK:
 *  - Android: Firebase Cloud Messaging HTTP v1 (сервісний акаунт Google, JSON)
 *  - iPhone: Apple Push Notification service напряму (ключ .p8 з Apple Developer)
 * Канал вимкнено, доки не задано відповідні змінні оточення.
 */

// ---------- Android / FCM ----------
interface ServiceAccount { project_id: string; client_email: string; private_key: string; token_uri: string }
let sa: ServiceAccount | null = null;
let fcmToken: { value: string; exp: number } | null = null;

function loadServiceAccount() {
  const file = process.env.FCM_SERVICE_ACCOUNT_FILE;
  if (!file || !fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as ServiceAccount;
}

async function fcmAccessToken(): Promise<string | null> {
  sa ??= loadServiceAccount();
  if (!sa) return null;
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return fcmToken.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: sa.token_uri, iat: now, exp: now + 3600 },
    sa.private_key,
    { algorithm: 'RS256' },
  );
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`FCM auth ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  fcmToken = { value: body.access_token, exp: Date.now() + body.expires_in * 1000 };
  return fcmToken.value;
}

/** @returns false, якщо токен більше не дійсний */
async function sendFcm(token: string, p: PushPayload): Promise<boolean> {
  const access = await fcmAccessToken();
  if (!access || !sa) return true;
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: p.title, body: p.body },
        data: { url: p.url, taskId: p.taskId ?? '', tag: p.tag },
        android: {
          priority: p.urgent ? 'HIGH' : 'NORMAL',
          notification: { tag: p.tag, channel_id: p.urgent ? 'urgent' : 'tasks' },
        },
      },
    }),
  });
  if (res.ok) return true;
  const text = await res.text();
  if (res.status === 404 || text.includes('UNREGISTERED')) return false;
  console.warn('[fcm]', res.status, text.slice(0, 200));
  return true;
}

// ---------- iPhone / APNs ----------
let apnsJwt: { value: string; at: number } | null = null;
let apnsSession: http2.ClientHttp2Session | null = null;

const apnsConfigured = () =>
  !!(process.env.APNS_KEY_FILE && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_BUNDLE_ID);

function apnsAuth() {
  // Apple вимагає оновлювати токен не частіше ніж раз на 20 хв і не рідше ніж раз на годину
  if (apnsJwt && Date.now() - apnsJwt.at < 40 * 60_000) return apnsJwt.value;
  const key = fs.readFileSync(process.env.APNS_KEY_FILE!, 'utf8');
  const value = jwt.sign({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }, key, {
    algorithm: 'ES256',
    header: { alg: 'ES256', kid: process.env.APNS_KEY_ID },
  });
  apnsJwt = { value, at: Date.now() };
  return value;
}

function session() {
  if (apnsSession && !apnsSession.closed && !apnsSession.destroyed) return apnsSession;
  const host = process.env.APNS_SANDBOX === '1' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  apnsSession = http2.connect(host);
  apnsSession.on('error', () => apnsSession?.destroy());
  return apnsSession;
}

function sendApns(token: string, p: PushPayload): Promise<boolean> {
  if (!apnsConfigured()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const req = session().request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${apnsAuth()}`,
      'apns-topic': process.env.APNS_BUNDLE_ID!,
      'apns-push-type': 'alert',
      'apns-priority': p.urgent ? '10' : '5',
      'apns-collapse-id': p.tag.slice(0, 64),
    });
    let status = 0;
    let body = '';
    req.on('response', (h) => (status = Number(h[':status'])));
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (status === 410 || body.includes('BadDeviceToken') || body.includes('Unregistered')) return resolve(false);
      if (status !== 200) console.warn('[apns]', status, body.slice(0, 200));
      resolve(true);
    });
    req.on('error', () => resolve(true));
    req.end(
      JSON.stringify({
        aps: { alert: { title: p.title, body: p.body }, sound: 'default', 'thread-id': p.taskId ?? 'general', 'interruption-level': p.urgent ? 'time-sensitive' : 'active' },
        url: p.url,
        taskId: p.taskId,
      }),
    );
  });
}

export async function sendNative(userId: string, p: PushPayload) {
  const devices = await prisma.deviceToken.findMany({ where: { userId } });
  await Promise.all(
    devices.map(async (d) => {
      try {
        const alive = d.platform === 'ios' ? await sendApns(d.token, p) : await sendFcm(d.token, p);
        if (!alive) await prisma.deviceToken.delete({ where: { id: d.id } }).catch(() => undefined);
      } catch (err) {
        console.warn('[native-push]', err);
      }
    }),
  );
}

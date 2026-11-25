import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { config } from '../../../core/config';
import { PUSH_TIMEOUT_MS, type PushPayload, type SendResult } from './types';

/** Android: Firebase Cloud Messaging HTTP v1 із сервісним акаунтом Google (ADR-0008) */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri: string;
}

let account: ServiceAccount | null | undefined;
let access: { value: string; exp: number } | null = null;
let inflight: Promise<string> | null = null;

function loadAccount(): ServiceAccount | null {
  if (account !== undefined) return account;
  const file = config.FCM_SERVICE_ACCOUNT_FILE;
  account = file && fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as ServiceAccount) : null;
  return account;
}

export const fcmConfigured = () => loadAccount() !== null;

async function requestAccessToken(sa: ServiceAccount): Promise<string> {
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
    signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`FCM auth ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  access = { value: body.access_token, exp: Date.now() + body.expires_in * 1000 };
  return access.value;
}

/** Один спільний запит токена на всі паралельні відправки */
async function accessToken(sa: ServiceAccount) {
  if (access && access.exp > Date.now() + 60_000) return access.value;
  inflight ??= requestAccessToken(sa).finally(() => (inflight = null));
  return inflight;
}

export async function sendFcm(token: string, p: PushPayload): Promise<SendResult> {
  const sa = loadAccount();
  if (!sa) return 'ok';
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await accessToken(sa)}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
      body: JSON.stringify({
        message: {
          token,
          notification: { title: p.title, body: p.body },
          data: { url: p.url, taskId: p.taskId ?? '', tag: p.tag, snooze: p.actions?.snooze ? '1' : '0' },
          android: {
            priority: p.urgent ? 'HIGH' : 'NORMAL',
            // канали створює застосунок під час старту (building-mobile-apps)
            notification: { tag: p.tag, channel_id: p.urgent ? 'urgent' : 'tasks' },
          },
        },
      }),
    });
    if (res.ok) return 'ok';
    const text = await res.text();
    if (res.status === 401) access = null;
    if (res.status === 404 || text.includes('UNREGISTERED')) return 'dead';
    if (res.status === 400 && /registration token|INVALID_ARGUMENT.*token/i.test(text)) return 'dead';
    console.warn('[push:fcm]', res.status, text.slice(0, 200));
    return 'error';
  } catch (err) {
    console.warn('[push:fcm]', err);
    return 'error';
  }
}

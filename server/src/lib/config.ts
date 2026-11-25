import fs from 'node:fs';
import path from 'node:path';

const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET ?? '';
if (isProd && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set (32+ characters) in production');
}

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 3101),
  jwtSecret: jwtSecret || 'dev-only-secret',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:5173',
  vapidSubject: process.env.VAPID_SUBJECT ?? '',
  vapidPublic: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivate: process.env.VAPID_PRIVATE_KEY ?? '',
  clientDist: process.env.CLIENT_DIST ?? path.resolve(__dirname, '../../../client/dist'),
  reminderTickMs: Number(process.env.REMINDER_TICK_MS ?? 60_000),
};

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Локальний .env (у контейнері змінні приходять з оточення)
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3101),
  DATABASE_URL: z.string().min(1),
  // секрет обов'язковий завжди: без нього токени можна підробити
  JWT_SECRET: isTest ? z.string().default('test-secret-test-secret-test-secret') : z.string().min(32, 'JWT_SECRET must be 32+ chars'),
  PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  CLIENT_DIST: z.string().optional(),
  REMINDER_TICK_MS: z.coerce.number().int().min(5_000).default(60_000),
  ADMIN_LOGIN: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  FCM_SERVICE_ACCOUNT_FILE: z.string().optional(),
  APNS_KEY_FILE: z.string().optional(),
  APNS_KEY_ID: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_BUNDLE_ID: z.string().optional(),
});

const parsed = schema.safeParse({ ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? (isTest ? 'postgresql://test' : undefined) });
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  process.exit(1);
}
const env = parsed.data;

export const config = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  clientDist: env.CLIENT_DIST ?? path.resolve(__dirname, '../../../client/dist'),
};

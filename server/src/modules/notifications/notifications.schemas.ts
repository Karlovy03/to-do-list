import { z } from 'zod';

export const feedQuery = z.object({ offset: z.coerce.number().int().min(0).max(10_000).default(0) });
export const markReadSchema = z.object({ ids: z.array(z.string()).max(200).optional() });

export const webSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});
export const unsubscribeSchema = z.object({ endpoint: z.string().max(1000) });

export const deviceSchema = z.object({
  token: z.string().min(10).max(4096),
  platform: z.enum(['android', 'ios']),
  sandbox: z.boolean().default(false),
});

import { z } from 'zod';

export const serverQuery = z.object({ range: z.enum(['24h', '7d']).default('24h') });
export const visitsQuery = z.object({ offset: z.coerce.number().int().min(0).max(10_000).default(0) });

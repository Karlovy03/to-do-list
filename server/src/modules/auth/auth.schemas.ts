import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().min(1).max(200),
});

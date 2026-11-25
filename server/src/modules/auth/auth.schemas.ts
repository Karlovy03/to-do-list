import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().min(1).max(200),
});

/** При виході пристрій відписується від push, щоб сповіщення не приходили наступній людині */
export const logoutSchema = z.object({
  pushEndpoint: z.string().max(1000).optional(),
  deviceToken: z.string().max(4096).optional(),
});

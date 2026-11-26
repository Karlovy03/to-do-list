import { z } from 'zod';

const DAY = 864e5;

/** Період календаря — до 8 діб (тиждень із запасом на перехід часу); межі рахує клієнт за Києвом */
export const calendarQuery = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    unit: z.string().min(1).max(40).optional(),
    sub: z.enum(['0', '1']).default('1'),
    person: z.string().min(1).max(40).optional(),
  })
  .refine((q) => q.to.getTime() > q.from.getTime() && q.to.getTime() - q.from.getTime() <= 8 * DAY, { message: 'bad_range' })
  .refine((q) => !(q.unit && q.person), { message: 'one_filter' });

export type CalendarQuery = z.infer<typeof calendarQuery>;

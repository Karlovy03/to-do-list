import { z } from 'zod';

const future = z.coerce.date().refine((d) => d.getTime() > Date.now(), { message: 'start_in_past' });
/** Орієнтовна тривалість, хв: від коротких 5 хв до цілого робочого дня */
const durationMin = z.number().int().min(5).max(720);
const title = z.string().trim().min(2).max(300);
const description = z.string().trim().max(5000);
const participantIds = z.array(z.string().min(1).max(40)).max(50);

export const createEventSchema = z.object({
  title,
  description: description.default(''),
  startsAt: future,
  durationMin,
  participantIds: participantIds.default([]),
});

// без default — інакше відсутнє поле затерло б наявне значення
export const updateEventSchema = z.object({ title, description, startsAt: future, durationMin, participantIds }).partial();

export const listEventsQuery = z.object({
  when: z.enum(['upcoming', 'past']).default('upcoming'),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const cancelEventSchema = z.object({ reason: z.string().trim().max(500).default('') });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuery>;

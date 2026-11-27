import { z } from 'zod';

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), { message: 'bad_day' });
const kind = z.enum(['VACATION', 'SICK_LEAVE', 'FAMILY']);

/** Кому — собі (без userId) або підлеглому; дні — київські, кінець включно */
export const createAbsenceSchema = z.object({
  userId: z.string().min(1).max(40).optional(),
  kind,
  startDay: day,
  endDay: day,
});

export const updateAbsenceSchema = z.object({ kind, startDay: day, endDay: day }).partial();

/** Період, що перетинається з відсутностями; до року — «мої» й підказки при дорученні беруть рік наперед */
export const listAbsencesQuery = z
  .object({ from: day, to: day })
  .refine((q) => q.to >= q.from && Date.parse(q.to) - Date.parse(q.from) <= 366 * 864e5, { message: 'bad_range' });

export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;
export type UpdateAbsenceInput = z.infer<typeof updateAbsenceSchema>;
export type ListAbsencesQuery = z.infer<typeof listAbsencesQuery>;

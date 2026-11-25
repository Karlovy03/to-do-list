import { z } from 'zod';

/** Контролююча особа — рівно одна з трьох (ADR: working-on-tasks-and-control) */
export const controllerRefSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('self') }),
  z.object({ type: z.literal('user'), userId: z.string().min(1) }),
  z.object({ type: z.literal('directory'), controllerId: z.string().min(1) }),
  z.object({ type: z.literal('text'), text: z.string().trim().min(2).max(200) }),
]);

export const controlInputSchema = z.object({
  by: controllerRefSchema,
  basis: z.string().trim().max(300).nullish(),
  reminderInterval: z.number().int().min(15).max(7 * 1440).nullish(),
});

export type ControlInput = z.infer<typeof controlInputSchema>;

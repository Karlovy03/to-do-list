import { z } from 'zod';
import { controlInputSchema } from '../control';

const future = z.coerce.date().refine((d) => d.getTime() > Date.now(), { message: 'deadline_in_past' });
const comment = z.string().trim().max(2000);

export const listQuery = z.object({
  scope: z.enum(['mine', 'authored', 'controlled', 'all']).default('mine'),
  status: z.enum(['open', 'done', 'all']).default('open'),
  q: z.string().trim().max(100).optional(),
  assignee: z.string().max(40).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type ListQuery = z.infer<typeof listQuery>;

export const journalQuery = z.object({ offset: z.coerce.number().int().min(0).max(10_000).default(0) });

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(300),
  description: z.string().trim().max(5000).default(''),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  deadline: future,
  assigneeIds: z.array(z.string()).min(1).max(50),
  control: controlInputSchema.nullish(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2).max(300),
    description: z.string().trim().max(5000),
    priority: z.enum(['NORMAL', 'HIGH', 'URGENT']),
    deadline: future,
    assigneeIds: z.array(z.string()).min(1).max(50),
  })
  .partial();

export const noteSchema = z
  .object({ text: z.string().trim().max(3000).default(''), progress: z.number().int().min(0).max(100).optional() })
  .refine((v) => v.text.length > 0 || v.progress !== undefined, { message: 'empty_note' });

export const markDoneSchema = z.object({ comment: comment.default('') });
/** Повернення і дострокове закриття — лише з коментарем (ADR-0002) */
export const returnSchema = z.object({ comment: comment.min(1, 'comment_required'), deadline: future.optional() });
export const closeEarlySchema = z.object({ comment: comment.min(1, 'comment_required') });
export const cancelSchema = z.object({ comment: comment.default('') });
export const reopenSchema = z.object({ deadline: future.optional() });
export const removeControlSchema = z.object({ reason: z.string().trim().max(500).default('') });
export const snoozeSchema = z.object({ minutes: z.number().int().min(15).max(1440).default(120) });

import { z } from 'zod';
import { EXTS } from './inspect';
import { normalizeQuery } from './templates.search';

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

const name = z.string().transform(oneLine).pipe(z.string().min(1).max(200));
/** Порожній опис — це «без опису» */
const description = z
  .string()
  .transform(oneLine)
  .pipe(z.string().max(500))
  .transform((s) => s || null);

export const listTemplatesQuery = z.object({
  q: z.string().max(100).transform(normalizeQuery).optional(),
  type: z.enum(EXTS).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

/** Поля форми разом із файлом (multipart): назва з імені файлу, якщо не задано */
export const uploadFields = z.object({ name: name.optional(), description: description.optional() });

export const updateTemplateSchema = z.object({ name, description: z.union([description, z.null()]) }).partial();

export type ListTemplatesQuery = z.infer<typeof listTemplatesQuery>;
export type UploadFields = z.infer<typeof uploadFields>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

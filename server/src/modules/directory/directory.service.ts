import type { z } from 'zod';
import { notFound } from '../../core/http-error';
import { directoryRepository } from './directory.repository';
import type { createPersonSchema, updatePersonSchema } from './directory.schemas';

/** Довідник осіб, які ставлять контроль, але не працюють у системі */
export const directoryService = {
  list: (includeInactive: boolean) => directoryRepository.list(includeInactive),
  create: (input: z.infer<typeof createPersonSchema>) => directoryRepository.create(input),
  async update(id: string, input: z.infer<typeof updatePersonSchema>) {
    if (!(await directoryRepository.findById(id))) throw notFound();
    return directoryRepository.update(id, input);
  },
};

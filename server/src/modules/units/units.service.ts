import type { z } from 'zod';
import { badRequest, conflict, notFound } from '../../core/http-error';
import { invalidateUnitTree, unitTree } from './units.cache';
import { unitsRepository } from './units.repository';
import type { createUnitSchema, updateUnitSchema } from './units.schemas';
import { wouldCycle } from './units.tree';

async function checkParent(parentId: string | null | undefined) {
  if (parentId && !(await unitsRepository.findById(parentId))) throw badRequest('unit_parent_not_found');
}

/** Структура підрозділів (ADR-0012): змінює лише адміністратор */
export const unitsService = {
  async list() {
    const rows = await unitsRepository.list();
    return rows.map(({ _count, ...u }) => ({ ...u, users: _count.users, children: _count.children }));
  },
  async create(input: z.infer<typeof createUnitSchema>) {
    await checkParent(input.parentId);
    const unit = await unitsRepository.create(input);
    invalidateUnitTree();
    return unit;
  },
  async update(id: string, input: z.infer<typeof updateUnitSchema>) {
    if (!(await unitsRepository.findById(id))) throw notFound();
    if (input.parentId) {
      await checkParent(input.parentId);
      if (wouldCycle(id, input.parentId, await unitTree(0))) throw badRequest('unit_cycle');
    }
    const unit = await unitsRepository.update(id, input);
    invalidateUnitTree();
    return unit;
  },
  async remove(id: string) {
    const unit = await unitsRepository.findById(id);
    if (!unit) throw notFound();
    if (unit._count.users > 0 || unit._count.children > 0) throw conflict('unit_not_empty');
    await unitsRepository.remove(id);
    invalidateUnitTree();
  },
};

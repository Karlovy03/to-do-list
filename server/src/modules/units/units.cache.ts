import { unitsRepository } from './units.repository';
import type { UnitNode } from './units.tree';

/**
 * Дерево потрібне на кожен запит до завдань (вертикаль керівника), а змінюється рідко.
 * Кеш у пам'яті процесу на 60 с; зміна структури через цей процес скидає його одразу.
 */
const TTL_MS = 60_000;
let cached: { at: number; units: UnitNode[] } | null = null;

export async function unitTree(now = Date.now()): Promise<UnitNode[]> {
  if (cached && now - cached.at < TTL_MS) return cached.units;
  cached = { at: now, units: await unitsRepository.all() };
  return cached.units;
}

export const invalidateUnitTree = () => {
  cached = null;
};

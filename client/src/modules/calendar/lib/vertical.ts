import type { Me, Person, Unit } from '@/shared/api/types';
import { flattenTree, subtree } from '@/shared/lib/units';

/**
 * Що пропонувати у «Кого показати»: директор і адміністратор — усе; керівник — свій підрозділ і нижчі (ADR-0012).
 * Це лише вибір у меню: що насправді видно, вирішує сервер, і фільтр видимого не розширює.
 */
export function verticalOf(me: Me, units: Unit[], people: Person[]) {
  const full = me.role === 'ADMIN' || me.role === 'DIRECTOR';
  const own = !full && me.unitId ? subtree(me.unitId, units) : null;
  const visibleUnits = full ? units : units.filter((u) => own?.has(u.id));
  const unitIds = new Set(visibleUnits.map((u) => u.id));
  const visiblePeople = people.filter((p) => p.isActive && (full || (p.unitId !== null && unitIds.has(p.unitId))));
  return { units: flattenTree(visibleUnits), people: visiblePeople };
}

/** Скільки людей покаже підрозділ: сам або разом із нижчими */
export function headcount(unitId: string, units: Unit[], people: Person[], sub: boolean) {
  const ids = sub ? subtree(unitId, units) : new Set([unitId]);
  return people.filter((p) => p.unitId !== null && ids.has(p.unitId)).length;
}

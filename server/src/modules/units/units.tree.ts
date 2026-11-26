/** Дерево підрозділів — чисті функції без бази, щоб їх легко перевірити тестами */
export interface UnitNode {
  id: string;
  name: string;
  parentId: string | null;
}

/** Підрозділ і всі, що входять у нього на будь-якій глибині */
export function subtreeIds(rootId: string, units: UnitNode[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const u of units) if (u.parentId) children.set(u.parentId, [...(children.get(u.parentId) ?? []), u.id]);
  const out = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

/** «Управління › Відділ › Сектор» */
export function unitPath(id: string, units: UnitNode[], sep = ' › '): string {
  const byId = new Map(units.map((u) => [u.id, u]));
  const names: string[] = [];
  const seen = new Set<string>();
  for (let u = byId.get(id); u && !seen.has(u.id); u = u.parentId ? byId.get(u.parentId) : undefined) {
    seen.add(u.id);
    names.unshift(u.name);
  }
  return names.join(sep);
}

/** Переміщення unit під newParent зробить цикл, якщо newParent — сам unit або його нащадок */
export const wouldCycle = (unitId: string, newParentId: string, units: UnitNode[]) => subtreeIds(unitId, units).has(newParentId);

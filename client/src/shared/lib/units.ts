import type { Unit } from '../api/types';

type Node = Pick<Unit, 'id' | 'name' | 'parentId'>;

/** «Управління › Відділ › Сектор» */
export function unitPath(id: string | null | undefined, units: Node[], sep = ' › '): string {
  if (!id) return '';
  const byId = new Map(units.map((u) => [u.id, u]));
  const names: string[] = [];
  const seen = new Set<string>();
  for (let u = byId.get(id); u && !seen.has(u.id); u = u.parentId ? byId.get(u.parentId) : undefined) {
    seen.add(u.id);
    names.unshift(u.name);
  }
  return names.join(sep);
}

/** Дерево в порядку показу: батьківський, під ним дочірні за абеткою; depth — для відступу */
export function flattenTree<T extends Node>(units: T[]): (T & { depth: number })[] {
  const ids = new Set(units.map((u) => u.id));
  const children = new Map<string | null, T[]>();
  for (const u of units) {
    const key = u.parentId && ids.has(u.parentId) ? u.parentId : null;
    children.set(key, [...(children.get(key) ?? []), u]);
  }
  const out: (T & { depth: number })[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const u of [...(children.get(parent) ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'uk'))) {
      out.push({ ...u, depth });
      walk(u.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Підрозділ і всі нижчі — щоб не дати перемістити підрозділ у власного нащадка */
export function subtree(id: string, units: Node[]): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of units) if (u.parentId && out.has(u.parentId) && !out.has(u.id)) out.add(u.id), (grew = true);
  }
  return out;
}

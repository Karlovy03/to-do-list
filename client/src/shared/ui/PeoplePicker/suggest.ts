import type { Person } from '../../api/types';

export const SUGGEST_LIMIT = 8;

/**
 * Що показати до пошуку: обрані, нещодавні, люди свого підрозділу — не більше SUGGEST_LIMIT
 * (обрані — завжди). Повний список із десятків людей не вивалюємо одразу.
 */
export function suggestPeople(people: Person[], selected: string[], recent: string[], unitId: string | null | undefined): Person[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const ids = [...selected, ...recent, ...people.filter((p) => unitId && p.unitId === unitId).map((p) => p.id)];
  const out: Person[] = [];
  for (const id of new Set(ids)) {
    const p = byId.get(id);
    if (p && (selected.includes(id) || out.length < SUGGEST_LIMIT)) out.push(p);
  }
  return out;
}

export function searchPeople(people: Person[], query: string, describe: (p: Person) => string): Person[] {
  const q = query.trim().toLowerCase();
  return people.filter((p) => `${p.fullName} ${describe(p)}`.toLowerCase().includes(q));
}

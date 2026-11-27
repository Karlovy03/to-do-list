import type { AppNotification } from '@/shared/api/types';

/**
 * Які записи стрічки — щойно доручені мені завдання (Figma 39): непрочитані «ASSIGNED», яких не було
 * при попередньому погляді. Перше завантаження лише запам'ятовує наявне — при вході повідомлень немає,
 * і різниця годинників сервера й пристрою не важить.
 */
export function freshAssignments(seen: ReadonlySet<string> | null, items: AppNotification[]) {
  const ids = new Set(items.map((n) => n.id));
  if (!seen) return { seen: ids, fresh: [] as AppNotification[] };
  const fresh = items.filter((n) => !seen.has(n.id) && !n.readAt && n.kind === 'ASSIGNED' && n.taskId);
  return { seen: new Set([...seen, ...ids]), fresh };
}

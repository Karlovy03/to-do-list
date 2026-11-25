import type { Task } from '@/shared/api/types';
import { dayKey } from '@/shared/lib/time';

export type GroupId = 'late' | 'today' | 'upcoming' | 'done';
export const GROUP_ORDER: GroupId[] = ['late', 'today', 'upcoming', 'done'];

const OPEN = new Set(['NEW', 'IN_PROGRESS']);

/** До якої групи належить завдання: прострочені → сьогодні (за київським днем) → найближчі → завершені */
export function groupOf(task: Task, now: Date): GroupId {
  if (!OPEN.has(task.status)) return 'done';
  const deadline = new Date(task.deadline);
  if (deadline.getTime() < now.getTime()) return 'late';
  return dayKey(deadline) === dayKey(now) ? 'today' : 'upcoming';
}

/** Контрольні — вгорі кожної групи; далі за терміном (завершені — найсвіжіші першими) */
function compare(a: Task, b: Task, group: GroupId) {
  if (!!a.control !== !!b.control) return a.control ? -1 : 1;
  if (group === 'done') return new Date(b.completedAt ?? b.deadline).getTime() - new Date(a.completedAt ?? a.deadline).getTime();
  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
}

export function groupTasks(tasks: Task[], now = new Date()): { id: GroupId; tasks: Task[] }[] {
  const buckets = new Map<GroupId, Task[]>(GROUP_ORDER.map((g) => [g, []]));
  for (const task of tasks) buckets.get(groupOf(task, now))!.push(task);
  return GROUP_ORDER.map((id) => ({ id, tasks: buckets.get(id)!.sort((a, b) => compare(a, b, id)) })).filter((g) => g.tasks.length > 0);
}

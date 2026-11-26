import type { Priority, TaskDetail } from '@/shared/api/types';
import type { TaskChanges } from '../api/tasks.api';

interface Draft {
  title: string;
  description: string;
  priority: Priority;
  deadline: Date;
  assigneeIds: string[];
}

/** Лише змінені поля: незмінений минулий термін не має блокувати правку назви */
export function taskChanges(task: Pick<TaskDetail, 'title' | 'description' | 'priority' | 'deadline' | 'assignees'>, d: Draft): TaskChanges {
  const out: TaskChanges = {};
  if (d.title.trim() !== task.title) out.title = d.title.trim();
  if (d.description.trim() !== task.description) out.description = d.description.trim();
  if (d.priority !== task.priority) out.priority = d.priority;
  if (d.deadline.getTime() !== new Date(task.deadline).getTime()) out.deadline = d.deadline.toISOString();
  const before = task.assignees.map((a) => a.id).sort().join();
  if ([...d.assigneeIds].sort().join() !== before) out.assigneeIds = d.assigneeIds;
  return out;
}

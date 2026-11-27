import type { Task } from '@/shared/api/types';
import { formatDeadline, shortDuration } from '@/shared/lib/time';
import { t } from '@/shared/lib/texts';
import type { TimeTone } from '@/shared/ui';

const DAY = 864e5;

/** Тон завдання: «триває» буває лише в заходів */
export type TaskTone = Exclude<TimeTone, 'live'>;

/** Колір = терміновість: та сама функція для чипа картки і смуги в календарі */
export function timeToneOf(task: Pick<Task, 'status' | 'deadline'>, now = new Date()): TaskTone {
  if (task.status === 'DONE') return 'done';
  if (task.status === 'CANCELLED') return 'calm';
  const left = new Date(task.deadline).getTime() - now.getTime();
  return left < 0 ? 'late' : left < DAY ? 'soon' : 'calm';
}

/** Тон і підписи часового чипа */
export function timeChipFor(task: Task, now = new Date()): { tone: TimeTone; time: string; rest?: string } {
  const tone = timeToneOf(task, now);
  if (task.status === 'DONE' || task.status === 'CANCELLED') {
    return { tone, time: t(`tasks.status.${task.status}`), rest: formatDeadline(task.completedAt ?? task.deadline) };
  }
  const left = new Date(task.deadline).getTime() - now.getTime();
  const time = formatDeadline(task.deadline);
  return { tone, time, rest: left < 0 ? `${shortDuration(left)} ${t('shared.time.ago')}` : shortDuration(left) };
}

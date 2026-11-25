import type { Task } from '@/shared/api/types';
import { formatDeadline, shortDuration } from '@/shared/lib/time';
import { t } from '@/shared/lib/texts';
import type { TimeTone } from '@/shared/ui';

const DAY = 864e5;

/** Тон і підписи часового чипа: колір = терміновість */
export function timeChipFor(task: Task, now = new Date()): { tone: TimeTone; time: string; rest?: string } {
  if (task.status === 'DONE' || task.status === 'CANCELLED') {
    const at = task.completedAt ?? task.deadline;
    return { tone: task.status === 'DONE' ? 'done' : 'calm', time: t(`tasks.status.${task.status}`), rest: formatDeadline(at) };
  }
  const left = new Date(task.deadline).getTime() - now.getTime();
  const time = formatDeadline(task.deadline);
  if (left < 0) return { tone: 'late', time, rest: `${shortDuration(left)} ${t('shared.time.ago')}` };
  return { tone: left < DAY ? 'soon' : 'calm', time, rest: shortDuration(left) };
}

import type { Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { GroupHeader } from '@/shared/ui';
import { groupTasks, type GroupId } from '../../lib/grouping';
import { TaskCard } from '../TaskCard/TaskCard';
import css from './TaskList.module.css';

const TONE = { late: 'late', today: 'today', upcoming: 'upcoming', done: 'done' } as const;

interface Props {
  tasks: Task[];
  base: string;
  selectedId?: string;
  compact?: boolean;
  /** приховані, поки чекають на «Скасувати» */
  hidden?: Set<string>;
  onSwipeDone?: (id: string) => void;
}

export const groupAnchor = (g: GroupId) => `group-${g}`;

/** Групи: прострочені → сьогодні → найближчі → завершені; контрольні вгорі кожної */
export function TaskList({ tasks, base, selectedId, compact, hidden, onSwipeDone }: Props) {
  const groups = groupTasks(tasks.filter((x) => !hidden?.has(x.id)));
  return (
    <div className={css.list}>
      {groups.map((g) => (
        <section key={g.id} id={groupAnchor(g.id)} className={css.group} aria-label={t(`tasks.groups.${g.id}`)}>
          <GroupHeader tone={TONE[g.id]} title={t(`tasks.groups.${g.id}`)} count={g.tasks.length} />
          {g.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              to={`${base}/t/${task.id}`}
              selected={task.id === selectedId}
              compact={compact}
              onSwipeDone={onSwipeDone && (() => onSwipeDone(task.id))}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

import type { Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { formatDeadline } from '@/shared/lib/time';
import { PersonLine } from '@/shared/ui';
import css from './TaskDetail.module.css';

export function PeoplePanel({ task }: { task: Task }) {
  return (
    <section className={css.panel} aria-label={t('tasks.detail.assignees')}>
      <PersonLine person={task.author} note={t('tasks.detail.author')} />
      {task.assignees.map((a) => (
        <PersonLine
          key={a.id}
          person={a}
          done={!!a.doneAt}
          note={a.doneAt ? t('tasks.detail.done_at', { time: formatDeadline(a.doneAt) }) : t('tasks.detail.executes')}
        />
      ))}
    </section>
  );
}

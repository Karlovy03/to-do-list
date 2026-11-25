import { useNavigate } from 'react-router-dom';
import { errorText } from '@/shared/api/errors';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { ControlSeal, ErrorState, IconButton, Loading, Tag, TimeChip } from '@/shared/ui';
import { useTask } from '../../hooks/useTasks';
import { shortName } from '../../lib/names';
import { timeChipFor } from '../../lib/timeTone';
import { ActionBar } from './ActionBar';
import { ControlPanel } from './ControlPanel';
import { PeoplePanel } from './PeoplePanel';
import { Timeline } from './Timeline';
import css from './TaskDetail.module.css';

/** Картка завдання: окремий екран на телефоні, права панель на Fold і комп'ютері */
export function TaskDetail({ id, back }: { id: string; back: string }) {
  const q = useTask(id);
  const wc = useWindowClass();
  const navigate = useNavigate();
  const phone = wc === 'xs' || wc === 'sm';

  if (q.isLoading) return <Loading />;
  if (!q.data) return <ErrorState message={q.error ? errorText(q.error) : t('tasks.detail.not_found')} onRetry={() => void q.refetch()} />;

  const task = q.data;
  const chip = timeChipFor(task);
  const controller = task.control?.controller;

  return (
    <article className={css.detail}>
      <div className={css.top}>
        {phone && (
          <IconButton icon="back" tone="glass" label={t('tasks.detail.back')} onClick={() => navigate(back)} />
        )}
        <span className={css.number}>{t('tasks.detail.number', { n: task.number })}</span>
      </div>

      <header className={css.head}>
        {task.control && <ControlSeal controller={controller ? shortName(controller.name) : undefined} />}
        <h1 className={css.title}>{task.title}</h1>
        <div className={css.tags}>
          <TimeChip tone={chip.tone} time={chip.time} rest={chip.rest} />
          {task.priority !== 'NORMAL' && <Tag tone={task.priority === 'URGENT' ? 'urgent' : 'info'}>{t(`tasks.priority.${task.priority}`)}</Tag>}
          {task.status !== 'DONE' && <Tag tone="neutral">{t(`tasks.status.${task.status}`)}</Tag>}
        </div>
        {task.description && <p className={css.desc}>{task.description}</p>}
      </header>

      {task.control && <ControlPanel control={task.control} />}
      <PeoplePanel task={task} />
      <Timeline task={task} />
      <ActionBar task={task} floating={phone} />
      <div className={css.spacer} />
    </article>
  );
}

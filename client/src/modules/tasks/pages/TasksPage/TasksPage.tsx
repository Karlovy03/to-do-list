import { useParams } from 'react-router-dom';
import { useSession } from '@/modules/auth';
import { errorText } from '@/shared/api/errors';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { Empty, ErrorState, LoadMore, Loading } from '@/shared/ui';
import type { Scope } from '../../api/tasks.api';
import { TaskDetail } from '../../components/TaskDetail/TaskDetail';
import { TaskList } from '../../components/TaskList/TaskList';
import { SCOPE_PATH, TasksHeader } from '../../components/TasksHeader/TasksHeader';
import { useDeferredDone } from '../../hooks/useDeferredDone';
import { useSummary, useTaskList } from '../../hooks/useTasks';
import css from './TasksPage.module.css';

const EMPTY: Record<Scope, string> = { mine: 'empty', controlled: 'empty_controlled', authored: 'empty_authored', all: 'empty' };

/**
 * Головний екран. Вибране завдання живе в адресі (…/t/:taskId), тож при складанні
 * й розкладанні Fold воно зберігається: на телефоні — окремий екран, ширше — поруч зі списком.
 */
export function TasksPage({ scope }: { scope: Scope }) {
  const { taskId } = useParams();
  const { me } = useSession();
  const wc = useWindowClass();
  const wide = wc === 'md' || wc === 'lg';
  const open = useTaskList({ scope, status: 'open' });
  const done = useTaskList({ scope, status: 'done' });
  const summary = useSummary();
  const deferred = useDeferredDone();
  const base = SCOPE_PATH[scope];

  if (!me) return null;
  if (taskId && !wide) return <div className={css.page}><TaskDetail id={taskId} back={base || '/'} /></div>;

  const tasks = [...open.items, ...done.items];
  const more = open.hasMore || done.hasMore;
  const loadMore = () => {
    if (open.hasMore) open.loadMore();
    if (done.hasMore) done.loadMore();
  };
  const list = open.isLoading ? (
    <Loading />
  ) : open.error ? (
    <ErrorState message={errorText(open.error)} onRetry={() => void open.refetch()} />
  ) : tasks.length === 0 ? (
    <Empty icon="inbox" title={t(`tasks.list.${EMPTY[scope]}`)} hint={scope === 'mine' ? t('tasks.list.empty_hint') : undefined} />
  ) : (
    <>
      <TaskList tasks={tasks} base={base} selectedId={taskId} compact={wc === 'xs'} hidden={deferred.pending} onSwipeDone={deferred.markDone} />
      {more && <LoadMore onClick={loadMore} busy={open.loadingMore || done.loadingMore} />}
    </>
  );

  return (
    <div className={wide ? `${css.page} ${css.split}` : css.page}>
      <div className={css.listCol}>
        <TasksHeader scope={scope} role={me.role} summary={summary.data} tasks={tasks} />
        {list}
      </div>
      {wide && (
        <div className={css.detailCol}>
          {taskId ? (
            <TaskDetail key={taskId} id={taskId} back={base || '/'} />
          ) : (
            <div className={css.emptyPane}>
              <Empty icon="list" title={t('tasks.detail.select_hint')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

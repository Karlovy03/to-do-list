import { useNavigate } from 'react-router-dom';
import type { Role, Summary, Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { formatLongDate } from '@/shared/lib/time';
import { Segmented } from '@/shared/ui';
import type { Scope } from '../../api/tasks.api';
import { groupAnchor } from '../TaskList/TaskList';
import { ControlSummary, FilterCapsules } from '../ControlSummary';
import { groupOf } from '../../lib/grouping';
import css from './TasksHeader.module.css';

export const SCOPE_PATH: Record<Scope, string> = { mine: '', controlled: '/control', authored: '/authored', all: '/all' };

/** Дата, великий заголовок, зведення контролю (лише «Мені») і вкладки */
export function TasksHeader({ scope, role, summary, tasks }: { scope: Scope; role: Role; summary?: Summary; tasks: Task[] }) {
  const navigate = useNavigate();
  const scopes: Scope[] = role === 'MEMBER' ? ['mine', 'controlled', 'authored'] : ['mine', 'controlled', 'authored', 'all'];
  const now = new Date();
  const nearest = tasks
    .filter((x) => x.control && groupOf(x, now) !== 'done' && !x.overdue)
    .map((x) => x.deadline)
    .sort()[0];
  const count = (g: 'late' | 'today') => tasks.filter((x) => groupOf(x, now) === g).length;

  const pick = (id: string) => document.getElementById(groupAnchor(id === 'all' ? 'late' : (id as 'late' | 'today')))?.scrollIntoView({ behavior: 'smooth' });

  return (
    <header className={css.header}>
      <div className={css.titles}>
        <p className={css.date}>{formatLongDate(now)}</p>
        <h1 className={css.title}>{t(`tasks.list.title_${scope}`)}</h1>
      </div>
      {scope === 'mine' && (
        <>
          <ControlSummary count={summary?.controlled ?? 0} nearest={nearest} />
          <FilterCapsules
            onPick={pick}
            items={[
              { id: 'late', label: t('tasks.summary.filter_late'), count: count('late'), tone: 'late' },
              { id: 'today', label: t('tasks.summary.filter_today'), count: count('today'), tone: 'today' },
              { id: 'all', label: t('tasks.summary.filter_all'), count: summary?.mine ?? 0, tone: 'all' },
            ]}
          />
        </>
      )}
      <Segmented<Scope>
        label={t('tasks.list.tabs_label')}
        value={scope}
        onChange={(s) => navigate(SCOPE_PATH[s] || '/')}
        options={scopes.map((s) => ({ value: s, label: t(`tasks.list.tab_${s}`), count: s === 'controlled' ? summary?.controlled : undefined }))}
      />
    </header>
  );
}

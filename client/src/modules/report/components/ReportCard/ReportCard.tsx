import { Link } from 'react-router-dom';
import type { Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { formatStamp } from '@/shared/lib/time';
import { assigneesText, controllerText, stateText } from '../../lib/report';
import css from './ReportCard.module.css';

/** «Довідка / Картка завдання» (Figma 107:375): телефон і Fold; прострочене — тлом, стан і термін — кольором */
export function ReportCard({ task, n }: { task: Task; n: number }) {
  const rows = [
    ['col_controller', controllerText(task)],
    ['col_assignees', assigneesText(task)],
    ['col_deadline', formatStamp(task.deadline)],
  ] as const;
  return (
    <article className={task.overdue ? `${css.card} ${css.late}` : css.card}>
      <header className={css.top}>
        <span className={css.no}>{t('report.report.number', { n })}</span>
        <span className={css.state}>{stateText(task)}</span>
      </header>
      <Link to={`/control/t/${task.id}`} className={css.title}>{task.title}</Link>
      <dl className={css.rows}>
        {rows.map(([key, value]) => (
          <div key={key} className={key === 'col_deadline' ? `${css.row} ${css.deadline}` : css.row}>
            <dt>{t(`report.report.${key}`)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

import { Link } from 'react-router-dom';
import type { Task } from '@/shared/api/types';
import { shortName } from '@/shared/lib/names';
import { t } from '@/shared/lib/texts';
import { formatFull } from '@/shared/lib/time';
import css from './ReportTable.module.css';

const COLS = ['no', 'task', 'controller', 'assignees', 'deadline', 'state'] as const;

function state(task: Task) {
  if (task.overdue) return t('tasks.status.overdue');
  return `${t(`tasks.status.${task.status}`)}, ${task.progress}%`;
}

function controller(task: Task) {
  const c = task.control?.controller;
  if (!c) return '';
  return c.position && c.kind !== 'text' ? `${shortName(c.name)}, ${c.position}` : c.name;
}

/** Таблиця для наради; на папері — без тіней і з повторюваною шапкою */
export function ReportTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className={css.wrap}>
      <table className={css.table}>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c} scope="col">{t(`report.report.col_${c}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <tr key={task.id} className={task.overdue ? css.late : undefined}>
              <td className={css.num}>{i + 1}</td>
              <td>
                <Link to={`/control/t/${task.id}`} className={css.task}>{task.title}</Link>
              </td>
              <td>{controller(task)}</td>
              <td>{task.assignees.map((a) => shortName(a.fullName)).join(', ')}</td>
              <td className={css.num}>{formatFull(task.deadline)}</td>
              <td className={css.state}>{state(task)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

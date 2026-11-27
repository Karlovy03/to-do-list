import { Link } from 'react-router-dom';
import type { Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { formatStamp } from '@/shared/lib/time';
import { assigneesText, controllerText, stateText } from '../../lib/report';
import css from './ReportTable.module.css';

const COLS = ['no', 'task', 'controller', 'assignees', 'deadline', 'state'] as const;

/** Таблиця для наради (Figma 10, 34): на комп'ютері й на папері; на папері — без тіней і з повторюваною шапкою */
export function ReportTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className={css.wrap}>
      <table className={css.table}>
        <colgroup>
          {COLS.map((c) => <col key={c} className={css[c]} />)}
        </colgroup>
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
                <Link to={`/control/t/${task.id}`} className={css.title}>{task.title}</Link>
              </td>
              <td>{controllerText(task)}</td>
              <td>{assigneesText(task)}</td>
              <td className={css.num}>{formatStamp(task.deadline)}</td>
              <td className={css.stateCell}>{stateText(task)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

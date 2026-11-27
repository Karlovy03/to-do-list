import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { formatStamp } from '@/shared/lib/time';
import { stateText, totals } from '../../lib/report';
import css from './ReportGlance.module.css';

const FIRST = 2;

/** Flip (Figma 33): підсумок одним блоком і два перші завдання — прострочені першими — та «та ще N ›», як у «В строю» */
export function ReportGlance({ tasks }: { tasks: Task[] }) {
  const [all, setAll] = useState(false);
  const sum = totals(tasks);
  const shown = all ? tasks : tasks.slice(0, FIRST);
  return (
    <>
      <section className={css.card}>
        <p className={css.total}>
          <b>{sum.total}</b> {t('report.report.total')}
        </p>
        <p className={css.split}>
          <span className={css.lateText}>{sum.overdue} {t('report.report.overdue')}</span>
          <span className={css.doneText}>{sum.in_time} {t('report.report.in_time')}</span>
        </p>
      </section>
      <section className={css.card}>
        {shown.map((task, i) => (
          <Link key={task.id} to={`/control/t/${task.id}`} className={css.item}>
            <span className={task.overdue ? `${css.meta} ${css.lateText}` : css.meta}>
              {t('report.report.number', { n: i + 1 })} · {task.overdue ? stateText(task) : t('report.report.until', { date: formatStamp(task.deadline) })}
            </span>
            <span className={css.title}>{task.title}</span>
          </Link>
        ))}
        {tasks.length > shown.length && (
          <button type="button" className={css.more} onClick={() => setAll(true)}>
            {t('report.report.more', { n: tasks.length - shown.length })} ›
          </button>
        )}
      </section>
    </>
  );
}

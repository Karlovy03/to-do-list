import { t } from '@/shared/lib/texts';
import type { totals } from '../../lib/report';
import css from './ReportTotals.module.css';

const TONE = { total: undefined, overdue: css.late, in_time: css.done } as const;

/** Три плитки підсумку; на папері — один рядок «На контролі 3 · прострочено 1 · у межах терміну 2» (Figma 34) */
export function ReportTotals({ sum }: { sum: ReturnType<typeof totals> }) {
  return (
    <>
      <div className={css.totals} data-print="hide">
        {(['total', 'overdue', 'in_time'] as const).map((key) => (
          <div key={key} className={css.total}>
            <b className={sum[key] > 0 ? TONE[key] : undefined}>{sum[key]}</b>
            <span>{t(`report.report.${key}`)}</span>
          </div>
        ))}
      </div>
      <p className={css.line} data-print="only">{t('report.report.summary', sum)}</p>
    </>
  );
}

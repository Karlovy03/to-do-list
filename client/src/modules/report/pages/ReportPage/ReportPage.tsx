import { useReport } from '@/modules/tasks';
import { errorText } from '@/shared/api/errors';
import { useNow } from '@/shared/hooks/useNow';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { formatAsOf } from '@/shared/lib/time';
import { Button, Empty, ErrorState, Loading, PageHeader } from '@/shared/ui';
import { ReportCard } from '../../components/ReportCard/ReportCard';
import { ReportGlance } from '../../components/ReportGlance/ReportGlance';
import { ReportTable } from '../../components/ReportTable/ReportTable';
import { ReportTotals } from '../../components/ReportTotals/ReportTotals';
import { sortReport, totals } from '../../lib/report';
import css from './ReportPage.module.css';

/**
 * Довідка для наради (Figma 10, 31–34): комп'ютер — таблиця; телефон і Fold — картки; Flip — короткий погляд.
 * На папері — завжди таблиця, з якого б екрана не друкували.
 */
export function ReportPage() {
  const list = useReport();
  const wc = useWindowClass();
  const now = useNow();
  const tasks = sortReport(list.data ?? []);
  const sum = totals(tasks);
  const flip = wc === 'xs';
  const table = wc === 'lg';

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow={
          flip ? undefined : (
            <>
              <span data-print="hide">{t('report.report.as_of')} {formatAsOf(now)}</span>
              <span data-print="only">{t('report.report.as_of')} {formatAsOf(now, true)}</span>
            </>
          )
        }
        title={t(flip ? 'report.report.title_short' : 'report.report.title')}
        actions={
          flip ? undefined : (
            <span data-print="hide">
              <Button variant="primary" icon="printer" onClick={() => window.print()}>
                {t('report.report.print')}
              </Button>
            </span>
          )
        }
      />
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
      ) : tasks.length === 0 ? (
        <Empty icon="shield" title={t('report.report.empty')} />
      ) : flip ? (
        <ReportGlance tasks={tasks} />
      ) : (
        <>
          <ReportTotals sum={sum} />
          {!table && (
            <div className={wc === 'md' ? `${css.cards} ${css.two}` : css.cards} data-print="hide">
              {tasks.map((task, i) => <ReportCard key={task.id} task={task} n={i + 1} />)}
            </div>
          )}
          <div data-print={table ? undefined : 'only'}>
            <ReportTable tasks={tasks} />
          </div>
        </>
      )}
    </div>
  );
}

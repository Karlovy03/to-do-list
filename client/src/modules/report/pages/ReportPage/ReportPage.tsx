import { useReport } from '@/modules/tasks';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { formatFull } from '@/shared/lib/time';
import { Button, Empty, ErrorState, Loading, PageHeader } from '@/shared/ui';
import { ReportTable } from '../../components/ReportTable/ReportTable';
import css from './ReportPage.module.css';

/** Довідка для наради: підсумок і таблиця відкритих завдань на контролі; друк або збереження в PDF */
export function ReportPage() {
  const list = useReport();
  const tasks = [...(list.data ?? [])].sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.deadline.localeCompare(b.deadline));
  const overdue = tasks.filter((x) => x.overdue).length;
  const totals = [
    { key: 'total', n: tasks.length },
    { key: 'overdue', n: overdue },
    { key: 'in_time', n: tasks.length - overdue },
  ];

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow={`${t('report.report.as_of')} ${formatFull(new Date())}`}
        title={t('report.report.title')}
        actions={
          <span data-print="hide">
            <Button variant="primary" icon="printer" onClick={() => window.print()}>
              {t('report.report.print')}
            </Button>
          </span>
        }
      />
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
      ) : tasks.length === 0 ? (
        <Empty icon="shield" title={t('report.report.empty')} />
      ) : (
        <>
          <div className={css.totals}>
            {totals.map((x) => (
              <div key={x.key} className={x.key === 'overdue' && x.n > 0 ? `${css.total} ${css.late}` : css.total}>
                <b>{x.n}</b>
                <span>{t(`report.report.${x.key}`)}</span>
              </div>
            ))}
          </div>
          <ReportTable tasks={tasks} />
        </>
      )}
    </div>
  );
}

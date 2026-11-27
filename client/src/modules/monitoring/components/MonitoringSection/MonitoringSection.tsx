import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorText } from '@/shared/api/errors';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { t } from '@/shared/lib/texts';
import { Chip, Chips, ErrorState, Loading } from '@/shared/ui';
import type { PersonRow, Range } from '../../api/monitoring.api';
import { usePeople, useServer } from '../../hooks/useMonitoring';
import { DailyBars } from '../DailyBars/DailyBars';
import { LineChart } from '../LineChart/LineChart';
import { MonitoringGlance } from '../MonitoringGlance/MonitoringGlance';
import { PeopleList } from '../PeopleList/PeopleList';
import { ServerBanner } from '../ServerBanner/ServerBanner';
import { ServerMetrics } from '../ServerMetrics/ServerMetrics';
import { SummaryTiles } from '../SummaryTiles/SummaryTiles';
import { VisitsSheet } from '../VisitsSheet/VisitsSheet';
import css from './MonitoringSection.module.css';

export type MonitoringView = 'visits' | 'server';

/** «Моніторинг» в «Адмініструванні» (Figma 49–55): «Відвідування · Сервер»; Flip — короткий погляд */
export function MonitoringSection({ view }: { view: MonitoringView }) {
  const wc = useWindowClass();
  const navigate = useNavigate();
  const people = usePeople();
  const [open, setOpen] = useState<string | null>(null);
  const openRow = open ? people.data?.items.find((r) => r.person.id === open) : undefined;
  const sheet = openRow && <VisitsSheet row={openRow} onClose={() => setOpen(null)} />;

  if (wc === 'xs')
    return (
      <div className={css.stack}>
        <MonitoringGlance onOpen={setOpen} />
        {sheet}
      </div>
    );
  return (
    <div className={css.stack}>
      <Chips>
        <Chip on={view === 'visits'} onClick={() => navigate('/admin/monitoring')}>{t('monitoring.page.visits')}</Chip>
        <Chip on={view === 'server'} onClick={() => navigate('/admin/monitoring/server')}>{t('monitoring.page.server')}</Chip>
      </Chips>
      {view === 'visits' ? <Visits wide={wc !== 'sm'} onOpen={(r) => setOpen(r.person.id)} /> : <Server columns={wc === 'lg' ? 3 : wc === 'md' ? 2 : 1} />}
      {sheet}
    </div>
  );
}

function Visits({ wide, onOpen }: { wide: boolean; onOpen: (r: PersonRow) => void }) {
  const q = usePeople();
  if (q.isLoading) return <Loading />;
  if (!q.data) return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;
  return (
    <>
      <SummaryTiles summary={q.data.summary} short={!wide} />
      <DailyBars daily={q.data.daily} short={!wide} />
      <PeopleList data={q.data} short={!wide} onOpen={onOpen} />
    </>
  );
}

function Server({ columns }: { columns: 1 | 2 | 3 }) {
  const [range, setRange] = useState<Range>('24h');
  const q = useServer(range);
  if (q.isLoading) return <Loading />;
  if (!q.data) return <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />;
  const h = q.data.history;
  return (
    <>
      <ServerBanner status={q.data} />
      <ServerMetrics status={q.data} columns={columns} />
      <div className={columns === 3 ? `${css.charts} ${css.two}` : css.charts}>
        <LineChart title={t('monitoring.server.mem_chart')} points={h.map((p) => ({ at: p.at, value: p.memUsedPct }))} thresholds={[{ pct: 85, level: 'warn' }, { pct: 93, level: 'bad' }]} range={range} onRange={setRange} />
        <LineChart title={t('monitoring.server.cpu_chart')} points={h.map((p) => ({ at: p.at, value: p.cpuPct }))} thresholds={[{ pct: 80, level: 'warn' }]} range={range} onRange={setRange} />
      </div>
    </>
  );
}

import { t } from '@/shared/lib/texts';
import { dayKey, formatTime } from '@/shared/lib/time';
import { ErrorState, LoadMore, Loading, Sheet } from '@/shared/ui';
import { errorText } from '@/shared/api/errors';
import type { PersonRow, Visit } from '../../api/monitoring.api';
import { useVisits } from '../../hooks/useMonitoring';
import { duration } from '../../lib/format';
import { DayStrip } from './DayStrip';
import css from './VisitsSheet.module.css';

const short = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', weekday: 'short', day: '2-digit', month: '2-digit' });
const dm = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit' });

function dayLabel(iso: string, now = new Date()) {
  const k = dayKey(new Date(iso));
  if (k === dayKey(now)) return t('monitoring.visits.today');
  if (k === dayKey(new Date(now.getTime() - 864e5))) return t('monitoring.visits.yesterday', { date: dm.format(new Date(iso)) });
  return short.format(new Date(iso));
}

/** Візити людини (Figma 53): дні за місяць смугою і список «коли — скільки»; поточний — «до зараз» */
export function VisitsSheet({ row, onClose }: { row: PersonRow; onClose: () => void }) {
  const q = useVisits(row.person.id);
  const first = q.first;
  const live = (v: Visit, i: number) => i === 0 && !!first?.online && Date.now() - Date.parse(v.lastAt) < 30 * 60_000;
  return (
    <Sheet title={row.person.fullName} onClose={onClose}>
      <p className={row.online ? `${css.who} ${css.on}` : css.who}>
        {row.online && <span className={css.dot} />}
        {[row.online ? t('monitoring.visits.online') : null, row.unitName, row.person.position].filter(Boolean).join(' · ')}
      </p>
      {q.isLoading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState message={errorText(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <>
          {first?.activeDays && <DayStrip days={first.activeDays} />}
          {q.items.length ? (
            <div className={css.list}>
              {q.items.map((v, i) => (
                <div key={v.startedAt} className={css.visit}>
                  <span className={css.when}>
                    <b>{dayLabel(v.startedAt)}</b>
                    <span>
                      {formatTime(v.startedAt)} – {live(v, i) ? t('monitoring.visits.now') : formatTime(v.lastAt)}
                    </span>
                  </span>
                  <span className={live(v, i) ? `${css.dur} ${css.liveDur}` : css.dur}>{duration(Date.parse(live(v, i) ? new Date().toISOString() : v.lastAt) - Date.parse(v.startedAt))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={css.note}>{t('monitoring.visits.empty')}</p>
          )}
          <p className={css.note}>{t('monitoring.visits.note')}</p>
          {q.hasMore && <LoadMore onClick={q.loadMore} busy={q.loadingMore} />}
        </>
      )}
    </Sheet>
  );
}

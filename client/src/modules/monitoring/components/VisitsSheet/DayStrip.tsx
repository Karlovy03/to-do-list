import { addDays, todayKey } from '@/shared/lib/days';
import { t } from '@/shared/lib/texts';
import css from './VisitsSheet.module.css';

const DAYS = 30;
const dm = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}`;

/** Смуга 30 днів: темна клітинка — день, коли людина заходила (Figma 53) */
export function DayStrip({ days }: { days: string[] }) {
  const today = todayKey();
  const on = new Set(days);
  const all = Array.from({ length: DAYS }, (_, i) => addDays(today, i - DAYS + 1));
  return (
    <div className={css.days}>
      <b>{t('monitoring.visits.days', { n: all.filter((d) => on.has(d)).length })}</b>
      <div className={css.strip} role="img" aria-label={`${t('monitoring.visits.strip_label')}: ${all.filter((d) => on.has(d)).map(dm).join(', ')}`}>
        {all.map((d) => <span key={d} className={on.has(d) ? css.cellOn : css.cell} />)}
      </div>
      <div className={css.ends} aria-hidden>
        <span>{dm(all[0])}</span>
        <span>{t('monitoring.people.chart_today')}</span>
      </div>
    </div>
  );
}

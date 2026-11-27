import { t } from '@/shared/lib/texts';
import type { PeopleOverview } from '../../api/monitoring.api';
import css from './SummaryTiles.module.css';

/** Плитки підсумку (Figma «Моніторинг / Плитка»): онлайн, сьогодні, за 7 днів, давно не заходили */
export function SummaryTiles({ summary, short }: { summary: PeopleOverview['summary']; short?: boolean }) {
  const tiles: [string, number, string][] = [
    [t('monitoring.people.online_now'), summary.online, t('monitoring.people.online_note')],
    [t(short ? 'monitoring.people.today_short' : 'monitoring.people.today'), summary.today, t('monitoring.people.today_note', { n: summary.total })],
    [t('monitoring.people.week'), summary.week, t('monitoring.people.week_note')],
    [t('monitoring.people.away'), summary.away, t('monitoring.people.away_note')],
  ];
  return (
    <div className={css.grid}>
      {tiles.map(([label, n, note]) => (
        <section key={label} className={css.tile}>
          <span className={css.label}>{label}</span>
          <b className={css.number}>{n}</b>
          <small className={css.note}>{note}</small>
        </section>
      ))}
    </div>
  );
}

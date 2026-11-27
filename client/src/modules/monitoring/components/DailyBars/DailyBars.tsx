import { t } from '@/shared/lib/texts';
import type { PeopleOverview } from '../../api/monitoring.api';
import css from './DailyBars.module.css';

const dm = (day: string) => `${Number(day.slice(8))}.${day.slice(5, 7)}`;
const weekdayFmt = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', timeZone: 'UTC' });

/** «Скільки людей заходило» за 30 днів (Figma 49, 51); сьогодні — блакитним */
export function DailyBars({ daily, short }: { daily: PeopleOverview['daily']; short?: boolean }) {
  const max = Math.max(1, ...daily.map((d) => d.people));
  const peak = daily.reduce((a, b) => (b.people > a.people ? b : a), daily[0]);
  const labels = short ? [0, daily.length - 1] : [0, 7, 14, 21, daily.length - 1];
  return (
    <section className={css.card}>
      <header className={css.head}>
        <h3 className={css.title}>{t(short ? 'monitoring.people.chart_title_short' : 'monitoring.people.chart_title')}</h3>
        {!short && peak && peak.people > 0 && (
          <small className={css.hint}>
            {t('monitoring.people.chart_peak', { n: peak.people, day: `${weekdayFmt.format(new Date(`${peak.day}T12:00:00Z`))} ${dm(peak.day)}` })}
          </small>
        )}
      </header>
      <div className={css.bars} role="img" aria-label={`${t('monitoring.people.chart_label')}: ${daily.map((d) => `${dm(d.day)} — ${d.people}`).join(', ')}`}>
        {daily.map((d, i) => (
          <span key={d.day} className={i === daily.length - 1 ? `${css.bar} ${css.today}` : css.bar} style={{ height: `${Math.max(3, (d.people / max) * 100)}%` }} />
        ))}
      </div>
      <div className={css.axis} aria-hidden>
        {labels.map((i) => (
          <span key={i} style={{ left: `${(i / (daily.length - 1)) * 100}%` }} className={i === daily.length - 1 ? css.last : undefined}>
            {i === daily.length - 1 ? t('monitoring.people.chart_today') : dm(daily[i].day)}
          </span>
        ))}
      </div>
    </section>
  );
}

import type { Unit } from '@/shared/api/types';
import { dayText } from '@/shared/lib/days';
import { t } from '@/shared/lib/texts';
import { formatAsOf } from '@/shared/lib/time';
import { returnDay } from '../../lib/absence';
import { byUnit, presentByUnit, type Strength } from '../../lib/strength';
import css from './StrengthPrint.module.css';

interface Props {
  strength: Strength;
  units: Unit[];
  unitName: string;
  sub: boolean;
  day: string;
  now: Date;
}

const COLS = ['unit', 'name', 'position', 'back'] as const;

/**
 * «Особовий склад» (Figma 36): лише на папері. Причина відсутності не друкується — лише дата, з якої людина
 * на службі: аркуш роздають на нараді, а вид відсутності — особисті дані (рішення власника, ADR-0020).
 */
export function StrengthPrint({ strength: s, units, unitName, sub, day, now }: Props) {
  const absent = byUnit(s.absent, units);
  const present = presentByUnit(s.present, units);
  const unitLine = sub ? t('absences.print.unit_sub', { unit: unitName }) : unitName;
  return (
    <section className={css.sheet} data-print="only">
      <header className={css.head}>
        <h1>{t('absences.print.title', { date: `${dayText(day)} ${day.slice(0, 4)}` })}</h1>
        <p>{unitLine} · {t('absences.print.formed', { date: formatAsOf(now, true) })}</p>
      </header>
      <p className={css.summary}>{t('absences.print.summary', { total: s.total, present: s.present.length, absent: s.absent.length })}</p>

      <h2>{t('absences.strength.absent')}</h2>
      {absent.length === 0 ? (
        <p>{t('absences.print.none_absent')}</p>
      ) : (
        <table className={css.table}>
          <thead>
            <tr>{COLS.map((c) => <th key={c} scope="col">{t(`absences.print.col_${c}`)}</th>)}</tr>
          </thead>
          <tbody>
            {absent.flatMap((g) => g.items.map(({ person, absence }) => (
              <tr key={absence.id}>
                <td>{g.unit.name}</td>
                <td>{person.fullName}</td>
                <td>{person.position}</td>
                <td>{dayText(returnDay(absence))}</td>
              </tr>
            )))}
          </tbody>
        </table>
      )}

      <h2>{t('absences.print.present_title', { n: s.present.length })}</h2>
      <p>
        {present.map((g) => `${g.unit.name}: ${g.people.map((p) => p.fullName).join(', ')}.`).join(' ')}
      </p>
      <footer className={css.foot}>{t('absences.print.footer')}</footer>
    </section>
  );
}

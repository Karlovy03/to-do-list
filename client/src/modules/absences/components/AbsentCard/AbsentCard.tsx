import { Fragment, useState } from 'react';
import type { Absence } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import type { byUnit } from '../../lib/strength';
import { AbsenceRow } from '../AbsenceRow/AbsenceRow';
import css from './AbsentCard.module.css';

interface Props {
  groups: ReturnType<typeof byUnit>;
  today: string;
  short?: boolean;
  /** Flip: двоє відсутніх і «та ще N ›» (правка власника) */
  compact?: boolean;
  inline?: boolean;
  onOpen: (a: Absence) => void;
}

const FLIP_ROWS = 2;

/** Відсутні за підрозділами: назва підрозділу, під нею люди з позначками */
export function AbsentCard({ groups, today, short, compact, inline, onOpen }: Props) {
  const [all, setAll] = useState(false);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  if (total === 0) return <p className={css.card}>{t('absences.strength.none_absent')}</p>;
  if (compact) {
    const items = groups.flatMap((g) => g.items);
    const shown = all ? items : items.slice(0, FLIP_ROWS);
    return (
      <div className={css.card}>
        {shown.map(({ absence }) => (
          <AbsenceRow key={absence.id} absence={absence} today={today} short compact onOpen={() => onOpen(absence)} />
        ))}
        {items.length > shown.length && (
          <button type="button" className={css.more} onClick={() => setAll(true)}>
            {t('absences.strength.and_more', { n: items.length - shown.length })} ›
          </button>
        )}
      </div>
    );
  }
  return (
    <div className={css.card}>
      {groups.map((g) => (
        <Fragment key={g.unit.id}>
          <h3 className={css.unit}>{g.unit.name}</h3>
          {g.items.map(({ absence }) => (
            <AbsenceRow key={absence.id} absence={absence} today={today} short={short} inline={inline} onOpen={() => onOpen(absence)} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

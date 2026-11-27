import type { Absence } from '@/shared/api/types';
import { shortName } from '@/shared/lib/names';
import { Avatar } from '@/shared/ui';
import { AbsenceBadge } from '../AbsenceBadge/AbsenceBadge';
import css from './AbsenceRow.module.css';

interface Props {
  absence: Absence;
  today: string;
  /** Fold і Flip: «до 28.11» */
  short?: boolean;
  /** Flip: «Бондар А.» без посади */
  compact?: boolean;
  /** комп'ютер: позначка праворуч, а не під прізвищем */
  inline?: boolean;
  onOpen: () => void;
}

/** Людина з позначкою відсутності; натиск — аркуш відсутності */
export function AbsenceRow({ absence: a, today, short, compact, inline, onOpen }: Props) {
  return (
    <button type="button" className={inline ? `${css.row} ${css.inline}` : css.row} onClick={onOpen}>
      <Avatar person={a.person} large={!compact} />
      <span className={css.text}>
        <span className={css.name}>{compact ? shortName(a.person.fullName) : a.person.fullName}</span>
        {!compact && <small className={css.position}>{a.person.position}</small>}
      </span>
      <span className={css.badge}>
        <AbsenceBadge absence={a} today={today} short={short} />
      </span>
    </button>
  );
}

import { Link } from 'react-router-dom';
import type { AbsenceKind } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import { KINDS } from '../../lib/absence';
import css from './StrengthLine.module.css';

interface Props {
  present: number;
  total: number;
  byKind: Record<AbsenceKind, number>;
  /** куди веде — «В строю» на той самий день і підрозділ */
  to: string;
}

const TONE = { VACATION: css.vacation, SICK_LEAVE: css.sick, FAMILY: css.family } as const;

/** «В строю 2 з 3 · лікарняний 1 ›» над сіткою «Дня» (Figma 26): коротко, а подробиці — в «В строю» */
export function StrengthLine({ present, total, byKind, to }: Props) {
  return (
    <Link to={to} className={css.line}>
      <Icon name="users" size={18} />
      <span className={css.text}>
        <b>{t('absences.strength.progress', { present, total })}</b>
        {KINDS.filter((k) => byKind[k] > 0).map((k) => (
          <span key={k} className={TONE[k]}>
            {' · '}
            {t(`absences.kind.${k}_lower`)} {byKind[k]}
          </span>
        ))}
      </span>
      <Icon name="chevron" size={18} />
    </Link>
  );
}

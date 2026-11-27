import type { Absence } from '@/shared/api/types';
import { absenceLabel } from '../../lib/absence';
import css from './AbsenceBadge.module.css';

const TONE = { VACATION: css.vacation, SICK_LEAVE: css.sick, FAMILY: css.family } as const;

/** Позначка відсутності (Figma «Відсутність / Позначка»): вид і коли; тон — за видом */
export function AbsenceBadge({ absence, today, short }: { absence: Absence; today: string; short?: boolean }) {
  return (
    <span className={`${css.badge} ${TONE[absence.kind]}`}>
      <span className={css.dot} aria-hidden="true" />
      {absenceLabel(absence, today, short)}
    </span>
  );
}

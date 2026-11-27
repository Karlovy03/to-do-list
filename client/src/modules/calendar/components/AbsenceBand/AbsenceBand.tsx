import { absenceLabel } from '@/modules/absences';
import { todayKey } from '@/shared/lib/days';
import type { CalAbsence } from '../../api/calendar.api';
import css from './AbsenceBand.module.css';

const TONE = { VACATION: css.vacation, SICK_LEAVE: css.sick, FAMILY: css.family } as const;

/** Відсутність у рядку сітки (Figma 26): пунктир на всю доріжку, тон — за видом; доручати не заважає */
export function AbsenceBand({ absence: a }: { absence: CalAbsence }) {
  return (
    <div className={`${css.band} ${TONE[a.absenceKind]}`}>
      {absenceLabel({ kind: a.absenceKind, startDay: a.startDay, endDay: a.endDay }, todayKey())}
    </div>
  );
}

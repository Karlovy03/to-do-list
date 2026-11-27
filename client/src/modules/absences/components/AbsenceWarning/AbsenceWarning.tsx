import type { Person } from '@/shared/api/types';
import { todayKey } from '@/shared/lib/days';
import { shortName } from '@/shared/lib/names';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import { useUpcomingAbsences } from '../../hooks/useAbsences';
import { absenceWhen, deadlineHits } from '../../lib/absence';
import css from './AbsenceWarning.module.css';

interface Props {
  people: Person[];
  /** обрані виконавці */
  ids: string[];
  deadline: Date | null;
}

/**
 * Термін припадає на відсутність виконавця (Figma 27): попередження, а не заборона — доручити можна (ADR-0019).
 * Нічого не показує, коли збігів немає.
 */
export function AbsenceWarning({ people, ids, deadline }: Props) {
  const absences = useUpcomingAbsences().data ?? [];
  if (!deadline) return null;
  const today = todayKey();
  const hits = deadlineHits(absences, ids, deadline).flatMap((a) => {
    const person = people.find((p) => p.id === a.person.id);
    return person ? [{ person, a }] : [];
  });
  if (hits.length === 0) return null;
  return (
    <div className={css.warning} role="note">
      <Icon name="alert" size={20} />
      <p>
        {hits.map(({ person, a }) => (
          <span key={a.id} className={css.line}>
            {t('absences.warn.line', { name: shortName(person.fullName), state: t(`absences.kind.${a.kind}_state`), when: absenceWhen(a, today) })}
          </span>
        ))}
        {t('absences.warn.can')}
      </p>
    </div>
  );
}

import { useCallback } from 'react';
import type { Person } from '@/shared/api/types';
import { todayKey } from '@/shared/lib/days';
import { AbsenceBadge } from '../components/AbsenceBadge/AbsenceBadge';
import { absenceOf } from '../lib/absence';
import { useUpcomingAbsences } from './useAbsences';

/** Позначка під людиною у виборі виконавців (Figma 27): хто зараз відсутній і до коли */
export function useAbsenceMark() {
  const absences = useUpcomingAbsences().data;
  const today = todayKey();
  return useCallback(
    (p: Person) => {
      const a = absenceOf(absences ?? [], p.id, today);
      return a ? <AbsenceBadge absence={a} today={today} /> : null;
    },
    [absences, today],
  );
}

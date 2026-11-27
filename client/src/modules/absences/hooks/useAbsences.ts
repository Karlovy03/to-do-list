import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { addDays, todayKey } from '@/shared/lib/days';
import { absenceKeys, absencesApi } from '../api/absences.api';

export const useAbsences = (from: string, to: string) =>
  useQuery({
    queryKey: absenceKeys.range(from, to),
    queryFn: () => absencesApi.list(from, to),
    // інший день у «В строю» — поки вантажиться, видно попередній, а не порожнечу
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

/** Рік наперед від сьогодні: «мої відсутності», позначки й попередження при дорученні — один запит на всіх */
export function useUpcomingAbsences() {
  const today = todayKey();
  return useAbsences(today, addDays(today, 365));
}

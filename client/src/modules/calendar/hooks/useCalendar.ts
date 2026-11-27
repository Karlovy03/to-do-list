import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { Me } from '@/shared/api/types';
import { calendarApi, calendarKeys } from '../api/calendar.api';
import { rangeQuery, readParams, writeParams, type CalendarParams } from '../lib/params';

/** Режим, день і «кого показати» — з адреси; дані — за період у межах видимості */
export function useCalendar(me: Me) {
  const [sp, setSp] = useSearchParams();
  const params = readParams(sp, me);
  const query = rangeQuery(params);
  const data = useQuery({
    queryKey: calendarKeys.range(query),
    queryFn: () => calendarApi.range(query),
    // поки вантажиться інший день, сітка показує попередній, а не порожнечу
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const set = (next: Partial<CalendarParams>) => setSp(writeParams({ ...params, ...next }));
  return { params, set, search: sp.toString(), data };
}

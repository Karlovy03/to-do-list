import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { Me } from '@/shared/api/types';
import { placeOrRemembered, rememberPlace } from '@/shared/lib/deviceMemory';
import { useRefetchInterval } from '@/shared/live/LiveContext';
import { calendarApi, calendarKeys } from '../api/calendar.api';
import { rangeQuery, readParams, writeParams, type CalendarParams } from '../lib/params';

/** Режим, день і «кого показати» — з адреси, а з меню (порожня адреса) — останній вибір без дня (ADR-0022) */
export function useCalendar(me: Me) {
  const [url, setSp] = useSearchParams();
  const sp = placeOrRemembered(url, me.id, 'calendar');
  const params = readParams(sp, me);
  const query = rangeQuery(params);
  const data = useQuery({
    queryKey: calendarKeys.range(query),
    queryFn: () => calendarApi.range(query),
    // поки вантажиться інший день, сітка показує попередній, а не порожнечу
    placeholderData: keepPreviousData,
    refetchInterval: useRefetchInterval(60_000),
  });
  const set = (next: Partial<CalendarParams>) => {
    const written = writeParams({ ...params, ...next });
    rememberPlace(me.id, 'calendar', written);
    setSp(written);
  };
  return { params, set, search: sp.toString(), data };
}

import { useQuery } from '@tanstack/react-query';
import { useOffsetPages } from '@/shared/hooks/useOffsetPages';
import { useRefetchInterval } from '@/shared/live/LiveContext';
import { monitoringApi, monitoringKeys, type Range } from '../api/monitoring.api';

/** «Відвідування»: онлайн приходить живим сигналом presence; страховка — раз на хвилину */
export const usePeople = () =>
  useQuery({ queryKey: monitoringKeys.people, queryFn: monitoringApi.people, refetchInterval: useRefetchInterval(60_000) });

export const useVisits = (id: string) =>
  useOffsetPages({ queryKey: monitoringKeys.visits(id), fetchPage: (offset) => monitoringApi.visits(id, offset) });

/** «Сервер» — раз на 30 с, поки сторінка відкрита (у фоновій вкладці не опитуємо) */
export const SERVER_REFRESH_MS = 30_000;
export const useServer = (range: Range) =>
  useQuery({ queryKey: monitoringKeys.server(range), queryFn: () => monitoringApi.server(range), refetchInterval: SERVER_REFRESH_MS, placeholderData: (prev) => prev });

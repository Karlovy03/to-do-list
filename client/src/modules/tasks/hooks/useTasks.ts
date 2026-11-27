import { useQuery } from '@tanstack/react-query';
import { useOffsetPages } from '@/shared/hooks/useOffsetPages';
import { useRefetchInterval } from '@/shared/live/LiveContext';
import { taskKeys, tasksApi, type ListParams } from '../api/tasks.api';

/** Живий потік (ADR-0021) оновлює одразу; опитування — страховка: 5 хв із потоком, 60 с без нього */
export const useTaskList = (p: ListParams) =>
  useOffsetPages({ queryKey: taskKeys.list(p), fetchPage: (offset) => tasksApi.list(p, offset), refetchInterval: useRefetchInterval(60_000) });
export const useSummary = () => useQuery({ queryKey: taskKeys.summary, queryFn: tasksApi.summary, refetchInterval: useRefetchInterval(60_000) });
export const useReport = () => useQuery({ queryKey: taskKeys.report, queryFn: tasksApi.report });
export const useTask = (id: string | undefined) =>
  useQuery({ queryKey: taskKeys.detail(id ?? ''), queryFn: () => tasksApi.get(id!), enabled: !!id });
/** Старіші записи журналу — після тих, що прийшли разом із карткою */
export const useOlderUpdates = (id: string, startAt: number, enabled: boolean) =>
  useOffsetPages({ queryKey: [...taskKeys.updates(id), startAt], fetchPage: (offset) => tasksApi.updates(id, offset), startAt, enabled });

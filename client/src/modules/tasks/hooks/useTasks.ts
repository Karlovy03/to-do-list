import { useQuery } from '@tanstack/react-query';
import { taskKeys, tasksApi, type ListParams } from '../api/tasks.api';

export const useTaskList = (p: ListParams) => useQuery({ queryKey: taskKeys.list(p), queryFn: () => tasksApi.list(p), refetchInterval: 60_000 });
export const useSummary = () => useQuery({ queryKey: taskKeys.summary, queryFn: tasksApi.summary, refetchInterval: 60_000 });
export const useTask = (id: string | undefined) =>
  useQuery({ queryKey: taskKeys.detail(id ?? ''), queryFn: () => tasksApi.get(id!), enabled: !!id });

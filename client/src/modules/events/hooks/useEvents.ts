import { useQuery } from '@tanstack/react-query';
import { useOffsetPages } from '@/shared/hooks/useOffsetPages';
import { eventKeys, eventsApi, type When } from '../api/events.api';

export const useEventList = (when: When) =>
  useOffsetPages({ queryKey: eventKeys.list(when), fetchPage: (offset) => eventsApi.list(when, offset), refetchInterval: 60_000 });

export const useEvent = (id: string | undefined) =>
  useQuery({ queryKey: eventKeys.detail(id ?? ''), queryFn: () => eventsApi.get(id!), enabled: !!id });

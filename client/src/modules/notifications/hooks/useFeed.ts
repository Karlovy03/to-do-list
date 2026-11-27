import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOffsetPages } from '@/shared/hooks/useOffsetPages';
import { useRefetchInterval } from '@/shared/live/LiveContext';
import { notificationKeys, notificationsApi } from '../api/notifications.api';

/** Стрічка сповіщень: одразу — з живого потоку (ADR-0021), страховка — опитування й повернення у вкладку */
export const useFeed = () => useQuery({ queryKey: notificationKeys.feed, queryFn: () => notificationsApi.feed(), refetchInterval: useRefetchInterval(60_000) });

export const useUnread = () => useFeed().data?.unread ?? 0;

/** Уся стрічка сторінками — для екрана сповіщень */
export const useFeedPages = () =>
  useOffsetPages({ queryKey: [...notificationKeys.feed, 'pages'], fetchPage: (offset) => notificationsApi.feed(offset), refetchInterval: useRefetchInterval(60_000) });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids?: string[]) => notificationsApi.markRead(ids), onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.feed }) });
}

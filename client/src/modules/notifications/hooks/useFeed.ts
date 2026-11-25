import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationKeys, notificationsApi } from '../api/notifications.api';

/** Стрічка сповіщень; оновлюється щохвилини і при поверненні у вкладку */
export const useFeed = () => useQuery({ queryKey: notificationKeys.feed, queryFn: () => notificationsApi.feed(), refetchInterval: 60_000 });

export const useUnread = () => useFeed().data?.unread ?? 0;

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (ids?: string[]) => notificationsApi.markRead(ids), onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.feed }) });
}

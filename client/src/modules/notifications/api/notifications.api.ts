import { api } from '@/shared/api/client';
import type { Feed } from '@/shared/api/types';

export const notificationKeys = { feed: ['notifications'] as const };

export const notificationsApi = {
  feed: (offset = 0) => api<Feed>('/notifications', { query: { offset } }),
  markRead: (ids?: string[]) => api<{ ok: true }>('/notifications/read', { method: 'POST', body: { ids } }),
};

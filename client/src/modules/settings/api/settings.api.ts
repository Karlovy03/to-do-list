import { api } from '@/shared/api/client';
import type { Me, Prefs } from '@/shared/api/types';

export const profileApi = {
  prefs: (prefs: Prefs) => api<Me>('/profile/prefs', { method: 'PUT', body: prefs }),
  password: (current: string, next: string) => api<{ ok: true; token?: string }>('/profile/password', { method: 'PUT', body: { current, next } }),
};

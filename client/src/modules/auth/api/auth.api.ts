import { api } from '@/shared/api/client';
import type { Me } from '@/shared/api/types';

export const authKeys = { me: ['me'] as const };

export const authApi = {
  me: () => api<Me>('/auth/me'),
  login: (login: string, password: string) => api<Me>('/auth/login', { method: 'POST', body: { login, password } }),
  logout: (device: { pushEndpoint?: string; deviceToken?: string }) => api<{ ok: true }>('/auth/logout', { method: 'POST', body: device }),
  logoutEverywhere: () => api<{ ok: true }>('/auth/logout-everywhere', { method: 'POST', body: {} }),
};

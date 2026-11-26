import { api } from '@/shared/api/client';
import type { Me } from '@/shared/api/types';

export const authKeys = { me: ['me'] as const };

export const authApi = {
  me: () => api<Me>('/auth/me'),
  login: (login: string, password: string) => api<Me>('/auth/login', { method: 'POST', body: { login, password } }),
  logout: () => api<{ ok: true }>('/auth/logout', { method: 'POST', body: {} }),
};

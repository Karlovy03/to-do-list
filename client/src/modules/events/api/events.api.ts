import { api } from '@/shared/api/client';
import type { AppEvent, Page } from '@/shared/api/types';

export type When = 'upcoming' | 'past';

export interface EventInput {
  title: string;
  description: string;
  startsAt: string;
  durationMin: number;
  participantIds: string[];
}

/** Зміна заходу: лише ті поля, що змінилися */
export type EventChanges = Partial<EventInput>;

export const eventKeys = {
  all: ['events'] as const,
  list: (when: When) => ['events', 'list', when] as const,
  detail: (id: string) => ['events', 'detail', id] as const,
};

export const eventsApi = {
  list: (when: When, offset = 0) => api<Page<AppEvent>>('/events', { query: { when, offset } }),
  get: (id: string) => api<AppEvent>(`/events/${id}`),
  create: (input: EventInput) => api<AppEvent>('/events', { method: 'POST', body: input }),
  update: (id: string, changes: EventChanges) => api<AppEvent>(`/events/${id}`, { method: 'PATCH', body: changes }),
  cancel: (id: string, reason = '') => api<AppEvent>(`/events/${id}/cancel`, { method: 'POST', body: { reason } }),
  remove: (id: string) => api<void>(`/events/${id}`, { method: 'DELETE' }),
};

import { api } from '@/shared/api/client';
import type { ControlInput, Page, Priority, Summary, Task, TaskDetail, TaskUpdate } from '@/shared/api/types';

export type Scope = 'mine' | 'controlled' | 'authored' | 'all';
export interface ListParams {
  scope: Scope;
  status: 'open' | 'done' | 'all';
  q?: string;
}

export interface NewTask {
  title: string;
  description?: string;
  priority: Priority;
  deadline: string;
  assigneeIds: string[];
  control?: ControlInput | null;
}

export const taskKeys = {
  all: ['tasks'] as const,
  list: (p: ListParams) => ['tasks', 'list', p] as const,
  summary: ['tasks', 'summary'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};

function post<T>(path: string, body: unknown = {}) {
  return api<T>(path, { method: 'POST', body });
}

export const tasksApi = {
  list: (p: ListParams) => api<Page<Task>>('/tasks', { query: { scope: p.scope, status: p.status, q: p.q } }),
  summary: () => api<Summary>('/tasks/summary'),
  get: (id: string) => api<TaskDetail>(`/tasks/${id}`),
  updates: (id: string, offset: number) => api<Page<TaskUpdate>>(`/tasks/${id}/updates`, { query: { offset } }),
  create: (input: NewTask) => post<Task>('/tasks', input),
  addNote: (id: string, input: { text: string; progress?: number }) => post<Task>(`/tasks/${id}/notes`, input),
  start: (id: string) => post<Task>(`/tasks/${id}/start`),
  done: (id: string, comment = '') => post<Task>(`/tasks/${id}/done`, { comment }),
  returnBack: (id: string, comment: string, deadline?: string) => post<Task>(`/tasks/${id}/return`, { comment, deadline }),
  close: (id: string, comment: string) => post<Task>(`/tasks/${id}/close`, { comment }),
  cancel: (id: string, comment = '') => post<Task>(`/tasks/${id}/cancel`, { comment }),
  reopen: (id: string, deadline?: string) => post<Task>(`/tasks/${id}/reopen`, { deadline }),
  snooze: (id: string, minutes = 120) => post<{ until: string }>(`/tasks/${id}/snooze`, { minutes }),
  setControl: (id: string, input: ControlInput) => post<Task>(`/tasks/${id}/control`, input),
  removeControl: (id: string, reason = '') => post<Task>(`/tasks/${id}/control/remove`, { reason }),
};

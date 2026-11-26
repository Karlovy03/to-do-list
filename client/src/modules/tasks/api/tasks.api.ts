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

/** Зміна завдання: лише ті поля, що змінилися */
export interface TaskChanges {
  title?: string;
  description?: string;
  priority?: Priority;
  deadline?: string;
  assigneeIds?: string[];
}

export const taskKeys = {
  all: ['tasks'] as const,
  list: (p: ListParams) => ['tasks', 'list', p] as const,
  summary: ['tasks', 'summary'] as const,
  report: ['tasks', 'report'] as const,
  updates: (id: string) => ['tasks', 'detail', id, 'updates'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
};

function post<T>(path: string, body: unknown = {}, keepalive?: boolean) {
  return api<T>(path, { method: 'POST', body, keepalive });
}

export const tasksApi = {
  list: (p: ListParams, offset = 0) => api<Page<Task>>('/tasks', { query: { scope: p.scope, status: p.status, q: p.q, offset } }),
  report: () => api<Task[]>('/tasks/report'),
  summary: () => api<Summary>('/tasks/summary'),
  get: (id: string) => api<TaskDetail>(`/tasks/${id}`),
  updates: (id: string, offset: number) => api<Page<TaskUpdate>>(`/tasks/${id}/updates`, { query: { offset } }),
  create: (input: NewTask) => post<Task>('/tasks', input),
  update: (id: string, changes: TaskChanges) => api<Task>(`/tasks/${id}`, { method: 'PATCH', body: changes }),
  remove: (id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
  addNote: (id: string, input: { text: string; progress?: number }) => post<Task>(`/tasks/${id}/notes`, input),
  start: (id: string) => post<Task>(`/tasks/${id}/start`),
  done: (id: string, comment = '', keepalive?: boolean) => post<Task>(`/tasks/${id}/done`, { comment }, keepalive),
  returnBack: (id: string, comment: string, deadline?: string) => post<Task>(`/tasks/${id}/return`, { comment, deadline }),
  close: (id: string, comment: string) => post<Task>(`/tasks/${id}/close`, { comment }),
  cancel: (id: string, comment = '') => post<Task>(`/tasks/${id}/cancel`, { comment }),
  reopen: (id: string, deadline?: string) => post<Task>(`/tasks/${id}/reopen`, { deadline }),
  snooze: (id: string, minutes = 120) => post<{ until: string }>(`/tasks/${id}/snooze`, { minutes }),
  setControl: (id: string, input: ControlInput) => post<Task>(`/tasks/${id}/control`, input),
  removeControl: (id: string, reason = '') => post<Task>(`/tasks/${id}/control/remove`, { reason }),
};

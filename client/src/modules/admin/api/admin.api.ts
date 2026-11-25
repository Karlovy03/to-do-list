import { api } from '@/shared/api/client';
import type { DirectoryPerson, Person, ReminderSettings, Role } from '@/shared/api/types';

export interface UserInput {
  login: string;
  fullName: string;
  position: string;
  role: Role;
  password?: string;
  isActive?: boolean;
}

export type PersonInput = Pick<DirectoryPerson, 'fullName' | 'position' | 'organization'> & { isActive?: boolean };

export const adminKeys = {
  users: ['admin', 'users'] as const,
  directory: ['admin', 'directory'] as const,
  settings: ['admin', 'settings'] as const,
};

export const adminApi = {
  users: () => api<Person[]>('/users', { query: { all: '1' } }),
  createUser: (v: UserInput) => api<Person>('/users', { method: 'POST', body: v }),
  updateUser: (id: string, v: Partial<UserInput>) => api<Person>(`/users/${id}`, { method: 'PATCH', body: v }),
  directory: () => api<DirectoryPerson[]>('/directory', { query: { all: '1' } }),
  createPerson: (v: PersonInput) => api<DirectoryPerson>('/directory', { method: 'POST', body: v }),
  updatePerson: (id: string, v: Partial<PersonInput>) => api<DirectoryPerson>(`/directory/${id}`, { method: 'PATCH', body: v }),
  settings: () => api<ReminderSettings>('/settings'),
  saveSettings: (v: ReminderSettings) => api<ReminderSettings>('/settings', { method: 'PUT', body: v }),
};

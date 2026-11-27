import { api } from '@/shared/api/client';
import type { Absence, AbsenceKind } from '@/shared/api/types';

export interface AbsenceInput {
  /** кому; без — собі */
  userId?: string;
  kind: AbsenceKind;
  startDay: string;
  endDay: string;
}

export type AbsenceChanges = Partial<Omit<AbsenceInput, 'userId'>>;

export const absenceKeys = {
  all: ['absences'] as const,
  range: (from: string, to: string) => ['absences', from, to] as const,
};

export const absencesApi = {
  list: (from: string, to: string) => api<Absence[]>('/absences', { query: { from, to } }),
  create: (input: AbsenceInput) => api<Absence>('/absences', { method: 'POST', body: input }),
  update: (id: string, changes: AbsenceChanges) => api<Absence>(`/absences/${id}`, { method: 'PATCH', body: changes }),
  remove: (id: string) => api<void>(`/absences/${id}`, { method: 'DELETE' }),
  /** «Вийшов на службу»: скорочує до вчора або знімає, якщо ще не почалась */
  end: (id: string) => api<Absence | undefined>(`/absences/${id}/end`, { method: 'POST', body: {} }),
};

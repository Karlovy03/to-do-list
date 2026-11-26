import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { DirectoryPerson, Person, Unit } from './types';

/** Колеги і довідник контролерів — потрібні завданням, контролю й адмінці */
export const peopleKeys = { users: ['users'] as const, directory: ['directory'] as const, units: ['units'] as const };

export const usePeople = () => useQuery({ queryKey: peopleKeys.users, queryFn: () => api<Person[]>('/users'), staleTime: 5 * 60_000 });
export const useDirectory = () =>
  useQuery({ queryKey: peopleKeys.directory, queryFn: () => api<DirectoryPerson[]>('/directory'), staleTime: 5 * 60_000 });
export const useUnits = () => useQuery({ queryKey: peopleKeys.units, queryFn: () => api<Unit[]>('/units'), staleTime: 5 * 60_000 });

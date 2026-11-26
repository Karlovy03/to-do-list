import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { ReminderSettings } from './types';

/** Загальні налаштування нагадувань: читають усі (заходи — «нагадаємо за N хв»), змінює адміністратор */
export const settingsKey = ['settings'] as const;

export const useReminderSettings = () =>
  useQuery({ queryKey: settingsKey, queryFn: () => api<ReminderSettings>('/settings'), staleTime: 5 * 60_000 });

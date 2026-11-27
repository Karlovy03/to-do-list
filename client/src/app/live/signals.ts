import type { QueryKey } from '@tanstack/react-query';
import { absenceKeys } from '@/modules/absences';
import { calendarKeys } from '@/modules/calendar';
import { eventKeys } from '@/modules/events';
import { notificationKeys } from '@/modules/notifications';
import { taskKeys } from '@/modules/tasks';
import { templateKeys } from '@/modules/templates';
import { monitoringKeys } from '@/modules/monitoring';

export type LiveTopic = 'task' | 'event' | 'absence' | 'template' | 'presence' | 'feed';
export interface LiveSignal {
  t: LiveTopic;
  id?: string;
}

/** Сигнал → що перечитати (ADR-0021). Перечитуються лише показані зараз дані — решта стає застарілою до першого показу */
export function keysFor(s: LiveSignal): QueryKey[] {
  switch (s.t) {
    case 'task':
      return [taskKeys.all, calendarKeys.all];
    case 'event':
      return [eventKeys.all, calendarKeys.all];
    case 'absence':
      return [absenceKeys.all, calendarKeys.all];
    case 'template':
      return [templateKeys.all];
    case 'presence':
      // хто онлайн — лише адміністраторам (ADR-0024); стан сервера оновлюється сам раз на 30 с
      return [monitoringKeys.people, ['monitoring', 'visits']];
    case 'feed':
      return [notificationKeys.feed];
  }
}

const TOPICS: readonly string[] = ['task', 'event', 'absence', 'template', 'presence', 'feed'];

/** Дані потоку — з мережі: невідоме чи зіпсоване ігнорується */
export function readSignal(data: string): LiveSignal | null {
  try {
    const v: unknown = JSON.parse(data);
    if (typeof v !== 'object' || v === null) return null;
    const { t, id } = v as Record<string, unknown>;
    if (typeof t !== 'string' || !TOPICS.includes(t)) return null;
    return { t: t as LiveTopic, id: typeof id === 'string' ? id : undefined };
  } catch {
    return null;
  }
}

const DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000];

/** Пауза перед повторним підключенням: 1 → 2 → 5 → 10 → 30 с, плюс до секунди випадково — щоб після деплою всі не стукали разом */
export const retryDelay = (attempt: number, rnd = Math.random()) => DELAYS[Math.min(attempt, DELAYS.length - 1)] + Math.round(rnd * 1_000);

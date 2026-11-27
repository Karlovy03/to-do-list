import { api } from '@/shared/api/client';
import type { EventStatus, Person, Priority, TaskStatus } from '@/shared/api/types';

/** Смуга завдання (див. server/src/modules/calendar/calendar.serializer.ts) */
export interface CalTask {
  kind: 'task';
  id: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  deadline: string;
  completedAt: string | null;
  controlled: boolean;
  /** кого з показаних людей стосується */
  personIds: string[];
}

export interface CalEvent {
  kind: 'event';
  id: string;
  title: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  personIds: string[];
}

export type CalItem = CalTask | CalEvent;

export interface CalendarData {
  from: string;
  to: string;
  people: Person[];
  items: CalItem[];
}

export interface RangeQuery {
  from: string;
  to: string;
  unit?: string;
  sub?: '0' | '1';
  person?: string;
}

export const calendarKeys = {
  all: ['calendar'] as const,
  range: (q: RangeQuery) => ['calendar', q] as const,
};

export const calendarApi = {
  range: (q: RangeQuery) => api<CalendarData>('/calendar', { query: { ...q } }),
};

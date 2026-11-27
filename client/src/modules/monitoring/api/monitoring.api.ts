import { api } from '@/shared/api/client';
import type { Page, Person } from '@/shared/api/types';

export interface PersonRow {
  person: Person;
  unitName: string | null;
  online: boolean;
  lastAt: string | null;
  visits30: number;
  days30: number;
}

export interface PeopleOverview {
  items: PersonRow[];
  summary: { total: number; online: number; today: number; week: number; away: number };
  daily: { day: string; people: number }[];
}

export interface Visit {
  startedAt: string;
  lastAt: string;
}

export interface VisitsPage extends Page<Visit> {
  activeDays?: string[];
  online: boolean;
}

export type Level = 'ok' | 'warn' | 'bad';
export type StatusKey = 'memory' | 'swap' | 'disk' | 'cpu' | 'eventLoop' | 'db' | 'files' | 'backup' | 'oom';
export type Range = '24h' | '7d';

export interface ServerStatus {
  checkedAt: string;
  level: Level;
  reasons: StatusKey[];
  items: Record<StatusKey, Level>;
  metrics: {
    memory: { totalB: number; availableB: number; usedPct: number } | null;
    swap: { totalB: number; usedB: number; usedPct: number } | null;
    cpu: { lastPct: number | null; avg5Pct: number | null; load1: number; cores: number };
    disk: { totalB: number; freeB: number; usedPct: number } | null;
    oom24h: number;
    app: { rssB: number; heapUsedB: number; heapLimitB: number; uptimeS: number; eventLoopP99Ms: number | null; builtAt: string | null };
    db: { sizeB: number; connections: number; maxConnections: number; pingMs: number };
    files: { usedB: number; count: number; limitB: number; usedPct: number };
    backup: { lastOkAt: string | null };
    host: { uptimeS: number };
    liveConnections: number;
  };
  history: { at: string; memUsedPct: number; cpuPct: number | null }[];
}

export const monitoringKeys = {
  all: ['monitoring'] as const,
  people: ['monitoring', 'people'] as const,
  visits: (id: string) => ['monitoring', 'visits', id] as const,
  server: (range: Range) => ['monitoring', 'server', range] as const,
};

export const monitoringApi = {
  people: () => api<PeopleOverview>('/monitoring/people'),
  visits: (id: string, offset: number) => api<VisitsPage>(`/monitoring/people/${id}/visits`, { query: { offset } }),
  server: (range: Range) => api<ServerStatus>('/monitoring/server', { query: { range } }),
};

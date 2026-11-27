/*
 * Пороги «увага» і «погано» (ADR-0024, погоджено власником у макетах 49–55).
 * Загальний стан — найгірший із показників.
 */

export type Level = 'ok' | 'warn' | 'bad';

export interface StatusInput {
  memAvailablePct: number | null;
  swapUsedPct: number | null;
  diskUsedPct: number | null;
  cpu5Pct: number | null;
  eventLoopP99Ms: number | null;
  dbConnectionsPct: number | null;
  filesUsedPct: number | null;
  backupAgeH: number | null;
  oom24h: number;
}

export type StatusKey = 'memory' | 'swap' | 'disk' | 'cpu' | 'eventLoop' | 'db' | 'files' | 'backup' | 'oom';

const above = (v: number | null, warn: number, bad?: number): Level => (v === null ? 'ok' : bad !== undefined && v > bad ? 'bad' : v > warn ? 'warn' : 'ok');

export function levels(s: StatusInput): Record<StatusKey, Level> {
  return {
    memory: s.memAvailablePct === null ? 'ok' : s.memAvailablePct < 7 ? 'bad' : s.memAvailablePct < 15 ? 'warn' : 'ok',
    swap: above(s.swapUsedPct, 50, 80),
    disk: above(s.diskUsedPct, 80, 90),
    cpu: above(s.cpu5Pct, 80, 95),
    eventLoop: above(s.eventLoopP99Ms, 200, 1000),
    db: above(s.dbConnectionsPct, 80),
    files: above(s.filesUsedPct, 80, 95),
    // копії ще не було — «увага»: без неї втрата диска означає втрату всього
    backup: s.backupAgeH === null ? 'warn' : above(s.backupAgeH, 26, 72),
    oom: s.oom24h > 0 ? 'bad' : 'ok',
  };
}

const RANK: Record<Level, number> = { ok: 0, warn: 1, bad: 2 };

/** Загальний стан і що саме його погіршує — найгірші першими, у сталому порядку */
export function overall(items: Record<StatusKey, Level>): { level: Level; reasons: StatusKey[] } {
  const keys = Object.keys(items) as StatusKey[];
  const worst = keys.reduce<Level>((w, k) => (RANK[items[k]] > RANK[w] ? items[k] : w), 'ok');
  const reasons = keys.filter((k) => items[k] !== 'ok').sort((a, b) => RANK[items[b]] - RANK[items[a]]);
  return { level: worst, reasons };
}

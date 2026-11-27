import { prisma } from '../../core/prisma';

const DAY_MS = 24 * 60 * 60_000;

export interface PersonStats {
  userId: string;
  lastAt: Date;
  visits: number;
  days: number;
}

export interface SamplePoint {
  at: Date;
  memUsedPct: number;
  cpuPct: number | null;
}

export const VISITS_PAGE = 30;

export const monitoringRepository = {
  // ── візити ────────────────────────────────────────────────────────────────────
  latestVisit: (userId: string) =>
    prisma.visit.findFirst({ where: { userId }, orderBy: { lastAt: 'desc' }, select: { id: true, lastAt: true } }),

  startVisit: (userId: string, at: Date) => prisma.visit.create({ data: { userId, startedAt: at, lastAt: at }, select: { id: true, lastAt: true } }),

  extendVisit: (id: string, at: Date) => prisma.visit.update({ where: { id }, data: { lastAt: at }, select: { id: true, lastAt: true } }),

  /** По людях: останній візит (за весь збережений час), візити й дні за період від since; дні — київські, за початком візиту */
  personStats: (since: Date) =>
    prisma.$queryRaw<PersonStats[]>`
      SELECT "userId", max("lastAt") AS "lastAt",
        (count(*) FILTER (WHERE "lastAt" >= ${since}))::int AS visits,
        (count(DISTINCT ("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv')::date) FILTER (WHERE "lastAt" >= ${since}))::int AS days
      FROM "Visit" GROUP BY "userId"`,

  /** Скільки різних людей заходило в кожен київський день від since */
  dailyPeople: (since: Date) =>
    prisma.$queryRaw<{ day: string; people: number }[]>`
      SELECT to_char(("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv')::date, 'YYYY-MM-DD') AS day, count(DISTINCT "userId")::int AS people
      FROM "Visit" WHERE "startedAt" >= ${since} GROUP BY 1 ORDER BY 1`,

  visitsOf: (userId: string, offset: number) =>
    prisma.visit.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, skip: offset, take: VISITS_PAGE + 1, select: { startedAt: true, lastAt: true } }),

  activeDaysOf: async (userId: string, since: Date) =>
    (
      await prisma.$queryRaw<{ day: string }[]>`
        SELECT DISTINCT to_char(("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv')::date, 'YYYY-MM-DD') AS day
        FROM "Visit" WHERE "userId" = ${userId} AND "startedAt" >= ${since} ORDER BY 1`
    ).map((r) => r.day),

  // ── стан сервера ──────────────────────────────────────────────────────────────
  saveSample: (s: { at: Date; memUsedPct: number; swapUsedPct: number; cpuPct: number | null; load1: number; diskUsedPct: number; appRssMb: number; oomKills: number | null }) =>
    prisma.serverSample.create({ data: s }),

  /** Історія для графіків: за добу — кожна точка (раз на 5 хв); за тиждень — найгірше за годину, щоб не загубити піки */
  history: (since: Date, hourly: boolean): Promise<SamplePoint[]> =>
    hourly
      ? prisma.$queryRaw<SamplePoint[]>`
          SELECT date_trunc('hour', "at") AS at, max("memUsedPct") AS "memUsedPct", max("cpuPct") AS "cpuPct"
          FROM "ServerSample" WHERE "at" >= ${since} GROUP BY 1 ORDER BY 1`
      : prisma.serverSample.findMany({ where: { at: { gte: since } }, orderBy: { at: 'asc' }, select: { at: true, memUsedPct: true, cpuPct: true } }),

  /** Найдавніше значення лічильника OOM за період — щоб порахувати, скільки разів вбивали процес */
  oldestOomSince: async (since: Date) =>
    (await prisma.serverSample.findFirst({ where: { at: { gte: since }, oomKills: { not: null } }, orderBy: { at: 'asc' }, select: { oomKills: true } }))?.oomKills ?? null,

  db: async () => {
    const t0 = performance.now();
    const [[size], [conn], [max]] = await Promise.all([
      prisma.$queryRaw<{ bytes: bigint }[]>`SELECT pg_database_size(current_database()) AS bytes`,
      prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()`,
      prisma.$queryRaw<{ max_connections: string }[]>`SHOW max_connections`,
    ]);
    return { sizeB: Number(size.bytes), connections: conn.n, maxConnections: Number(max.max_connections), pingMs: Math.round(performance.now() - t0) };
  },

  /** Коли востаннє вдалась резервна копія — пише scripts/backup.sh у Setting */
  lastBackupAt: async () => {
    const row = await prisma.setting.findUnique({ where: { key: 'backup.lastOk' } });
    const v = row?.value;
    return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v) : null;
  },

  /** Прибирання: візити старші 90 днів (рішення власника), знімки — старші 7 днів */
  prune: async (now: Date) => {
    const [visits, samples] = await prisma.$transaction([
      prisma.visit.deleteMany({ where: { lastAt: { lt: new Date(now.getTime() - 90 * DAY_MS) } } }),
      prisma.serverSample.deleteMany({ where: { at: { lt: new Date(now.getTime() - 7 * DAY_MS) } } }),
    ]);
    return { visits: visits.count, samples: samples.count };
  },
};

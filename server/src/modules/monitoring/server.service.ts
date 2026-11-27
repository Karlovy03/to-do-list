import { config } from '../../core/config';
import { liveHub } from '../live';
import { filesUsage } from '../templates';
import { monitoringRepository as repo } from './monitoring.repository';
import { latestCpu } from './sampler';
import { readApp } from './system/app';
import { pct, readHost } from './system/host';
import { oomDelta } from './system/proc';
import { levels, overall } from './system/status';

const HOUR_MS = 60 * 60_000;

export type Range = '24h' | '7d';

export const serverService = {
  /** Стан зараз, пороги і історія для графіків (ADR-0024) */
  async status(range: Range, now = new Date()) {
    const [host, app, db, files, backupAt, oldestOom, history] = await Promise.all([
      readHost(),
      readApp(),
      repo.db(),
      filesUsage(),
      repo.lastBackupAt(),
      repo.oldestOomSince(new Date(now.getTime() - 24 * HOUR_MS)),
      repo.history(new Date(now.getTime() - (range === '7d' ? 7 * 24 : 24) * HOUR_MS), range === '7d'),
    ]);
    const mem = host.mem;
    const cpu = latestCpu();
    const filesLimitB = config.FILES_MAX_TOTAL_MB * 1024 * 1024;
    const metrics = {
      memory: mem && { totalB: mem.totalB, availableB: mem.availableB, usedPct: pct(mem.totalB - mem.availableB, mem.totalB) },
      swap: mem && { totalB: mem.swapTotalB, usedB: mem.swapTotalB - mem.swapFreeB, usedPct: pct(mem.swapTotalB - mem.swapFreeB, mem.swapTotalB) },
      cpu: { lastPct: cpu.lastPct, avg5Pct: cpu.avg5Pct, load1: host.load1, cores: host.cores },
      disk: host.disk && { totalB: host.disk.totalB, freeB: host.disk.freeB, usedPct: pct(host.disk.totalB - host.disk.freeB, host.disk.totalB) },
      oom24h: oomDelta(oldestOom, host.oomKills),
      app,
      db,
      files: { usedB: files.usedB, count: files.count, limitB: filesLimitB, usedPct: pct(files.usedB, filesLimitB) },
      backup: { lastOkAt: backupAt?.toISOString() ?? null },
      host: { uptimeS: Math.round(host.uptimeS) },
      liveConnections: liveHub.connections(),
    };
    const items = levels({
      memAvailablePct: mem ? pct(mem.availableB, mem.totalB) : null,
      swapUsedPct: mem && mem.swapTotalB > 0 ? metrics.swap!.usedPct : null,
      diskUsedPct: metrics.disk?.usedPct ?? null,
      cpu5Pct: cpu.avg5Pct,
      eventLoopP99Ms: app.eventLoopP99Ms,
      dbConnectionsPct: pct(db.connections, db.maxConnections),
      filesUsedPct: metrics.files.usedPct,
      backupAgeH: backupAt ? (now.getTime() - backupAt.getTime()) / HOUR_MS : null,
      oom24h: metrics.oom24h,
    });
    return {
      checkedAt: now.toISOString(),
      ...overall(items),
      items,
      metrics,
      history: history.map((h) => ({ at: h.at.toISOString(), memUsedPct: round1(h.memUsedPct), cpuPct: h.cpuPct === null ? null : round1(h.cpuPct) })),
    };
  },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

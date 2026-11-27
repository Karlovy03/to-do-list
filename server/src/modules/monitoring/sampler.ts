import { LOCKS, withAdvisoryLock } from '../../core/lock';
import { monitoringRepository as repo } from './monitoring.repository';
import { readApp, takeEventLoopP99 } from './system/app';
import { pct, readHost } from './system/host';
import { cpuPercent, type CpuTimes } from './system/proc';

/*
 * Знімки стану сервера (ADR-0024): раз на хвилину — процесор (потрібна різниця двох знімків /proc/stat)
 * і затримка циклу подій; раз на 5 хв — запис у ServerSample для графіків; раз на добу — прибирання.
 * Таймери не тримають процес (unref).
 */
const TICK_MS = 60_000;
const SAVE_EVERY = 5;
const DAY_MS = 24 * 60 * 60_000;

let prevCpu: CpuTimes | null = null;
const lastMinutes: number[] = [];
let ticks = 0;

/** Процесор: за останню хвилину і середнє за 5 хв (поріг «увага» — за середнім) */
export function latestCpu() {
  const avg = lastMinutes.length ? lastMinutes.reduce((a, b) => a + b, 0) / lastMinutes.length : null;
  return { lastPct: lastMinutes.at(-1) ?? null, avg5Pct: avg };
}

/** Один крок: міряє, раз на 5 кроків записує знімок; повертає записаний знімок (для тестів) */
export async function tick(now = new Date()) {
  const [host, app] = await Promise.all([readHost(), readApp()]);
  takeEventLoopP99();
  const cpu = prevCpu && host.cpuTimes ? cpuPercent(prevCpu, host.cpuTimes) : null;
  prevCpu = host.cpuTimes;
  if (cpu !== null) {
    lastMinutes.push(cpu);
    if (lastMinutes.length > 5) lastMinutes.shift();
  }
  ticks += 1;
  if (ticks % SAVE_EVERY !== 1 || !host.mem) return null;
  const m = host.mem;
  const sample = {
    at: now,
    memUsedPct: pct(m.totalB - m.availableB, m.totalB),
    swapUsedPct: pct(m.swapTotalB - m.swapFreeB, m.swapTotalB),
    cpuPct: latestCpu().avg5Pct,
    load1: host.load1,
    diskUsedPct: host.disk ? pct(host.disk.totalB - host.disk.freeB, host.disk.totalB) : 0,
    appRssMb: Math.round(app.rssB / 1024 / 1024),
    oomKills: host.oomKills,
  };
  await repo.saveSample(sample);
  return sample;
}

const prune = () => withAdvisoryLock(LOCKS.monitoring, () => repo.prune(new Date()));

export function startMonitoring() {
  const safe = (what: string, fn: () => Promise<unknown>) => () => void fn().catch((err: unknown) => console.error(`[monitoring] ${what} failed`, err));
  safe('sample', tick)();
  safe('prune', prune)();
  setInterval(safe('sample', tick), TICK_MS).unref();
  setInterval(safe('prune', prune), DAY_MS).unref();
}

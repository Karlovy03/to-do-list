import fs from 'node:fs/promises';
import path from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import v8 from 'node:v8';
import { config } from '../../../core/config';

/** Затримка циклу подій: якщо сервер «задумався», відповіді чекають усі — p99 за останню хвилину */
const loop = monitorEventLoopDelay({ resolution: 20 });
loop.enable();
let lastP99Ms: number | null = null;

/** Знімає p99 і починає нове вікно — викликає семплер раз на хвилину */
export function takeEventLoopP99() {
  lastP99Ms = loop.count ? loop.percentile(99) / 1e6 : null;
  loop.reset();
  return lastP99Ms;
}

export async function readApp() {
  const mem = process.memoryUsage();
  // час збірки — за файлом version.json клієнта (той самий образ, ADR-0009)
  const built = await fs.stat(path.join(config.clientDist, 'version.json')).then((s) => s.mtime.toISOString(), () => null);
  return {
    rssB: mem.rss,
    heapUsedB: mem.heapUsed,
    heapLimitB: v8.getHeapStatistics().heap_size_limit,
    uptimeS: Math.round(process.uptime()),
    eventLoopP99Ms: lastP99Ms,
    builtAt: built,
  };
}

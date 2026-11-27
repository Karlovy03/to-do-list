/*
 * Розбір /proc (ADR-0024). У контейнері Docker ці файли показують увесь VPS, а не лише контейнер —
 * тож пам'ять, swap, процесор і лічильник OOM — це стан сервера. Чисті функції: перевіряються на зразках.
 */

export interface Meminfo {
  totalB: number;
  availableB: number;
  swapTotalB: number;
  swapFreeB: number;
}

/** /proc/meminfo: значення в кБ; MemAvailable — скільки можна взяти без swap (з урахуванням кешу) */
export function parseMeminfo(text: string): Meminfo | null {
  const kb = (key: string) => {
    const m = text.match(new RegExp(`^${key}:\\s+(\\d+)\\s*kB`, 'm'));
    return m ? Number(m[1]) * 1024 : null;
  };
  const total = kb('MemTotal');
  const available = kb('MemAvailable');
  if (total === null || available === null) return null;
  return { totalB: total, availableB: available, swapTotalB: kb('SwapTotal') ?? 0, swapFreeB: kb('SwapFree') ?? 0 };
}

/** /proc/vmstat: скільки разів від завантаження VPS ядро вбивало процес через нестачу пам'яті */
export function parseOomKills(text: string): number | null {
  const m = text.match(/^oom_kill\s+(\d+)/m);
  return m ? Number(m[1]) : null;
}

export interface CpuTimes {
  idle: number;
  total: number;
}

/** Перший рядок /proc/stat: сумарний час процесорів; простій — idle + iowait */
export function parseCpuTimes(text: string): CpuTimes | null {
  const line = text.split('\n').find((l) => l.startsWith('cpu '));
  if (!line) return null;
  const n = line.trim().split(/\s+/).slice(1).map(Number);
  if (n.length < 4 || n.some((x) => !Number.isFinite(x))) return null;
  // user nice system idle iowait irq softirq steal (guest уже входить у user)
  const total = n.slice(0, 8).reduce((a, b) => a + b, 0);
  return { idle: n[3] + (n[4] ?? 0), total };
}

/** Завантаженість процесора між двома знімками, % */
export function cpuPercent(a: CpuTimes, b: CpuTimes): number | null {
  const dt = b.total - a.total;
  if (dt <= 0) return null;
  return Math.min(100, Math.max(0, ((dt - (b.idle - a.idle)) / dt) * 100));
}

/** Скільки разів вбито процес за період: лічильник накопичувальний, після перезавантаження VPS — з нуля */
export function oomDelta(oldest: number | null, current: number | null): number {
  if (current === null) return 0;
  if (oldest === null || current < oldest) return current;
  return current - oldest;
}

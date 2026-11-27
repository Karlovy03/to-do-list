import fs from 'node:fs/promises';
import os from 'node:os';
import { config } from '../../../core/config';
import { parseCpuTimes, parseMeminfo, parseOomKills, type CpuTimes, type Meminfo } from './proc';

/** Читання /proc і диска; не Linux (розробка на іншій ОС) — значень просто немає */
const read = (file: string) => fs.readFile(file, 'utf8').catch(() => null);

export interface HostNow {
  mem: Meminfo | null;
  oomKills: number | null;
  cpuTimes: CpuTimes | null;
  load1: number;
  cores: number;
  uptimeS: number;
  disk: { totalB: number; freeB: number } | null;
}

/** Диск, де лежать том шаблонів і база, — той самий диск VPS */
async function disk() {
  const dir = await fs.access(config.filesDir).then(() => config.filesDir, () => process.cwd());
  try {
    const s = await fs.statfs(dir);
    return { totalB: s.blocks * s.bsize, freeB: s.bavail * s.bsize };
  } catch {
    return null;
  }
}

export async function readHost(): Promise<HostNow> {
  const [meminfo, vmstat, stat, d] = await Promise.all([read('/proc/meminfo'), read('/proc/vmstat'), read('/proc/stat'), disk()]);
  return {
    mem: meminfo ? parseMeminfo(meminfo) : null,
    oomKills: vmstat ? parseOomKills(vmstat) : null,
    cpuTimes: stat ? parseCpuTimes(stat) : null,
    load1: os.loadavg()[0],
    cores: os.cpus().length,
    uptimeS: os.uptime(),
    disk: d,
  };
}

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

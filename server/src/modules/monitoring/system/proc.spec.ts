import { describe, expect, it } from 'vitest';
import { cpuPercent, oomDelta, parseCpuTimes, parseMeminfo, parseOomKills } from './proc';

// зразок із VPS на 1 ГБ (e2-micro) зі swap 2 ГБ — формат /proc/meminfo
const MEMINFO = `MemTotal:         993280 kB
MemFree:           61236 kB
MemAvailable:     233472 kB
Buffers:           10240 kB
Cached:           201728 kB
SwapCached:        20480 kB
SwapTotal:       2097148 kB
SwapFree:        1779708 kB
`;

describe('/proc/meminfo', () => {
  it('усього, доступно (не «вільно»: кеш віддається), swap — у байтах', () => {
    expect(parseMeminfo(MEMINFO)).toEqual({ totalB: 993280 * 1024, availableB: 233472 * 1024, swapTotalB: 2097148 * 1024, swapFreeB: 1779708 * 1024 });
  });
  it('без swap — нулі; зіпсований файл — null', () => {
    expect(parseMeminfo('MemTotal: 100 kB\nMemAvailable: 50 kB\n')).toEqual({ totalB: 102400, availableB: 51200, swapTotalB: 0, swapFreeB: 0 });
    expect(parseMeminfo('Something: 1\n')).toBeNull();
  });
});

describe('/proc/vmstat і /proc/stat', () => {
  it('лічильник «процес вбито через нестачу пам’яті»', () => {
    expect(parseOomKills('pgfault 12\noom_kill 3\nnuma_hit 1\n')).toBe(3);
    expect(parseOomKills('pgfault 12\n')).toBeNull();
  });
  it('процесор: зайнятість між двома знімками; простій — idle + iowait', () => {
    const a = parseCpuTimes('cpu  100 0 100 700 100 0 0 0 0 0\ncpu0 1 2 3 4\n')!;
    const b = parseCpuTimes('cpu  400 0 200 1000 100 0 0 0 0 0\n')!;
    expect(a).toEqual({ idle: 800, total: 1000 });
    expect(cpuPercent(a, b)).toBeCloseTo(57.14, 1);
    expect(cpuPercent(b, b)).toBeNull();
  });
  it('OOM за добу: різниця накопичувального лічильника; після перезавантаження VPS — з нуля', () => {
    expect(oomDelta(2, 5)).toBe(3);
    expect(oomDelta(null, 1)).toBe(1);
    expect(oomDelta(7, 1)).toBe(1);
    expect(oomDelta(3, null)).toBe(0);
  });
});

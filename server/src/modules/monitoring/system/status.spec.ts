import { describe, expect, it } from 'vitest';
import { levels, overall, type StatusInput } from './status';

const calm: StatusInput = { memAvailablePct: 40, swapUsedPct: 10, diskUsedPct: 30, cpu5Pct: 10, eventLoopP99Ms: 5, dbConnectionsPct: 20, filesUsedPct: 1, backupAgeH: 3, oom24h: 0 };
const at = (patch: Partial<StatusInput>) => levels({ ...calm, ...patch });

describe('пороги (погоджено в макетах 49–55)', () => {
  it('спокійний сервер — усе гаразд', () => {
    expect(overall(levels(calm))).toEqual({ level: 'ok', reasons: [] });
  });
  it('вільна пам’ять: 15 % — ще гаразд, менше — увага, менше 7 % — погано', () => {
    expect([at({ memAvailablePct: 15 }).memory, at({ memAvailablePct: 14.9 }).memory, at({ memAvailablePct: 7 }).memory, at({ memAvailablePct: 6.9 }).memory]).toEqual(['ok', 'warn', 'warn', 'bad']);
  });
  it('swap 50/80 %, диск 80/90 %, процесор 80/95 %, файли 80/95 %: рівно на межі — ще ні', () => {
    expect([at({ swapUsedPct: 50 }).swap, at({ swapUsedPct: 51 }).swap, at({ swapUsedPct: 81 }).swap]).toEqual(['ok', 'warn', 'bad']);
    expect([at({ diskUsedPct: 80 }).disk, at({ diskUsedPct: 85 }).disk, at({ diskUsedPct: 91 }).disk]).toEqual(['ok', 'warn', 'bad']);
    expect([at({ cpu5Pct: 80 }).cpu, at({ cpu5Pct: 90 }).cpu, at({ cpu5Pct: 96 }).cpu]).toEqual(['ok', 'warn', 'bad']);
    expect([at({ filesUsedPct: 80 }).files, at({ filesUsedPct: 81 }).files, at({ filesUsedPct: 96 }).files]).toEqual(['ok', 'warn', 'bad']);
  });
  it('з’єднання бази понад 80 % — лише увага; затримка циклу подій 200 мс / 1 с', () => {
    expect([at({ dbConnectionsPct: 81 }).db, at({ dbConnectionsPct: 100 }).db]).toEqual(['warn', 'warn']);
    expect([at({ eventLoopP99Ms: 201 }).eventLoop, at({ eventLoopP99Ms: 1001 }).eventLoop]).toEqual(['warn', 'bad']);
  });
  it('резервна копія: старша 26 год — увага, 3 днів — погано, ще не було — увага', () => {
    expect([at({ backupAgeH: 26 }).backup, at({ backupAgeH: 27 }).backup, at({ backupAgeH: 73 }).backup, at({ backupAgeH: null }).backup]).toEqual(['ok', 'warn', 'bad', 'warn']);
  });
  it('хоч один процес вбито через нестачу пам’яті за добу — погано', () => {
    expect(at({ oom24h: 1 }).oom).toBe('bad');
  });
  it('загальний — найгірший; причини — найгірші першими', () => {
    expect(overall(at({ swapUsedPct: 60, oom24h: 1 }))).toEqual({ level: 'bad', reasons: ['oom', 'swap'] });
  });
  it('невідоме значення (не Linux) не тривожить', () => {
    expect(overall(levels({ ...calm, memAvailablePct: null, swapUsedPct: null, diskUsedPct: null, cpu5Pct: null, eventLoopP99Ms: null }))).toEqual({ level: 'ok', reasons: [] });
  });
});

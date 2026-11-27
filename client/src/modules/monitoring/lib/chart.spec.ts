import { describe, expect, it } from 'vitest';
import type { ServerStatus } from '../api/monitoring.api';
import { areaPath, linePath, peakOf, segments } from './chart';
import { serverTiles } from './metrics';

describe('графік', () => {
  it('точки в координатах; пропуск розриває лінію; заливка замкнена донизу', () => {
    const segs = segments([0, 50, null, 100], 300, 100);
    expect(segs).toEqual([[[0, 100], [100, 50]], [[300, 0]]]);
    expect(linePath(segs)).toBe('M0.0 100.0 L100.0 50.0 M300.0 0.0');
    expect(areaPath([segs[0]], 100)).toBe('M0.0 100 L0.0 100.0 L100.0 50.0 L100.0 100 Z');
  });
  it('найбільше значення — для підказки', () => {
    expect(peakOf([3, null, 88, 40])).toEqual({ value: 88, index: 2 });
    expect(peakOf([null])).toBeNull();
  });
});

const status = (over: Partial<ServerStatus['metrics']> = {}): ServerStatus => ({
  checkedAt: '2026-11-28T07:00:00Z', level: 'ok', reasons: [],
  items: { memory: 'ok', swap: 'ok', disk: 'ok', cpu: 'ok', eventLoop: 'ok', db: 'ok', files: 'ok', backup: 'warn', oom: 'ok' },
  metrics: {
    memory: { totalB: 970 * 2 ** 20, availableB: 228 * 2 ** 20, usedPct: 76.5 },
    swap: { totalB: 0, usedB: 0, usedPct: 0 },
    cpu: { lastPct: null, avg5Pct: null, load1: 0.21, cores: 2 },
    disk: { totalB: 29 * 2 ** 30, freeB: 19 * 2 ** 30, usedPct: 34 },
    oom24h: 0,
    app: { rssB: 138 * 2 ** 20, heapUsedB: 60, heapLimitB: 256, uptimeS: 3600, eventLoopP99Ms: 4, builtAt: null },
    db: { sizeB: 46 * 2 ** 20, connections: 6, maxConnections: 20, pingMs: 2 },
    files: { usedB: 84 * 2 ** 20, count: 12, limitB: 5000 * 2 ** 20, usedPct: 1.7 },
    backup: { lastOkAt: null },
    host: { uptimeS: 86400 },
    liveConnections: 3,
    ...over,
  },
  history: [],
});

describe('плитки «Сервер» (Figma 50)', () => {
  it('порядок макета; swap не налаштовано; процесор ще міряється; копії не було — «увага»', () => {
    const tiles = serverTiles(status());
    expect(tiles.map((x) => x.key)).toEqual(['memory', 'swap', 'cpu', 'disk', 'oom', 'app', 'db', 'files', 'backup']);
    expect(tiles[1]).toMatchObject({ value: '—', note: 'swap не налаштовано' });
    expect(tiles[2]).toMatchObject({ value: '…', note: 'ще міряємо…' });
    expect(tiles[8]).toMatchObject({ value: 'ще не було', level: 'warn' });
    expect(tiles[0].value).toBe('742 МБ з 970 МБ');
  });
});

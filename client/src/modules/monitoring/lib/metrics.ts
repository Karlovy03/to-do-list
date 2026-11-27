import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';
import { formatDay, formatTime } from '@/shared/lib/time';
import type { Level, ServerStatus } from '../api/monitoring.api';
import { bytes, percent, uptime } from './format';

export interface Tile {
  key: string;
  title: string;
  level: Level;
  value: string;
  share?: number | null;
  note: string;
}

const of = (a: string, b: string) => t('monitoring.server.of', { a, b });
const num = (n: number) => n.toFixed(2).replace('.', ',');

/** Плитки «Сервер» у порядку макета 50: пам'ять, swap, процесор, диск, нестача пам'яті, застосунок, база, файли, копія */
export function serverTiles(s: ServerStatus): Tile[] {
  const m = s.metrics;
  const it = s.items;
  const tiles: Tile[] = [];
  if (m.memory) {
    tiles.push({
      key: 'memory', title: t('monitoring.server.memory'), level: it.memory,
      value: of(bytes(m.memory.totalB - m.memory.availableB), bytes(m.memory.totalB)), share: m.memory.usedPct,
      note: t('monitoring.server.memory_note', { free: bytes(m.memory.availableB), pct: percent(100 - m.memory.usedPct) }),
    });
  }
  if (m.swap) {
    tiles.push(
      m.swap.totalB > 0
        ? { key: 'swap', title: t('monitoring.server.swap'), level: it.swap, value: of(bytes(m.swap.usedB), bytes(m.swap.totalB)), share: m.swap.usedPct, note: t('monitoring.server.swap_note') }
        : { key: 'swap', title: t('monitoring.server.swap'), level: it.swap, value: '—', note: t('monitoring.server.swap_none') },
    );
  }
  const cpu = m.cpu.avg5Pct ?? m.cpu.lastPct;
  tiles.push({
    key: 'cpu', title: t('monitoring.server.cpu'), level: it.cpu, value: cpu === null ? '…' : percent(cpu), share: cpu,
    note: cpu === null ? t('monitoring.server.cpu_unknown') : t('monitoring.server.cpu_note', { load: num(m.cpu.load1), cores: m.cpu.cores }),
  });
  if (m.disk) {
    tiles.push({
      key: 'disk', title: t('monitoring.server.disk'), level: it.disk, value: of(bytes(m.disk.totalB - m.disk.freeB), bytes(m.disk.totalB)), share: m.disk.usedPct,
      note: t('monitoring.server.disk_note', { free: bytes(m.disk.freeB) }),
    });
  }
  tiles.push({
    key: 'oom', title: t('monitoring.server.oom'), level: it.oom, value: t('monitoring.server.oom_value', { n: m.oom24h }),
    note: t(m.oom24h ? 'monitoring.server.oom_note_bad' : 'monitoring.server.oom_note_ok'),
  });
  const built = m.app.builtAt ? t('monitoring.server.app_built', { date: `${formatDay(m.app.builtAt)}, ${formatTime(m.app.builtAt)}` }) : '';
  tiles.push({
    key: 'app', title: t('monitoring.server.app'), level: it.eventLoop, value: bytes(m.app.rssB), share: (m.app.heapUsedB / m.app.heapLimitB) * 100,
    note: t('monitoring.server.app_note', { uptime: uptime(m.app.uptimeS), lag: t('monitoring.server.ms', { n: Math.round(m.app.eventLoopP99Ms ?? 0) }) }) + built,
  });
  tiles.push({
    key: 'db', title: t('monitoring.server.db'), level: it.db, value: bytes(m.db.sizeB), share: (m.db.connections / m.db.maxConnections) * 100,
    note: t('monitoring.server.db_note', { n: m.db.connections, max: m.db.maxConnections, ms: m.db.pingMs }),
  });
  tiles.push({
    key: 'files', title: t('monitoring.server.files'), level: it.files, value: of(bytes(m.files.usedB), bytes(m.files.limitB)), share: m.files.usedPct,
    note: t(`monitoring.server.files_note_${pluralForm(m.files.count)}`, { n: m.files.count }),
  });
  const b = m.backup.lastOkAt;
  tiles.push({
    key: 'backup', title: t('monitoring.server.backup'), level: it.backup, value: b ? `${formatDay(b)}, ${formatTime(b)}` : t('monitoring.server.backup_never'),
    note: t('monitoring.server.backup_note'),
  });
  return tiles;
}

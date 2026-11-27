import { t } from '@/shared/lib/texts';
import { formatStamp, formatTime } from '@/shared/lib/time';
import { Segmented } from '@/shared/ui';
import type { Range } from '../../api/monitoring.api';
import { areaPath, linePath, peakOf, segments } from '../../lib/chart';
import { percent } from '../../lib/format';
import css from './LineChart.module.css';

const W = 600;
const H = 160;

interface Props {
  title: string;
  points: { at: string; value: number | null }[];
  /** пунктирні пороги: «увага», «погано» */
  thresholds: { pct: number; level: 'warn' | 'bad' }[];
  range: Range;
  onRange: (r: Range) => void;
}

/** Графік за 24 год / 7 днів (Figma 50): лінія з заливкою, пороги пунктиром, найбільше значення — у підказці */
export function LineChart({ title, points, thresholds, range, onRange }: Props) {
  const values = points.map((p) => p.value);
  const segs = segments(values, W, H);
  // одна точка — ще не лінія: перші хвилини після запуску
  const peak = values.filter((v) => v !== null).length >= 2 ? peakOf(values) : null;
  const when = (iso: string) => (range === '24h' ? formatTime(iso) : formatStamp(iso));
  const ticks = points.length > 1 ? [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (points.length - 1))) : [];
  return (
    <section className={css.card}>
      <header className={css.head}>
        <h3 className={css.title}>{title}</h3>
        <span className={css.range}>
          <Segmented<Range> label={t('monitoring.server.range_label')} value={range} onChange={onRange} options={[{ value: '24h', label: t('monitoring.server.range_24h') }, { value: '7d', label: t('monitoring.server.range_7d') }]} />
        </span>
      </header>
      <small className={css.hint}>
        {peak ? t('monitoring.server.mem_peak', { pct: percent(peak.value), time: when(points[peak.index].at) }) : t('monitoring.server.no_history')}
      </small>
      <div className={css.plot}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={css.svg} role="img" aria-label={`${title}: ${peak ? percent(peak.value) : '—'}`}>
          <path d={areaPath(segs, H)} className={css.area} />
          <path d={linePath(segs)} className={css.line} vectorEffect="non-scaling-stroke" />
          {thresholds.map((th) => (
            <line key={th.level} x1={0} x2={W} y1={H - (th.pct / 100) * H} y2={H - (th.pct / 100) * H} className={css[th.level]} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {thresholds.map((th) => (
          <span key={th.level} className={`${css.thLabel} ${css[`${th.level}Text`]}`} style={{ bottom: `${th.pct}%` }}>
            {t(`monitoring.server.threshold_${th.level}`)}
          </span>
        ))}
      </div>
      <div className={css.axis} aria-hidden>
        {ticks.map((i, k) => (
          <span key={k} style={{ left: `${(i / Math.max(1, points.length - 1)) * 100}%` }} className={k === ticks.length - 1 ? css.last : k === 0 ? undefined : css.mid}>
            {when(points[i].at)}
          </span>
        ))}
      </div>
    </section>
  );
}

import { t } from '@/shared/lib/texts';
import type { Level } from '../../api/monitoring.api';
import css from './MetricTile.module.css';

interface Props {
  title: string;
  level: Level;
  value: string;
  /** заповнення смуги 0–100; без — смуги немає */
  share?: number | null;
  note: string;
}

/** Показник (Figma «Моніторинг / Показник»): назва, позначка стану, значення, смуга, пояснення */
export function MetricTile({ title, level, value, share, note }: Props) {
  return (
    <section className={css.tile}>
      <header className={css.head}>
        <span className={css.title}>{title}</span>
        <span className={`${css.pill} ${css[level]}`}>{t(`monitoring.server.level_${level}`)}</span>
      </header>
      <b className={css.value}>{value}</b>
      {share !== undefined && share !== null && (
        <span className={css.track} role="meter" aria-valuenow={Math.round(share)} aria-valuemin={0} aria-valuemax={100} aria-label={title}>
          <span className={`${css.fill} ${css[`${level}Fill`]}`} style={{ width: `${Math.min(100, Math.max(1, share))}%` }} />
        </span>
      )}
      <small className={css.note}>{note}</small>
    </section>
  );
}

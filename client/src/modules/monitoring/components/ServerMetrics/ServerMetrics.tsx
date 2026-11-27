import type { ServerStatus } from '../../api/monitoring.api';
import { serverTiles } from '../../lib/metrics';
import { MetricTile } from '../MetricTile/MetricTile';
import css from './ServerMetrics.module.css';

/** Показники сервера: комп'ютер — 3 колонки, Fold — 2, телефон — 1 (Figma 50, 54, 52) */
export function ServerMetrics({ status, columns }: { status: ServerStatus; columns: 1 | 2 | 3 }) {
  return (
    <div className={`${css.grid} ${css[`c${columns}`]}`}>
      {serverTiles(status).map(({ key, ...tile }) => <MetricTile key={key} {...tile} />)}
    </div>
  );
}

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/lib/texts';
import { formatTime } from '@/shared/lib/time';
import type { PlacedEvent } from '../../lib/rows';
import css from './EventBlock.module.css';

const LOOK = { upcoming: css.planned, live: css.live, past: css.past, cancelled: css.cancelled } as const;

/** Блок заходу (Figma «Календар / Блок заходу»): темно-синій; триває — з блакитним обведенням */
export function EventBlock({ item, to }: { item: PlacedEvent; to: string }) {
  const { event, placed } = item;
  const style = { left: `${placed.left}%`, width: `${placed.width}%`, '--lane': item.lane } as CSSProperties;
  const time = `${formatTime(event.startsAt)}–${formatTime(event.endsAt)}`;
  return (
    <Link to={to} className={`${css.block} ${LOOK[item.phase]}`} style={style} aria-label={t('calendar.grid.event', { time, title: event.title })}>
      <b>{formatTime(event.startsAt)}</b>
      <span className={css.title}>{event.title}</span>
    </Link>
  );
}

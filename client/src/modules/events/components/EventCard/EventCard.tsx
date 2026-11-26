import { Link } from 'react-router-dom';
import type { AppEvent } from '@/shared/api/types';
import { formatTime } from '@/shared/lib/time';
import { Avatars, TimeChip } from '@/shared/ui';
import { durationLabel, eventChip, phaseOf } from '../../lib/eventTime';
import css from './EventCard.module.css';

interface Props {
  event: AppEvent;
  to: string;
  selected?: boolean;
  /** обкладинка Flip: без учасників */
  compact?: boolean;
  now: Date;
}

/** Картка заходу (Figma «Захід / Картка»): ліворуч початок і тривалість, праворуч назва, стан і учасники */
export function EventCard({ event, to, selected, compact, now }: Props) {
  const phase = phaseOf(event, now);
  const chip = eventChip(event, now);
  const cls = [css.card, selected && css.selected, (phase === 'past' || phase === 'cancelled') && css.over, phase === 'cancelled' && css.cancelled, compact && css.compact];
  return (
    <Link to={to} className={cls.filter(Boolean).join(' ')} aria-current={selected ? 'true' : undefined}>
      <div className={css.time}>
        <b>{formatTime(event.startsAt)}</b>
        <small>{durationLabel(event.durationMin)}</small>
      </div>
      <span className={css.divider} aria-hidden="true" />
      <div className={css.content}>
        <h3 className={css.title}>{event.title}</h3>
        <div className={css.bottom}>
          <TimeChip tone={chip.tone} time={chip.time} rest={chip.rest} />
          {!compact && <Avatars people={[event.organizer, ...event.participants]} />}
        </div>
      </div>
    </Link>
  );
}

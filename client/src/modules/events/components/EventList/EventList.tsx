import type { AppEvent } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { GroupHeader } from '@/shared/ui';
import { groupEvents } from '../../lib/grouping';
import { EventCard } from '../EventCard/EventCard';
import css from './EventList.module.css';

const TONE = { today: 'today', tomorrow: 'upcoming', week: 'upcoming', later: 'upcoming', past: 'done' } as const;

interface Props {
  events: AppEvent[];
  selectedId?: string;
  compact?: boolean;
  now: Date;
}

/** Групи: сьогодні → завтра → цього тижня → пізніше → минулі */
export function EventList({ events, selectedId, compact, now }: Props) {
  return (
    <div className={css.list}>
      {groupEvents(events, now).map((g) => (
        <section key={g.id} className={css.group} aria-label={t(`events.groups.${g.id}`)}>
          <GroupHeader tone={TONE[g.id]} title={t(`events.groups.${g.id}`)} count={g.events.length} />
          {g.events.map((e) => (
            <EventCard key={e.id} event={e} to={`/events/e/${e.id}`} selected={e.id === selectedId} compact={compact} now={now} />
          ))}
        </section>
      ))}
    </div>
  );
}

import { useState } from 'react';
import type { AppEvent } from '@/shared/api/types';
import { useDescribePerson } from '@/shared/api/people';
import { t } from '@/shared/lib/texts';
import { PersonLine } from '@/shared/ui';
import css from './EventDetail.module.css';

/** До 50 учасників: спершу кілька, решта — на прохання */
const FIRST = 5;

export function EventPeople({ event }: { event: AppEvent }) {
  const describe = useDescribePerson();
  const [all, setAll] = useState(false);
  const shown = all ? event.participants : event.participants.slice(0, FIRST);
  return (
    <section className={css.panel} aria-label={t('events.detail.participants')}>
      <h2 className={css.label}>{t('events.detail.organizer')}</h2>
      <PersonLine person={event.organizer} note={describe(event.organizer)} />
      {event.participants.length > 0 && (
        <>
          <h2 className={css.label}>{t('events.detail.participants_count', { n: event.participants.length })}</h2>
          {shown.map((p) => (
            <PersonLine key={p.id} person={p} note={describe(p)} />
          ))}
          {shown.length < event.participants.length && (
            <button type="button" className={css.more} onClick={() => setAll(true)}>
              {t('events.detail.show_all', { n: event.participants.length })}
            </button>
          )}
        </>
      )}
    </section>
  );
}

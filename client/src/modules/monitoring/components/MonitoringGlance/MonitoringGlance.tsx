import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import { usePeople, useServer } from '../../hooks/useMonitoring';
import { filterPeople } from '../../lib/people';
import { percent } from '../../lib/format';
import { PersonRow } from '../PersonRow/PersonRow';
import css from './MonitoringGlance.module.css';

/** Flip 320×350 (Figma 55): стан сервера одним рядком і люди коротко; «давно не заходили ›» розгортає список */
export function MonitoringGlance({ onOpen }: { onOpen: (id: string) => void }) {
  const server = useServer('24h');
  const people = usePeople();
  const [away, setAway] = useState(false);
  const s = server.data;
  const p = people.data;
  return (
    <>
      {s && (
        <section className={`${css.server} ${css[s.level]}`} role="status">
          <Icon name={s.level === 'ok' ? 'check' : 'alert'} size={22} />
          <span className={css.text}>
            <b>{t(`monitoring.server.glance_${s.level}`)}</b>
            <span>{t('monitoring.server.glance_note', { mem: s.metrics.memory ? percent(s.metrics.memory.usedPct) : '—', disk: s.metrics.disk ? percent(s.metrics.disk.usedPct) : '—' })}</span>
          </span>
        </section>
      )}
      {p && (
        <section className={css.people}>
          <b className={css.online}>
            <span className={css.dot} />
            {t('monitoring.people.online')} {p.summary.online}
          </b>
          <small className={css.note}>
            {t('monitoring.people.today').toLocaleLowerCase('uk')} {p.summary.today} {t('monitoring.people.today_note', { n: p.summary.total })}
          </small>
          {p.summary.away > 0 && !away && (
            <button type="button" className={css.more} onClick={() => setAway(true)}>
              {t('monitoring.people.away').toLocaleLowerCase('uk')} {p.summary.away} ›
            </button>
          )}
          {away && filterPeople(p.items, 'away', '').map((r) => <PersonRow key={r.person.id} row={r} short onOpen={() => onOpen(r.person.id)} />)}
        </section>
      )}
    </>
  );
}

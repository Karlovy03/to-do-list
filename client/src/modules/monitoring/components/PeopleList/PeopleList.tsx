import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import { Chip, Chips, Empty, Input } from '@/shared/ui';
import type { PeopleOverview, PersonRow as Row } from '../../api/monitoring.api';
import { filterPeople, type PeopleFilter } from '../../lib/people';
import { PersonRow } from '../PersonRow/PersonRow';
import css from './PeopleList.module.css';

/** Люди: «Усі · Онлайн · Давно не заходили» і пошук за прізвищем (Figma 49, 51) */
export function PeopleList({ data, short, onOpen }: { data: PeopleOverview; short?: boolean; onOpen: (row: Row) => void }) {
  const [filter, setFilter] = useState<PeopleFilter>('all');
  const [query, setQuery] = useState('');
  const rows = filterPeople(data.items, filter, query);
  const chip = (f: PeopleFilter, label: string, n: number) => (
    <Chip on={filter === f} onClick={() => setFilter(f)}>
      {label} {n}
    </Chip>
  );
  return (
    <section className={css.card}>
      <div className={css.bar}>
        <Chips>
          {chip('all', t('monitoring.people.all'), data.summary.total)}
          {chip('online', t('monitoring.people.online'), data.summary.online)}
          {chip('away', t(short ? 'monitoring.people.away_short' : 'monitoring.people.away'), data.summary.away)}
        </Chips>
        <Input type="search" className={css.search} value={query} placeholder={t('monitoring.people.search')} aria-label={t('monitoring.people.search')} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {rows.length ? rows.map((r) => <PersonRow key={r.person.id} row={r} short={short} onOpen={() => onOpen(r)} />) : <Empty icon="search" title={t('monitoring.people.nothing')} />}
    </section>
  );
}

import type { PersonRow } from '../api/monitoring.api';
import { isAway } from './format';

export type PeopleFilter = 'all' | 'online' | 'away';

/** Фільтр і пошук за прізвищем (без урахування регістру); порядок — як віддав сервер */
export function filterPeople(items: PersonRow[], filter: PeopleFilter, query: string, now = new Date()): PersonRow[] {
  const q = query.trim().toLocaleLowerCase('uk');
  return items.filter(
    (i) =>
      (filter === 'all' || (filter === 'online' ? i.online : isAway(i, now))) &&
      (!q || i.person.fullName.toLocaleLowerCase('uk').includes(q)),
  );
}

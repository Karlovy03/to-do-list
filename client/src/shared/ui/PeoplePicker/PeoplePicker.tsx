import { useMemo, useState } from 'react';
import type { Person } from '../../api/types';
import { recentPeople, rememberPerson } from '../../lib/recentPeople';
import { t } from '../../lib/texts';
import { Avatar } from '../Avatar';
import { Input } from '../Field';
import { Icon } from '../Icon';
import { searchPeople, suggestPeople } from './suggest';
import css from './PeoplePicker.module.css';

interface Props {
  people: Person[];
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  placeholder: string;
  /** другий рядок під іменем; типово — посада */
  describe?: (p: Person) => string;
  /** підрозділ того, хто обирає: його люди — серед підказок */
  unitId?: string | null;
}

/** Вибір людей: до пошуку — короткі підказки, решта — пошуком або «Показати всіх» */
export function PeoplePicker({ people, selected, onChange, multiple = true, placeholder, describe = (p) => p.position, unitId }: Props) {
  const [query, setQuery] = useState('');
  const [all, setAll] = useState(false);
  const recent = useMemo(() => recentPeople(), []);
  const searching = query.trim().length > 0;
  const list = useMemo(() => {
    if (searching) return searchPeople(people, query, describe);
    if (all) return [...people].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
    return suggestPeople(people, selected, recent, unitId);
  }, [people, query, searching, all, selected, recent, unitId, describe]);
  const hidden = !searching && !all && people.length > list.length;

  const toggle = (id: string) => {
    if (!selected.includes(id)) rememberPerson(id);
    if (!multiple) return onChange([id]);
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className={css.root}>
      <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {list.length > 0 ? (
        <div className={css.list}>
          {list.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button type="button" key={p.id} className={on ? `${css.item} ${css.on}` : css.item} onClick={() => toggle(p.id)} aria-pressed={on}>
                <Avatar person={p} />
                <span className={css.text}>
                  <span className={css.name}>{p.fullName}</span>
                  <span className={css.position}>{describe(p)}</span>
                </span>
                {on && (
                  <span className={css.check}>
                    <Icon name="check" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className={css.hint}>{searching ? t('shared.ui.nothing_found') : t('shared.people.type_to_search', { n: people.length })}</p>
      )}
      {hidden && (
        <button type="button" className={css.more} onClick={() => setAll(true)}>
          {t('shared.people.show_all', { n: people.length })}
        </button>
      )}
    </div>
  );
}

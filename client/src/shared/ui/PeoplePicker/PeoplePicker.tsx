import { useMemo, useState } from 'react';
import type { Person } from '../../api/types';
import { Avatar } from '../Avatar';
import { Input } from '../Field';
import { Icon } from '../Icon';
import css from './PeoplePicker.module.css';

interface Props {
  people: Person[];
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  placeholder: string;
}

/** Список людей із пошуком; обрані — вгорі */
export function PeoplePicker({ people, selected, onChange, multiple = true, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = q ? people.filter((p) => `${p.fullName} ${p.position}`.toLowerCase().includes(q)) : people;
    return [...found].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
  }, [people, query, selected]);

  const toggle = (id: string) => {
    if (!multiple) return onChange([id]);
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className={css.root}>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <div className={css.list}>
        {list.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button type="button" key={p.id} className={on ? `${css.item} ${css.on}` : css.item} onClick={() => toggle(p.id)} aria-pressed={on}>
              <Avatar person={p} />
              <span className={css.text}>
                <span className={css.name}>{p.fullName}</span>
                <span className={css.position}>{p.position}</span>
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
    </div>
  );
}

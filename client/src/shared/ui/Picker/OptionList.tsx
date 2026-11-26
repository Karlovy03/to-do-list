import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { t } from '../../lib/texts';
import { Icon } from '../Icon';
import type { PickerOption } from './Picker';
import css from './OptionList.module.css';

interface Props<T> {
  options: PickerOption<T>[];
  value: T;
  onPick: (v: T) => void;
  searchable?: boolean;
  label: string;
  /** великі рядки для пальця (аркуш на телефоні) */
  large?: boolean;
}

/** Список варіантів: пошук, стрілки, Enter; обраний позначено галочкою */
export function OptionList<T>({ options, value, onPick, searchable, label, large }: Props<T>) {
  const id = useId();
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (searchable ? search.current : list.current)?.focus();
  }, [searchable]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (e: KeyboardEvent) => {
    const last = shown.length - 1;
    if (e.key === 'ArrowDown') setActive((i) => Math.min(last, i + 1));
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(last);
    else if (e.key === 'Enter' && shown[active]) onPick(shown[active].value);
    else return;
    e.preventDefault();
  };

  return (
    <div className={css.wrap} onKeyDown={onKey}>
      {searchable && (
        <div className={css.searchRow}>
          <Icon name="search" size={18} />
          <input
            ref={search}
            className={css.search}
            value={query}
            placeholder={t('shared.ui.search')}
            aria-label={t('shared.ui.search')}
            aria-controls={id}
            aria-activedescendant={shown[active] ? `${id}-${active}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
        </div>
      )}
      <ul
        ref={list}
        id={id}
        role="listbox"
        aria-label={label}
        tabIndex={searchable ? -1 : 0}
        aria-activedescendant={shown[active] ? `${id}-${active}` : undefined}
        className={large ? `${css.list} ${css.large}` : css.list}
      >
        {shown.map((o, i) => {
          const selected = o.value === value;
          return (
            <li
              key={String(o.value)}
              id={`${id}-${i}`}
              data-index={i}
              role="option"
              aria-selected={selected}
              className={[css.option, i === active && css.active, selected && css.selected].filter(Boolean).join(' ')}
              onMouseMove={() => setActive(i)}
              onClick={() => onPick(o.value)}
            >
              <span className={css.text}>
                <span>{o.label}</span>
                {o.hint && <small>{o.hint}</small>}
              </span>
              {selected && <Icon name="check" size={18} />}
            </li>
          );
        })}
        {shown.length === 0 && <li className={css.empty}>{t('shared.ui.nothing_found')}</li>}
      </ul>
    </div>
  );
}

import css from './Segmented.module.css';

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
  label: string;
}

/** Перемикач вкладок; лічильник поруч із назвою */
export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div className={css.root} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? css.on : undefined} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && o.count > 0 && <span className={css.count}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

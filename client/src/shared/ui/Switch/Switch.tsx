import css from './Switch.module.css';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}

export function Switch({ checked, onChange, label, hint }: Props) {
  return (
    <label className={css.row}>
      <span className={css.text}>
        {label}
        {hint && <small className={css.hint}>{hint}</small>}
      </span>
      <input className={css.toggle} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

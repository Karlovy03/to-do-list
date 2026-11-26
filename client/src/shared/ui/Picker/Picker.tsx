import { useRef, useState } from 'react';
import { useWindowClass } from '../../hooks/useWindowClass';
import { t } from '../../lib/texts';
import { Icon } from '../Icon';
import { Popover } from '../Popover';
import { Sheet } from '../Sheet';
import { OptionList } from './OptionList';
import css from './Picker.module.css';

export interface PickerOption<T> {
  value: T;
  label: string;
  /** другий рядок дрібно: посада, установа */
  hint?: string;
}

interface Props<T> {
  value: T;
  options: PickerOption<T>[];
  onChange: (v: T) => void;
  /** назва для екранних читачів і заголовок аркуша на телефоні */
  label: string;
  placeholder?: string;
  searchable?: boolean;
}

/** Випадний список у стилі системи: під полем на Fold і комп'ютері, аркушем знизу на телефоні */
export function Picker<T>({ value, options, onChange, label, placeholder, searchable }: Props<T>) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wc = useWindowClass();
  const phone = wc === 'xs' || wc === 'sm';
  const current = options.find((o) => o.value === value);
  const pick = (v: T) => {
    onChange(v);
    setOpen(false);
    trigger.current?.focus();
  };
  const list = <OptionList options={options} value={value} onPick={pick} searchable={searchable} label={label} large={phone} />;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={open ? `${css.trigger} ${css.open}` : css.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current ? `${label}: ${current.label}` : label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={current ? css.value : css.placeholder}>{current?.label ?? placeholder ?? t('shared.ui.choose')}</span>
        <Icon name="chevron" size={18} />
      </button>
      {open &&
        (phone ? (
          <Sheet solid title={label} onClose={() => setOpen(false)}>
            {list}
          </Sheet>
        ) : (
          <Popover anchor={trigger} onClose={() => setOpen(false)}>
            {list}
          </Popover>
        ))}
    </>
  );
}

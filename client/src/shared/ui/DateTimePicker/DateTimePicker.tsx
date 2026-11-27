import { useRef, useState } from 'react';
import { useWindowClass } from '../../hooks/useWindowClass';
import { t } from '../../lib/texts';
import { formatDeadline } from '../../lib/time';
import { Button } from '../Button';
import { Icon, type IconName } from '../Icon';
import { Popover } from '../Popover';
import { Sheet } from '../Sheet';
import { CalendarPanel } from './CalendarPanel';
import css from './DateTimePicker.module.css';

interface Props {
  value: Date | null;
  onChange: (d: Date) => void;
  label: string;
  defaultHour?: number;
  /** лише день (DatePicker) */
  withTime?: boolean;
  minDay?: { y: number; m: number; d: number };
  /** як показати значення в полі; типово — «сьогодні, 18:00» */
  format?: (d: Date) => string;
  icon?: IconName;
}

/** Поле дати й часу з власним календарем: під полем на Fold і комп'ютері, аркушем на телефоні */
export function DateTimePicker({ value, onChange, label, defaultHour, withTime, minDay, format = formatDeadline, icon = 'clock' }: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wc = useWindowClass();
  const phone = wc === 'xs' || wc === 'sm';
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const panel = <CalendarPanel value={value} defaultHour={defaultHour} onChange={onChange} withTime={withTime} minDay={minDay} />;
  const done = (
    <Button variant="primary" size={phone ? 'l' : 'm'} block onClick={close}>
      {t('shared.ui.done')}
    </Button>
  );

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={open ? `${css.trigger} ${css.open}` : css.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `${label}: ${format(value)}` : label}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={icon} size={18} />
        <span className={value ? css.value : css.placeholder}>{value ? format(value) : t('shared.ui.pick_date')}</span>
      </button>
      {open &&
        (phone ? (
          <Sheet solid title={label} onClose={close} footer={done}>
            {panel}
          </Sheet>
        ) : (
          <Popover anchor={trigger} onClose={close} width={340}>
            <div className={css.scroll}>{panel}</div>
            <div className={css.footer}>{done}</div>
          </Popover>
        ))}
    </>
  );
}

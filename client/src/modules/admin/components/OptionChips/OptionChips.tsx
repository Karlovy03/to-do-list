import { t } from '@/shared/lib/texts';
import { Chip, Chips } from '@/shared/ui';
import css from './OptionChips.module.css';

interface Props {
  label: string;
  options: { value: number; key: string }[];
  selected: number[];
  onToggle: (value: number) => void;
}

/** Підпис і варіанти-капсули; один чи кілька вибраних вирішує той, хто викликає */
export function OptionChips({ label, options, selected, onToggle }: Props) {
  return (
    <div className={css.group} role="group" aria-label={label}>
      <span className={css.label}>{label}</span>
      <Chips>
        {options.map((o) => (
          <Chip key={o.value} on={selected.includes(o.value)} onClick={() => onToggle(o.value)}>
            {t(`admin.reminders.${o.key}`)}
          </Chip>
        ))}
      </Chips>
    </div>
  );
}

import { t } from '@/shared/lib/texts';
import { Chip, Chips, FieldGroup } from '@/shared/ui';
import { INTERVALS } from '../../lib/controlInput';

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  /** підпис для варіанта «за налаштуваннями» */
  defaultLabel?: string;
}

/** Як часто нагадувати по контрольних: капсули замість випадного списку */
export function IntervalChips({ value, onChange, label, defaultLabel }: Props) {
  return (
    <FieldGroup label={label}>
      <Chips>
        {INTERVALS.map((v) => (
          <Chip key={String(v)} on={value === v} onClick={() => onChange(v)}>
            {v === null ? (defaultLabel ?? t('control.intervals.chip_default')) : t(`control.intervals.chip_${v}`)}
          </Chip>
        ))}
      </Chips>
    </FieldGroup>
  );
}

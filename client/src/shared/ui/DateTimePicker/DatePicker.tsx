import { dayOf, dayTitle, noonOf } from '../../lib/days';
import { DateTimePicker } from './DateTimePicker';

const partsOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
};

interface Props {
  /** день «РРРР-ММ-ДД» за Києвом */
  value: string;
  onChange: (day: string) => void;
  label: string;
  /** найраніший день; типово — сьогодні */
  min?: string;
}

/** Вибір дня без часу — той самий власний календар, що й для терміну (без системних вікон браузера) */
export function DatePicker({ value, onChange, label, min }: Props) {
  return (
    <DateTimePicker
      label={label}
      value={noonOf(value)}
      onChange={(d) => onChange(dayOf(d))}
      withTime={false}
      minDay={min ? partsOf(min) : undefined}
      format={(d) => dayTitle(dayOf(d))}
      icon="calendar"
    />
  );
}

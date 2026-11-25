import { Icon } from '../Icon';
import css from './TimeChip.module.css';

export type TimeTone = 'calm' | 'soon' | 'late' | 'done';

const ICON = { calm: 'clock', soon: 'clock', late: 'alert', done: 'check' } as const;

/** Термін і залишок разом; колір = терміновість */
export function TimeChip({ tone, time, rest }: { tone: TimeTone; time: string; rest?: string }) {
  return (
    <span className={`${css.chip} ${css[tone]}`}>
      <Icon name={ICON[tone]} size={15} />
      <b>{time}</b>
      {rest && <span className={css.rest}>{rest}</span>}
    </span>
  );
}

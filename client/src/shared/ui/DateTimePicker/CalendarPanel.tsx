import { useState } from 'react';
import { addMonths, compareDays, monthGrid, monthTitle, weekdayNames } from '../../lib/calendar';
import { t } from '../../lib/texts';
import { fromKyiv, kyivParts, type KyivParts } from '../../lib/time';
import { IconButton } from '../Button';
import css from './CalendarPanel.module.css';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];
const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  value: Date | null;
  /** типова година, якщо значення ще немає */
  defaultHour?: number;
  onChange: (d: Date) => void;
  /** лише день, без годин і хвилин (відсутності) */
  withTime?: boolean;
  /** найраніший день, який можна обрати; типово — сьогодні */
  minDay?: { y: number; m: number; d: number };
}

/** Місяць + години й хвилини; усе за Києвом. Дні в минулому вимкнено */
export function CalendarPanel({ value, defaultHour = 18, onChange, withTime = true, minDay }: Props) {
  const today = kyivParts(new Date());
  const first = minDay ?? today;
  const start: KyivParts = value ? kyivParts(value) : { ...today, h: defaultHour, min: 0 };
  const [draft, setDraft] = useState(start);
  const [view, setView] = useState({ y: start.y, m: start.m });

  const update = (patch: Partial<KyivParts>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(fromKyiv(next.y, next.m, next.d, next.h, next.min));
  };
  const shift = (n: number) => setView((v) => addMonths(v.y, v.m, n));
  const canGoBack = compareDays({ ...view, d: 1 }, { ...first, d: 1 }) > 0;

  return (
    <div className={css.panel}>
      <div className={css.head}>
        <b className={css.month}>{monthTitle(view.y, view.m)}</b>
        <IconButton icon="back" tone="sunken" label={t('shared.ui.prev_month')} disabled={!canGoBack} onClick={() => shift(-1)} />
        <IconButton icon="chevron" tone="sunken" label={t('shared.ui.next_month')} onClick={() => shift(1)} />
      </div>
      <div className={css.grid} role="grid" aria-label={monthTitle(view.y, view.m)}>
        {weekdayNames().map((w) => (
          <span key={w} className={css.weekday} role="columnheader">{w}</span>
        ))}
        {monthGrid(view.y, view.m).map((day) => {
          const past = compareDays(day, first) < 0;
          const chosen = compareDays(day, draft) === 0;
          const isToday = compareDays(day, today) === 0;
          return (
            <button
              key={`${day.m}-${day.d}`}
              type="button"
              role="gridcell"
              aria-selected={chosen}
              aria-current={isToday ? 'date' : undefined}
              disabled={past}
              className={[css.day, !day.inMonth && css.outside, isToday && css.today, chosen && css.chosen].filter(Boolean).join(' ')}
              onClick={() => update({ y: day.y, m: day.m, d: day.d })}
            >
              {day.d}
            </button>
          );
        })}
      </div>
      {withTime && (
      <>
      <div className={css.timeHead}>
        <span>{t('shared.ui.time')}</span>
        <b className={css.timeValue}>{`${pad(draft.h)}:${pad(draft.min)}`}</b>
      </div>
      <div className={css.hours} role="radiogroup" aria-label={t('shared.ui.hour')}>
        {HOURS.map((h) => (
          <button key={h} type="button" role="radio" aria-checked={draft.h === h} className={draft.h === h ? `${css.cell} ${css.chosen}` : css.cell} onClick={() => update({ h })}>
            {pad(h)}
          </button>
        ))}
      </div>
      <div className={css.minutes} role="radiogroup" aria-label={t('shared.ui.minutes')}>
        {MINUTES.map((min) => (
          <button key={min} type="button" role="radio" aria-checked={draft.min === min} className={draft.min === min ? `${css.cell} ${css.chosen}` : css.cell} onClick={() => update({ min })}>
            {`:${pad(min)}`}
          </button>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

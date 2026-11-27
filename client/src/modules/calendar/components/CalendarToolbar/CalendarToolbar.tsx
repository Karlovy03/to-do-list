import { t } from '@/shared/lib/texts';
import { Icon, IconButton, Segmented } from '@/shared/ui';
import type { Mode } from '../../lib/range';
import css from './CalendarToolbar.module.css';

interface Props {
  mode: Mode;
  title: string;
  /** «Кого показати»; виконавцю кнопки немає — у його вертикалі лише він сам */
  who?: { label: string; icon: 'user' | 'users'; onOpen: () => void };
  onMode: (m: Mode) => void;
  onShift: (dir: 1 | -1) => void;
  onToday: () => void;
}

/** День/Тиждень, ‹ період ›, «Сьогодні», «Кого показати» (Figma 15, 18) */
export function CalendarToolbar({ mode, title, who, onMode, onShift, onToday }: Props) {
  return (
    <div className={css.toolbar}>
      <div className={css.mode}>
        <Segmented<Mode>
          label={t('calendar.toolbar.mode')}
          value={mode}
          onChange={onMode}
          options={[
            { value: 'day', label: t('calendar.toolbar.day') },
            { value: 'week', label: t('calendar.toolbar.week') },
          ]}
        />
      </div>
      <div className={css.period}>
        <IconButton icon="back" tone="glass" label={t('calendar.toolbar.prev')} onClick={() => onShift(-1)} />
        <h2 className={css.title} aria-live="polite">{title}</h2>
        <IconButton icon="chevron" tone="glass" label={t('calendar.toolbar.next')} onClick={() => onShift(1)} />
      </div>
      <div className={css.extra}>
        {who && (
          <button type="button" className={css.who} aria-haspopup="dialog" onClick={who.onOpen}>
            <Icon name={who.icon} size={18} />
            <span className={css.whoLabel}>{who.label}</span>
            <span className={css.caret} aria-hidden="true">▾</span>
          </button>
        )}
        <button type="button" className={css.today} onClick={onToday}>
          {t('calendar.toolbar.today')}
        </button>
      </div>
    </div>
  );
}

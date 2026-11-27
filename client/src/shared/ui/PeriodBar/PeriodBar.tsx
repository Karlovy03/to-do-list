import type { ReactNode } from 'react';
import { t } from '../../lib/texts';
import { IconButton } from '../Button';
import { Icon } from '../Icon';
import css from './PeriodBar.module.css';

interface Props {
  /** «Сьогодні, 26 листопада», «23–29 листопада» */
  title: string;
  /** перед періодом: перемикач «День | Тиждень» у календарі */
  lead?: ReactNode;
  /** «Кого показати»: підрозділ чи людина; немає — кнопки немає */
  who?: { label: string; icon: 'user' | 'users'; onOpen: () => void };
  onShift: (dir: 1 | -1) => void;
  onToday: () => void;
}

/** ‹ період ›, «Сьогодні», «кого показати» — календар і «В строю» (Figma 15, 18, 23, 30) */
export function PeriodBar({ title, lead, who, onShift, onToday }: Props) {
  return (
    <div className={css.frame}>
      <div className={css.toolbar}>
        {lead && <div className={css.mode}>{lead}</div>}
        <div className={css.period}>
          <IconButton icon="back" tone="glass" label={t('shared.ui.earlier')} onClick={() => onShift(-1)} />
          <h2 className={css.title} aria-live="polite">{title}</h2>
          <IconButton icon="chevron" tone="glass" label={t('shared.ui.later')} onClick={() => onShift(1)} />
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
            {t('shared.ui.today')}
          </button>
        </div>
      </div>
    </div>
  );
}

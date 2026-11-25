import type { ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import css from './Chips.module.css';

export function Chips({ children }: { children: ReactNode }) {
  return <div className={css.row}>{children}</div>;
}

export function Chip({ on, onClick, icon, children }: { on?: boolean; onClick: () => void; icon?: IconName; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={!!on} className={on ? `${css.chip} ${css.on}` : css.chip} onClick={onClick}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

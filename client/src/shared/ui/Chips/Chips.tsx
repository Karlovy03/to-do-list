import type { ReactNode } from 'react';
import css from './Chips.module.css';

export function Chips({ children }: { children: ReactNode }) {
  return <div className={css.row}>{children}</div>;
}

export function Chip({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={!!on} className={on ? `${css.chip} ${css.on}` : css.chip} onClick={onClick}>
      {children}
    </button>
  );
}

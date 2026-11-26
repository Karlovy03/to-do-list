import type { ReactNode } from 'react';
import css from './ActionDock.module.css';

/** Скляна панель дій під карткою (завдання, захід); на телефоні висить над краєм екрана */
export function ActionDock({ floating, children }: { floating?: boolean; children: ReactNode }) {
  return (
    <div className={floating ? `${css.dock} ${css.floating}` : css.dock} data-print="hide">
      {children}
    </div>
  );
}

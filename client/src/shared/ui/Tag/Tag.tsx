import type { ReactNode } from 'react';
import css from './Tag.module.css';

export type TagTone = 'urgent' | 'late' | 'done' | 'info' | 'neutral' | 'sky';

/** Мітка звичайним регістром; для контролю — ControlSeal */
export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return <span className={`${css.tag} ${css[tone]}`}>{children}</span>;
}

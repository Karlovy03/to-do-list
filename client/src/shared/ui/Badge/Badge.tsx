import type { ReactNode } from 'react';
import css from './Badge.module.css';

export type BadgeTone = 'control' | 'warn' | 'ok' | 'info' | 'muted' | 'gold' | 'urgent';

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`${css.badge} ${css[tone]}`}>{children}</span>;
}

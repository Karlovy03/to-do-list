import type { ReactNode } from 'react';
import css from './Card.module.css';

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className={css.card}>
      {(title || actions) && (
        <header className={css.head}>
          {title && <h2 className={css.title}>{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className={css.section}>{children}</h3>;
}

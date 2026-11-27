import type { ReactNode } from 'react';
import css from './PageHeader.module.css';

/** Великий заголовок екрана з рядком над ним (дата, ім'я, «2 нових»); дії — праворуч */
export function PageHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: string; actions?: ReactNode }) {
  return (
    <header className={css.header}>
      <div className={css.titles}>
        {eyebrow && <p className={css.eyebrow}>{eyebrow}</p>}
        <h1 className={css.title}>{title}</h1>
      </div>
      {actions && <div className={css.actions}>{actions}</div>}
    </header>
  );
}

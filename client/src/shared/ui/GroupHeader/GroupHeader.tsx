import css from './GroupHeader.module.css';

export type GroupTone = 'late' | 'today' | 'upcoming' | 'done';

export function GroupHeader({ tone, title, count }: { tone: GroupTone; title: string; count: number }) {
  return (
    <h2 className={css.group}>
      <span className={`${css.dot} ${css[tone]}`} aria-hidden="true" />
      {title}
      <span className={css.count}>{count}</span>
    </h2>
  );
}

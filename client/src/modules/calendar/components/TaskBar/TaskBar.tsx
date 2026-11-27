import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import type { PlacedTask } from '../../lib/rows';
import css from './TaskBar.module.css';

/** Смуга завдання (Figma «Календар / Смуга завдання»): тон як у часового чипа, обріз — стрілкою */
export function TaskBar({ item, to }: { item: PlacedTask; to: string }) {
  const { task, tone, placed } = item;
  const style = { left: `${placed.left}%`, width: `${placed.width}%`, '--lane': item.lane } as CSSProperties;
  return (
    <Link to={to} className={`${css.bar} ${css[tone]}`} style={style} aria-label={t('calendar.grid.task', { n: task.number, title: task.title })}>
      {placed.cutStart && <span className={css.cut} aria-hidden="true">‹</span>}
      {task.controlled && <Icon name="shieldCheck" size={14} />}
      <span className={css.title}>{task.title}</span>
      {placed.cutEnd && <span className={`${css.cut} ${css.end}`} aria-hidden="true">›</span>}
    </Link>
  );
}

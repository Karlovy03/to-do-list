import { t } from '@/shared/lib/texts';
import { Avatar } from '@/shared/ui';
import type { PersonRow as Row } from '../../api/monitoring.api';
import { daysOfMonth, isAway, seen } from '../../lib/format';
import css from './PersonRow.module.css';

/** Людина (Figma «Моніторинг / Людина»): крапка стану на аватарі, підрозділ і посада, коли була, днів за місяць */
export function PersonRow({ row, short, onOpen }: { row: Row; short?: boolean; onOpen: () => void }) {
  const state = row.online ? 'online' : isAway(row) ? 'away' : 'recent';
  const where = short ? row.unitName : [row.unitName, row.person.position].filter(Boolean).join(' · ');
  return (
    <button type="button" className={css.row} onClick={onOpen}>
      <span className={css.avatar}>
        <Avatar person={row.person} large />
        <span className={`${css.dot} ${css[state]}`} />
      </span>
      <span className={css.who}>
        <span className={css.name}>{row.person.fullName}</span>
        {where && <small className={css.sub}>{where}</small>}
      </span>
      <span className={css.when}>
        <span className={`${css.status} ${css[`${state}Text`]}`}>{row.online ? t('monitoring.people.status_online') : seen(row.lastAt)}</span>
        <small className={css.sub}>{row.days30 ? daysOfMonth(row.days30) : '—'}</small>
      </span>
    </button>
  );
}

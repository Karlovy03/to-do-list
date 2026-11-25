import { NavLink } from 'react-router-dom';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import { PRIMARY_NAV } from '../navItems';
import css from './Rail.module.css';

/** Внутрішній екран Fold і планшет: вертикальна скляна рейка */
export function Rail({ unread, onCreate }: { unread: number; onCreate: () => void }) {
  return (
    <nav className={css.rail} aria-label={t('app.nav.main')} data-print="hide">
      <button type="button" className={css.fab} onClick={onCreate} aria-label={t('app.nav.new_task')}>
        <Icon name="plus" size={24} />
      </button>
      {PRIMARY_NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? `${css.item} ${css.on}` : css.item)}>
          <span className={css.icon}>
            <Icon name={item.icon} size={22} />
            {item.unread && unread > 0 && <span className={css.dot} />}
          </span>
          <span className={css.label}>{t(item.label)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

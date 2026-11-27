import { NavLink, useLocation } from 'react-router-dom';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import { isCurrent, PRIMARY_NAV } from '../navItems';
import css from './Rail.module.css';

/** Внутрішній екран Fold і планшет: вертикальна скляна рейка */
export function Rail({ unread, onCreate }: { unread: number; onCreate: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className={css.rail} aria-label={t('app.nav.main')} data-print="hide">
      <button type="button" className={css.fab} onClick={onCreate} aria-label={t('app.nav.create')}>
        <Icon name="plus" size={24} />
      </button>
      {PRIMARY_NAV.map((item) => (
        <NavLink key={item.to} to={item.to} className={isCurrent(item, pathname) ? `${css.item} ${css.on}` : css.item} aria-current={isCurrent(item, pathname) ? 'page' : undefined}>
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

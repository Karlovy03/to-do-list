import { NavLink } from 'react-router-dom';
import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import { PRIMARY_NAV } from '../navItems';
import css from './BottomNav.module.css';

/** Телефон: плаваюча скляна капсула і окрема кнопка «+» (One UI) */
export function BottomNav({ unread, onCreate }: { unread: number; onCreate: () => void }) {
  return (
    <div className={css.wrap} data-print="hide">
      <nav className={css.capsule} aria-label={t('app.nav.main')}>
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? `${css.item} ${css.on}` : css.item)}>
            <span className={css.icon}>
              <Icon name={item.icon} size={22} />
              {item.unread && unread > 0 && <span className={css.dot}>{unread > 9 ? '9+' : unread}</span>}
            </span>
            <span className={css.label}>{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>
      <button type="button" className={css.fab} onClick={onCreate} aria-label={t('app.nav.new_task')}>
        <Icon name="plus" size={26} />
      </button>
    </div>
  );
}

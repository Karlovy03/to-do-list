import { NavLink } from 'react-router-dom';
import type { Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Avatar, BrandMark, Button, Icon, IconButton } from '@/shared/ui';
import { SIDEBAR_NAV, visible } from '../navItems';
import css from './Sidebar.module.css';

/** Комп'ютер і DeX: плаваюча скляна бічна панель зі знаком МВС */
export function Sidebar({ me, unread, onCreate, onLogout }: { me: Me; unread: number; onCreate: () => void; onLogout: () => void }) {
  return (
    <aside className={css.sidebar} data-print="hide">
      <div className={css.brand}>
        <BrandMark size={40} label={t('shared.ui.brand')} />
        <span className={css.name}>{t('app.common.name')}</span>
      </div>
      <Button variant="primary" size="m" icon="plus" block onClick={onCreate}>
        {t('app.nav.new_task')}
      </Button>
      <nav className={css.nav} aria-label={t('app.nav.main')}>
        {visible(SIDEBAR_NAV, me.role).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? `${css.item} ${css.on}` : css.item)}>
            <Icon name={item.icon} size={20} />
            <span className={css.label}>{t(item.label)}</span>
            {item.unread && unread > 0 && <span className={css.count}>{unread}</span>}
          </NavLink>
        ))}
      </nav>
      <div className={css.me}>
        <Avatar person={me} large />
        <div className={css.meText}>
          <b>{me.fullName}</b>
          <small>{me.position}</small>
        </div>
        <IconButton icon="logout" label={t('app.nav.logout')} onClick={onLogout} />
      </div>
    </aside>
  );
}

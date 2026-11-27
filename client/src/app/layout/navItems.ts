import type { IconName } from '@/shared/ui';
import type { Role } from '@/shared/api/types';

export interface NavItem {
  to: string;
  label: string; // ключ тексту
  icon: IconName;
  /** для кого показувати */
  roles?: Role[];
  /** лічильник непрочитаних сповіщень */
  unread?: boolean;
  /** які ще адреси підсвічують пункт (вкладки й картки розділу) */
  match?: RegExp;
}

/** Телефон і рейка (Figma «v3/Навігація»): п'ять розділів; «Контроль» — вкладка в «Завданнях», «Ще» — налаштування */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'app.nav.tasks', icon: 'list', match: /^\/(t\/|control|authored|all)/ },
  { to: '/events', label: 'app.nav.events', icon: 'event' },
  { to: '/calendar', label: 'app.nav.calendar', icon: 'calendar' },
  { to: '/notifications', label: 'app.nav.notifications', icon: 'bell', unread: true },
  { to: '/settings', label: 'app.nav.more', icon: 'settings' },
];

/** Бічна панель комп'ютера (Figma 18): усі розділи */
export const SIDEBAR_NAV: NavItem[] = [
  { to: '/', label: 'app.nav.tasks', icon: 'list', match: /^\/(t\/|authored|all)/ },
  { to: '/events', label: 'app.nav.events', icon: 'event' },
  { to: '/calendar', label: 'app.nav.calendar', icon: 'calendar' },
  { to: '/control', label: 'app.nav.control', icon: 'shield' },
  { to: '/notifications', label: 'app.nav.notifications', icon: 'bell', unread: true },
  { to: '/report', label: 'app.nav.report', icon: 'printer', roles: ['ADMIN', 'DIRECTOR', 'MANAGER'] },
  { to: '/settings', label: 'app.nav.settings', icon: 'settings' },
  { to: '/admin', label: 'app.nav.admin', icon: 'admin', roles: ['ADMIN'] },
];

export const visible = (items: NavItem[], role: Role) => items.filter((i) => !i.roles || i.roles.includes(role));

/** Активний пункт: сама адреса розділу (для «/» — лише точна) або адреси, що до нього належать */
export function isCurrent(item: NavItem, pathname: string) {
  if (item.match?.test(pathname)) return true;
  return item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(`${item.to}/`);
}

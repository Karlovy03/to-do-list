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
}

/** Телефон і рейка: чотири розділи; «Ще» веде до налаштувань */
export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'app.nav.tasks', icon: 'list' },
  { to: '/control', label: 'app.nav.control', icon: 'shield' },
  { to: '/notifications', label: 'app.nav.notifications', icon: 'bell', unread: true },
  { to: '/settings', label: 'app.nav.more', icon: 'settings' },
];

/** Бічна панель комп'ютера: усі розділи */
export const SIDEBAR_NAV: NavItem[] = [
  { to: '/', label: 'app.nav.tasks', icon: 'list' },
  { to: '/control', label: 'app.nav.control', icon: 'shield' },
  { to: '/notifications', label: 'app.nav.notifications', icon: 'bell', unread: true },
  { to: '/report', label: 'app.nav.report', icon: 'printer', roles: ['ADMIN', 'DIRECTOR', 'MANAGER'] },
  { to: '/settings', label: 'app.nav.settings', icon: 'settings' },
  { to: '/admin', label: 'app.nav.admin', icon: 'admin', roles: ['ADMIN'] },
];

export const visible = (items: NavItem[], role: Role) => items.filter((i) => !i.roles || i.roles.includes(role));

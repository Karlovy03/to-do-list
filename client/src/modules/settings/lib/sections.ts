import type { Role } from '@/shared/api/types';
import type { IconName } from '@/shared/ui';

const MANAGERS: Role[] = ['ADMIN', 'DIRECTOR', 'MANAGER'];

export interface Section {
  to: string;
  label: string;
  icon: IconName;
  roles?: Role[];
}

/** «Ще → Розділи» (Figma 25, 42): «Шаблони» — усім; «В строю» й «Довідка» — керівникам; «Адміністрування» — адміністратору */
const SECTIONS: Section[] = [
  { to: '/templates', label: 'app.nav.templates', icon: 'doc' },
  { to: '/strength', label: 'app.nav.strength', icon: 'users', roles: MANAGERS },
  { to: '/report', label: 'app.nav.report', icon: 'printer', roles: MANAGERS },
  { to: '/admin', label: 'app.nav.admin', icon: 'admin', roles: ['ADMIN'] },
];

export const sectionsFor = (role: Role) => SECTIONS.filter((s) => !s.roles || s.roles.includes(role));

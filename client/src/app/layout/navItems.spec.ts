import { describe, expect, it } from 'vitest';
import { isCurrent, PRIMARY_NAV, SIDEBAR_NAV } from './navItems';

const active = (items: typeof PRIMARY_NAV, path: string) => items.filter((i) => isCurrent(i, path)).map((i) => i.to);

describe('активний пункт навігації', () => {
  it('на телефоні «Контроль» — вкладка «Завдань», тож підсвічує «Завдання»', () => {
    for (const path of ['/', '/control', '/authored/t/1', '/t/9', '/all']) expect(active(PRIMARY_NAV, path)).toEqual(['/']);
  });
  it('заходи й календар — разом із картками всередині', () => {
    expect(active(PRIMARY_NAV, '/events/e/5')).toEqual(['/events']);
    expect(active(PRIMARY_NAV, '/calendar/t/7')).toEqual(['/calendar']);
  });
  it('у бічній панелі «Контроль» — окремий пункт', () => {
    expect(active(SIDEBAR_NAV, '/control/t/3')).toEqual(['/control']);
    expect(active(SIDEBAR_NAV, '/authored')).toEqual(['/']);
  });
  it('жодна адреса не підсвічує двох пунктів одразу', () => {
    for (const path of ['/', '/control', '/events', '/calendar/e/1', '/strength', '/notifications', '/settings', '/report', '/templates', '/admin/users']) {
      expect(active(SIDEBAR_NAV, path).length).toBeLessThanOrEqual(1);
      expect(active(PRIMARY_NAV, path).length).toBeLessThanOrEqual(1);
    }
  });
  it('на телефоні розділи з «Ще → Розділи» підсвічують «Ще» (Figma 42); у бічній панелі «Шаблони» — свій пункт для всіх', () => {
    for (const path of ['/templates', '/strength', '/report']) expect(active(PRIMARY_NAV, path)).toEqual(['/settings']);
    expect(active(PRIMARY_NAV, '/templatesx')).toEqual([]);
    expect(active(SIDEBAR_NAV, '/templates')).toEqual(['/templates']);
    expect(SIDEBAR_NAV.find((i) => i.to === '/templates')?.roles).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import type { Absence, Me, Person, Unit } from '@/shared/api/types';
import { readStrength, writeStrength } from './params';
import { byUnit, peopleOf, presentByUnit } from './strength';

const NOW = new Date('2026-11-26T10:00:00Z');
const me = { id: 'head', role: 'MANAGER', unitId: 'dept' } as Me;
const units = [
  { id: 'dept', name: 'Управління', parentId: null },
  { id: 'b', name: 'Відділ контролю', parentId: 'dept' },
  { id: 'a', name: 'Відділ аналітики', parentId: 'dept' },
] as Unit[];
const person = (id: string, unitId: string | null, isActive = true) => ({ id, fullName: id, unitId, isActive }) as Person;
const people = [person('head', 'dept'), person('bondar', 'a'), person('shevchenko', 'b'), person('fired', 'b', false), person('nobody', null)];

describe('адреса «В строю»', () => {
  it('без параметрів — сьогодні, свій підрозділ із підпорядкованими', () => {
    expect(readStrength(new URLSearchParams(), me, NOW)).toEqual({ day: '2026-11-26', unitId: 'dept', sub: true });
  });
  it('звичайне не пишеться в адресу; інше — пишеться й читається назад', () => {
    expect(writeStrength({ day: '2026-11-26', unitId: 'dept', sub: true }, me, NOW).toString()).toBe('');
    const p = { day: '2026-12-01', unitId: 'b', sub: false };
    expect(readStrength(writeStrength(p, me, NOW), me, NOW)).toEqual(p);
  });
  it('зіпсована дата — сьогодні', () => {
    expect(readStrength(new URLSearchParams('date=2026-13-45'), me, NOW).day).toBe('2026-11-26');
  });
});

describe('склад підрозділу', () => {
  it('з підпорядкованими — усі, хто служить; без — лише сам підрозділ', () => {
    expect(peopleOf('dept', true, units, people).map((p) => p.id)).toEqual(['bondar', 'head', 'shevchenko']);
    expect(peopleOf('dept', false, units, people).map((p) => p.id)).toEqual(['head']);
  });
  it('відсутні за підрозділами — у порядку дерева, порожні не показуються', () => {
    const absent = [person('shevchenko', 'b'), person('bondar', 'a')].map((p) => ({ person: p, absence: {} as Absence }));
    expect(byUnit(absent, units).map((g) => [g.unit.id, g.items.map((x) => x.person.id)])).toEqual([['a', ['bondar']], ['b', ['shevchenko']]]);
  });
  it('в строю за підрозділами — у порядку дерева, як на папері «Особовий склад»', () => {
    expect(presentByUnit([person('shevchenko', 'b'), person('head', 'dept'), person('bondar', 'a')], units).map((g) => [g.unit.id, g.people.map((p) => p.id)])).toEqual([['dept', ['head']], ['a', ['bondar']], ['b', ['shevchenko']]]);
  });
});

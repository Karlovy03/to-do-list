import { describe, expect, it } from 'vitest';
import type { Me, Person, Unit } from '@/shared/api/types';
import { headcount, verticalOf } from './vertical';

const units = [
  { id: 'top', name: 'Управління', parentId: null },
  { id: 'a', name: 'Відділ аналітики', parentId: 'top' },
  { id: 'b', name: 'Відділ контролю', parentId: 'top' },
] as Unit[];
const p = (id: string, unitId: string | null, isActive = true) => ({ id, unitId, isActive, fullName: id }) as Person;
const people = [p('boss', 'top'), p('a1', 'a'), p('a2', 'a'), p('b1', 'b'), p('gone', 'a', false), p('nowhere', null)];

describe('вертикаль у меню «Кого показати»', () => {
  it('керівник відділу бачить лише свій відділ і його людей — сусіднього немає', () => {
    const v = verticalOf({ role: 'MANAGER', unitId: 'a' } as Me, units, people);
    expect(v.units.map((u) => u.id)).toEqual(['a']);
    expect(v.people.map((x) => x.id)).toEqual(['a1', 'a2']);
  });
  it('директор — усі підрозділи в порядку дерева й усі активні люди', () => {
    const v = verticalOf({ role: 'DIRECTOR', unitId: 'top' } as Me, units, people);
    expect(v.units.map((u) => u.id)).toEqual(['top', 'a', 'b']);
    expect(v.people).toHaveLength(5);
  });
  it('скільки людей: сам підрозділ або з підпорядкованими', () => {
    const active = people.filter((x) => x.isActive);
    expect(headcount('top', units, active, false)).toBe(1);
    expect(headcount('top', units, active, true)).toBe(4);
  });
});

import { describe, expect, it } from 'vitest';
import type { Person } from '../../api/types';
import { searchPeople, suggestPeople, SUGGEST_LIMIT } from './suggest';

const person = (id: string, unitId: string | null = 'other'): Person => ({ id, fullName: `Особа ${id}`, position: 'Інспектор', role: 'MEMBER', unitId, isActive: true });
const staff = Array.from({ length: 50 }, (_, i) => person(`p${i}`, i < 3 ? 'mine' : 'other'));

describe('підказки у виборі людей', () => {
  it('до пошуку не показує всіх 50 — лише обраних, нещодавніх і свій підрозділ', () => {
    const s = suggestPeople(staff, ['p40'], ['p20', 'p21'], 'mine').map((p) => p.id);
    expect(s).toEqual(['p40', 'p20', 'p21', 'p0', 'p1', 'p2']);
  });

  it('не більше ліміту, але обрані — завжди, навіть понад ліміт', () => {
    const selected = staff.slice(10, 20).map((p) => p.id);
    expect(suggestPeople(staff, selected, [], null)).toHaveLength(10);
    expect(suggestPeople(staff, [], staff.map((p) => p.id), null)).toHaveLength(SUGGEST_LIMIT);
  });

  it('нещодавні, яких уже немає серед активних, пропускаються', () => {
    expect(suggestPeople(staff, [], ['gone'], null)).toEqual([]);
  });

  it('пошук — за ПІБ і описом, без урахування регістру', () => {
    expect(searchPeople(staff, 'особа p4', (p) => p.position).map((p) => p.id)).toContain('p40');
    expect(searchPeople(staff, 'ІНСПЕКТОР', (p) => p.position)).toHaveLength(50);
  });
});

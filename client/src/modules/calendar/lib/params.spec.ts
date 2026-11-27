import { describe, expect, it } from 'vitest';
import type { Me } from '@/shared/api/types';
import { rangeQuery, readParams, writeParams } from './params';

const NOW = new Date('2026-11-26T09:20:00Z');
const lead = { role: 'MANAGER', unitId: 'u2' } as Me;
const member = { role: 'MEMBER', unitId: 'u2' } as Me;
const read = (s: string, me: Me = lead) => readParams(new URLSearchParams(s), me, NOW);

describe('стан календаря в адресі', () => {
  it('порожня адреса: сьогодні, «День»; керівник — свій підрозділ із підпорядкованими, виконавець — себе', () => {
    expect(read('')).toEqual({ mode: 'day', day: '2026-11-26', filter: { kind: 'unit', unitId: 'u2', sub: true } });
    expect(read('', member).filter).toEqual({ kind: 'me' });
  });
  it('зіпсована дата — сьогодні', () => {
    expect(read('date=2026-13-45').day).toBe('2026-11-26');
  });
  it('у «Тижні» підрозділ замінюється на «мене»', () => {
    expect(read('mode=week&unit=u2').filter).toEqual({ kind: 'me' });
  });
  it('туди й назад без втрат', () => {
    for (const s of ['who=me', 'unit=u1&sub=0', 'mode=week&date=2026-12-01&person=p9']) {
      expect(writeParams(read(s), NOW).toString()).toBe(s);
    }
  });
  it('запит до сервера: межі періоду і рівно один фільтр', () => {
    expect(rangeQuery(read('unit=u1&sub=0'))).toEqual({ from: '2026-11-25T22:00:00.000Z', to: '2026-11-26T22:00:00.000Z', unit: 'u1', sub: '0' });
    expect(rangeQuery(read('who=me'))).not.toHaveProperty('unit');
  });
});

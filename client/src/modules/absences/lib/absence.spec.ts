import { describe, expect, it } from 'vitest';
import type { Absence, Person } from '@/shared/api/types';
import { absenceLabel, absenceOf, absenceWhen, covers, daysLabel, deadlineHits, returnDay } from './absence';
import { strengthOn, upcomingFor } from './strength';

const TODAY = '2026-11-26';
const person = (id: string) => ({ id, fullName: id }) as Person;
const absence = (id: string, personId: string, kind: Absence['kind'], startDay: string, endDay: string) => ({ id, kind, startDay, endDay, person: person(personId) }) as Absence;
const sick = absence('a1', 'bondar', 'SICK_LEAVE', '2026-11-26', '2026-11-28');

describe('межі відсутності — цілі дні, кінець включно', () => {
  it('«26–28» — 28-го ще відсутній, 29-го на службі', () => {
    expect(covers(sick, '2026-11-28')).toBe(true);
    expect(covers(sick, '2026-11-29')).toBe(false);
    expect(returnDay(sick)).toBe('2026-11-29');
  });
});

describe('підпис позначки', () => {
  it('триває — «до …»; один сьогоднішній день — «сьогодні»; попереду — діапазон', () => {
    expect(absenceLabel(sick, TODAY)).toBe('Лікарняний · до 28 листопада');
    expect(absenceWhen(absence('f', 'x', 'FAMILY', TODAY, TODAY), TODAY)).toBe('сьогодні');
    expect(absenceLabel(absence('v', 'x', 'VACATION', '2026-12-01', '2026-12-14'), TODAY)).toBe('Відпустка · 1–14 грудня');
  });
  it('коротко для Fold і Flip', () => {
    expect(absenceLabel(sick, TODAY, true)).toBe('Лікарняний · до 28.11');
    expect(absenceWhen(absence('v', 'x', 'VACATION', '2026-12-01', '2026-12-14'), TODAY, true)).toBe('1–14.12');
  });
  it('дні: 1 день, 3 дні, 5 днів', () => {
    expect([1, 3, 5, 21, 22, 11].map(daysLabel)).toEqual(['1 день', '3 дні', '5 днів', '21 день', '22 дні', '11 днів']);
  });
});

describe('«В строю»', () => {
  const people = ['bondar', 'shevchenko', 'melnyk', 'savchuk'].map(person);
  const all = [sick, absence('a2', 'shevchenko', 'VACATION', '2026-11-20', '2026-12-01'), absence('a3', 'melnyk', 'VACATION', '2026-12-01', '2026-12-14'), absence('a4', 'savchuk', 'FAMILY', '2027-01-05', '2027-01-05')];
  it('на день: хто в строю, хто відсутній, за видами', () => {
    const s = strengthOn(people, all, TODAY);
    expect([s.total, s.present.map((p) => p.id), s.absent.map((x) => x.person.id), s.byKind]).toEqual([4, ['melnyk', 'savchuk'], ['bondar', 'shevchenko'], { VACATION: 1, SICK_LEAVE: 1, FAMILY: 0 }]);
  });
  it('29-го Бондар уже в строю', () => {
    expect(absenceOf(all, 'bondar', '2026-11-29')).toBeUndefined();
  });
  it('найближчі — на 14 днів уперед, від найближчої', () => {
    expect(upcomingFor(people, all, TODAY).map((a) => a.id)).toEqual(['a3']);
  });
});

describe('доручення відсутньому', () => {
  it('термін в останній день відсутності — попередження; о 00:30 наступного дня за Києвом — уже ні', () => {
    expect(deadlineHits([sick], ['bondar', 'melnyk'], new Date('2026-11-28T16:00:00Z')).map((a) => a.id)).toEqual(['a1']);
    expect(deadlineHits([sick], ['bondar'], new Date('2026-11-28T22:30:00Z'))).toEqual([]);
  });
});

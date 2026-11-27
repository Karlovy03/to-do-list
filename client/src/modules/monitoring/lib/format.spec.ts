import { describe, expect, it } from 'vitest';
import { bytes, daysOfMonth, duration, isAway, seen, uptime } from './format';
import { filterPeople } from './people';
import type { PersonRow } from '../api/monitoring.api';

const NB = ' ';
// субота 28.11.2026, 09:00 за Києвом
const NOW = new Date('2026-11-28T07:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe('коли людина була (без «був/була» — роду система не знає)', () => {
  it('щойно, хвилини, сьогодні, учора, дні; жодного візиту', () => {
    expect(seen(ago(60_000), NOW)).toBe('щойно');
    expect(seen(ago(12 * 60_000), NOW)).toBe('12 хв тому');
    expect(seen('2026-11-28T05:40:00Z', NOW)).toBe('сьогодні о 07:40');
    expect(seen('2026-11-27T15:40:00Z', NOW)).toBe('учора о 17:40');
    expect(seen(ago(9 * 864e5), NOW)).toBe('9 днів тому');
    expect(seen(ago(3 * 864e5), NOW)).toBe('3 дні тому');
    expect(seen(null, NOW)).toBe('жодного візиту');
  });
  it('межа доби — київська: 23:30 UTC 27.11 — це вже 28.11 за Києвом', () => {
    expect(seen('2026-11-27T22:30:00Z', NOW)).toBe('сьогодні о 00:30');
  });
});

describe('числа', () => {
  it('МБ, ГБ з комою і нерозривним пробілом', () => {
    expect(bytes(742 * 1024 * 1024)).toBe(`742${NB}МБ`);
    expect(bytes(9.8 * 1024 ** 3)).toBe(`9,8${NB}ГБ`);
    expect(bytes(2 * 1024 ** 3)).toBe(`2${NB}ГБ`);
  });
  it('час роботи й тривалість візиту', () => {
    expect(uptime(3 * 86400 + 4 * 3600 + 59)).toBe('3 дн 4 год');
    expect(uptime(5 * 3600 + 12 * 60)).toBe('5 год 12 хв');
    expect(duration(140 * 60_000)).toBe('2 год 20 хв');
    expect(duration(12 * 60_000)).toBe('12 хв');
    expect(duration(20_000)).toBe('менше хвилини');
  });
  it('днів за місяць — з правильною множиною', () => {
    expect([daysOfMonth(21), daysOfMonth(22), daysOfMonth(15)]).toEqual(['21 день за місяць', '22 дні за місяць', '15 днів за місяць']);
  });
});

const row = (id: string, fullName: string, online: boolean, lastAt: string | null): PersonRow => ({
  person: { id, fullName, position: '', role: 'MEMBER', unitId: null, isActive: true }, unitName: null, online, lastAt, visits30: 0, days30: 0,
});

describe('фільтр людей', () => {
  const items = [row('a', 'Бондар Андрій', true, null), row('b', 'Шевченко Оксана', false, ago(3600_000)), row('c', 'Петренко Віктор', false, ago(8 * 864e5)), row('d', 'Лисенко Марія', false, null)];
  it('онлайн; давно — понад 7 днів або ще ні разу (як на сервері)', () => {
    expect(filterPeople(items, 'online', '', NOW).map((r) => r.person.id)).toEqual(['a']);
    expect(filterPeople(items, 'away', '', NOW).map((r) => r.person.id)).toEqual(['c', 'd']);
    expect(isAway(items[0], NOW)).toBe(false);
  });
  it('пошук за прізвищем без урахування регістру', () => {
    expect(filterPeople(items, 'all', 'шевч', NOW).map((r) => r.person.id)).toEqual(['b']);
  });
});

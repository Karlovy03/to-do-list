import { beforeEach, describe, expect, it } from 'vitest';
import { forgetPeople, placeOrRemembered, recall, remember, rememberPlace } from './deviceMemory';

const store = new Map<string, string>();
const fake = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};
Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });

beforeEach(() => store.clear());

describe('пам\'ять місця на пристрої', () => {
  it('окремо для кожної людини: чужого фільтра не бачить', () => {
    remember('u1', 'calendar', 'unit=a');
    expect([recall('u1', 'calendar'), recall('u2', 'calendar')]).toEqual(['unit=a', null]);
  });
  it('порожнє значення — забути', () => {
    remember('u1', 'calendar', 'unit=a');
    remember('u1', 'calendar', '');
    expect(recall('u1', 'calendar')).toBeNull();
  });
  it('вихід стирає пам\'ять людей і недавніх, але не налаштування пристрою', () => {
    remember('u1', 'calendar', 'unit=a');
    remember('u2', 'strength', 'unit=b');
    store.set('kt_recent_people', '["x"]');
    store.set('kt_no_glass', '1');
    forgetPeople();
    expect([...store.keys()]).toEqual(['kt_no_glass']);
  });
  it('сховище недоступне — не падає, просто не пам\'ятає', () => {
    Object.defineProperty(globalThis, 'localStorage', { get: () => { throw new Error('denied'); }, configurable: true });
    expect(() => remember('u1', 'x', 'y')).not.toThrow();
    expect(recall('u1', 'x')).toBeNull();
    expect(() => forgetPeople()).not.toThrow();
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true });
  });
});

describe('останнє місце розділу', () => {
  it('пам\'ятає фільтр без дня; адреса з параметрами важливіша за пам\'ять', () => {
    rememberPlace('u1', 'calendar', new URLSearchParams('mode=week&date=2026-11-20&person=p1'));
    expect(placeOrRemembered(new URLSearchParams(), 'u1', 'calendar').toString()).toBe('mode=week&person=p1');
    expect(placeOrRemembered(new URLSearchParams('unit=a'), 'u1', 'calendar').toString()).toBe('unit=a');
    expect(placeOrRemembered(new URLSearchParams(), 'u2', 'calendar').toString()).toBe('');
  });
});

import { describe, expect, it } from 'vitest';
import type { Person, Unit } from '@/shared/api/types';
import type { CalEvent, CalTask } from '../api/calendar.api';
import { dayWindow } from './layout';
import { barTone, dayGroups, rowContent, taskSpan, weekRows } from './rows';

// четвер, 2026-11-26 11:20 за Києвом
const NOW = new Date('2026-11-26T09:20:00Z');
const { win } = dayWindow('2026-11-26', [8, 19]);

const task = (over: Partial<CalTask> = {}): CalTask => ({
  kind: 'task', id: 't', number: 1, title: 'Довідка', status: 'IN_PROGRESS', priority: 'NORMAL',
  createdAt: '2026-11-24T08:00:00Z', deadline: '2026-11-26T15:00:00Z', completedAt: null, controlled: false, personIds: ['p1'], ...over,
});
const event = (startsAt: string, min: number, over: Partial<CalEvent> = {}): CalEvent => ({
  kind: 'event', id: startsAt, title: 'Нарада', status: 'PLANNED', startsAt, endsAt: new Date(Date.parse(startsAt) + min * 60_000).toISOString(), personIds: ['p1'], ...over,
});

describe('смуга завдання', () => {
  it('від постановки до терміну; прострочене відкрите — до «зараз»; виконане — до виконання', () => {
    expect(taskSpan(task(), NOW).end).toBe(Date.parse('2026-11-26T15:00:00Z'));
    expect(taskSpan(task({ deadline: '2026-11-25T15:00:00Z' }), NOW).end).toBe(NOW.getTime());
    expect(taskSpan(task({ status: 'DONE', completedAt: '2026-11-25T10:00:00Z' }), NOW).end).toBe(Date.parse('2026-11-25T10:00:00Z'));
  });
  it('тон — як у чипа картки; відкрите на контролі — малинове, виконане — зелене', () => {
    expect(barTone(task(), NOW)).toBe('soon');
    expect(barTone(task({ deadline: '2026-11-25T15:00:00Z' }), NOW)).toBe('late');
    expect(barTone(task({ controlled: true }), NOW)).toBe('control');
    expect(barTone(task({ controlled: true, status: 'DONE', completedAt: '2026-11-26T08:00:00Z' }), NOW)).toBe('done');
  });
  it('почалося позавчора — обрізане ліворуч, закінчується в межах дня', () => {
    const [bar] = rowContent([task()], win, NOW).tasks;
    expect(bar.placed.cutStart).toBe(true);
    expect(bar.placed.cutEnd).toBe(false);
  });
});

describe('рядок', () => {
  it('заходи, що накладаються, — у дві доріжки; поза вікном — не показуються', () => {
    const c = rowContent([event('2026-11-26T09:00:00Z', 60), event('2026-11-26T09:30:00Z', 30), event('2026-11-26T19:00:00Z', 30)], win, NOW);
    expect(c.events.map((e) => [e.lane, e.phase])).toEqual([[0, 'live'], [1, 'upcoming']]); // 11:30 — ще попереду
    expect(c.eventLanes).toBe(2);
  });
});

describe('«День»: групи за підрозділами', () => {
  const units = [
    { id: 'u1', name: 'Управління', parentId: null },
    { id: 'u2', name: 'Відділ аналітики', parentId: 'u1' },
  ] as Unit[];
  const p = (id: string, unitId: string | null, role: Person['role'], fullName: string) => ({ id, unitId, role, fullName }) as Person;
  it('у порядку дерева; у підрозділі — керівник першим; без підрозділу — наприкінці', () => {
    const people = [p('a', 'u2', 'MEMBER', 'Бондар'), p('x', null, 'MEMBER', 'Ахтирко'), p('b', 'u2', 'MANAGER', 'Мельник'), p('c', 'u1', 'DIRECTOR', 'Коваленко')];
    const groups = dayGroups(people, [], units, win, NOW);
    expect(groups.map((g) => [g.unitId, g.rows.map((r) => r.person.id)])).toEqual([['u1', ['c']], ['u2', ['b', 'a']], [null, ['x']]]);
  });
  it('у рядок людини потрапляє лише її', () => {
    const groups = dayGroups([p('p1', 'u2', 'MEMBER', 'Бондар'), p('p2', 'u2', 'MEMBER', 'Шевченко')], [task()], units, win, NOW);
    expect(groups[0].rows.map((r) => r.tasks.length)).toEqual([1, 0]);
  });
});

describe('«Тиждень»', () => {
  it('багатоденне завдання — у кожному своєму дні', () => {
    const days = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'].map((day) => ({ day, win: dayWindow(day, [8, 19]).win }));
    const rows = weekRows([task()], days, NOW);
    expect(rows.map((r) => r.tasks.length)).toEqual([0, 1, 1, 1, 0]);
  });
});

import { phaseOf, type EventPhase } from '@/modules/events';
import { timeToneOf, type TaskTone } from '@/modules/tasks';
import type { Person, Role, Unit } from '@/shared/api/types';
import { flattenTree } from '@/shared/lib/units';
import type { CalEvent, CalItem, CalTask } from '../api/calendar.api';
import { place, withLanes, type Placed, type Span } from './layout';

/** Тон смуги — як у часового чипа картки; контрольне відкрите — малинове */
export type BarTone = TaskTone | 'control';

export interface PlacedTask {
  task: CalTask;
  tone: BarTone;
  placed: Placed;
  lane: number;
}
export interface PlacedEvent {
  event: CalEvent;
  phase: EventPhase;
  placed: Placed;
  lane: number;
}
/** Вміст рядка: угорі смуги завдань, під ними — заходи */
export interface RowContent {
  tasks: PlacedTask[];
  events: PlacedEvent[];
  taskLanes: number;
  eventLanes: number;
}

const MIN = 60_000;
const OPEN = new Set(['NEW', 'IN_PROGRESS']);
const isTask = (i: CalItem): i is CalTask => i.kind === 'task';
const isEvent = (i: CalItem): i is CalEvent => i.kind === 'event';

/** Від постановки до терміну; прострочене відкрите — до «зараз», завершене — до миті завершення */
export function taskSpan(t: CalTask, now: Date): Span {
  const start = Date.parse(t.createdAt);
  const end = OPEN.has(t.status) ? Math.max(Date.parse(t.deadline), now.getTime()) : Date.parse(t.completedAt ?? t.deadline);
  return { start, end: Math.max(end, start + 30 * MIN) };
}

export const barTone = (t: CalTask, now: Date): BarTone => (t.controlled && OPEN.has(t.status) ? 'control' : timeToneOf(t, now));

export function rowContent(items: CalItem[], win: Span, now: Date): RowContent {
  const tasks = withLanes(
    items.filter(isTask).flatMap((task) => {
      const span = taskSpan(task, now);
      const placed = place(span, win);
      return placed ? [{ ...span, task, placed, tone: barTone(task, now) }] : [];
    }),
  );
  // короткий захід малюється щонайменше під підпис часу — сусід через 15 хв іде нижче
  const events = withLanes(
    items.filter(isEvent).flatMap((event) => {
      const span = { start: Date.parse(event.startsAt), end: Date.parse(event.endsAt) };
      const placed = place(span, win);
      return placed ? [{ ...span, event, placed, phase: phaseOf(event, now) }] : [];
    }),
    40 * MIN,
  );
  return { tasks: tasks.items, events: events.items, taskLanes: tasks.lanes, eventLanes: events.lanes };
}

export interface PersonRow extends RowContent {
  person: Person;
}
export interface UnitGroup {
  unitId: string | null;
  rows: PersonRow[];
}

const RANK: Record<Role, number> = { ADMIN: 0, DIRECTOR: 0, MANAGER: 1, MEMBER: 2 };

/** «День»: люди за підрозділами в порядку дерева, у підрозділі — керівники першими, далі за абеткою */
export function dayGroups(people: Person[], items: CalItem[], units: Unit[], win: Span, now: Date): UnitGroup[] {
  const order = new Map(flattenTree(units).map((u, i) => [u.id, i]));
  const pos = (p: Person) => (p.unitId && order.has(p.unitId) ? order.get(p.unitId)! : Number.MAX_SAFE_INTEGER);
  const sorted = [...people].sort((a, b) => pos(a) - pos(b) || RANK[a.role] - RANK[b.role] || a.fullName.localeCompare(b.fullName, 'uk'));
  const groups: UnitGroup[] = [];
  for (const person of sorted) {
    const unitId = person.unitId && order.has(person.unitId) ? person.unitId : null;
    const row = { person, ...rowContent(items.filter((i) => i.personIds.includes(person.id)), win, now) };
    const last = groups[groups.length - 1];
    if (last && last.unitId === unitId) last.rows.push(row);
    else groups.push({ unitId, rows: [row] });
  }
  return groups;
}

export interface DayRow extends RowContent {
  day: string;
  win: Span;
}

/** «Тиждень»: рядок на кожен день однієї людини; багатоденне завдання — у кожному дні, обрізане стрілками */
export function weekRows(items: CalItem[], windows: { day: string; win: Span }[], now: Date): DayRow[] {
  return windows.map(({ day, win }) => ({ day, win, ...rowContent(items, win, now) }));
}

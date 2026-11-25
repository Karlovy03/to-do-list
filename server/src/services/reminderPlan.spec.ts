import { describe, expect, it } from 'vitest';
import { planReminders, type PlanTask, type PlanUser } from './reminderPlan';
import { DEFAULT_SETTINGS } from './settings';

// 2026-11-25 — середа. 10:00 за Києвом = 08:00 UTC
const at = (iso: string) => new Date(iso);
const WED_10 = at('2026-11-25T08:00:00Z');
const H = 3600_000;

const user = (over: Partial<PlanUser> = {}): PlanUser => ({
  id: 'u1', quietFrom: 20, quietTo: 8, muteWeekends: true,
  notifyAssigned: true, notifyControl: true, notifyDeadline: true, notifyUpdates: true, controlInterval: null, ...over,
});

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: 't1', status: 'IN_PROGRESS', priority: 'NORMAL',
  deadline: new Date(WED_10.getTime() + 5 * 24 * H), createdAt: new Date(WED_10.getTime() - 10 * 24 * H),
  isControlled: true, controlSetAt: new Date(WED_10.getTime() - 3 * H), reminderInterval: null,
  authorId: 'boss', assigneeIds: ['u1'], ...over,
});

const run = (o: { now?: Date; tasks?: PlanTask[]; users?: PlanUser[]; logs?: [string, Date][]; snoozes?: [string, Date][] } = {}) =>
  planReminders({
    now: o.now ?? WED_10,
    settings: DEFAULT_SETTINGS,
    tasks: o.tasks ?? [task()],
    users: new Map((o.users ?? [user(), user({ id: 'boss' })]).map((u) => [u.id, u])),
    logs: new Map(o.logs ?? []),
    snoozes: new Map(o.snoozes ?? []),
  });

describe('нагадування по контрольних завданнях', () => {
  it('нагадує виконавцю, коли минуло 2 години', () => {
    expect(run()).toEqual([{ taskId: 't1', userId: 'u1', kind: 'CONTROL_REMINDER', logKeys: ['control'] }]);
  });

  it('не нагадує, якщо від останнього нагадування минуло менше інтервалу', () => {
    expect(run({ logs: [['t1:u1:control', new Date(WED_10.getTime() - 1 * H)]] })).toEqual([]);
  });

  it('інтервал завдання переважає особистий і загальний', () => {
    const t = task({ reminderInterval: 60, controlSetAt: new Date(WED_10.getTime() - 61 * 60_000) });
    expect(run({ tasks: [t], users: [user({ controlInterval: 240 })] })).toHaveLength(1);
    expect(run({ tasks: [task({ controlSetAt: new Date(WED_10.getTime() - 3 * H) })], users: [user({ controlInterval: 240 })] })).toEqual([]);
  });

  it('не нагадує про незаконтрольоване завдання', () => {
    expect(run({ tasks: [task({ isControlled: false })] })).toEqual([]);
  });

  it('мовчить, коли виконавець доповів (REVIEW) або завдання закрите', () => {
    expect(run({ tasks: [task({ status: 'REVIEW' })] })).toEqual([]);
    expect(run({ tasks: [task({ status: 'DONE' })] })).toEqual([]);
  });

  it('поважає «тихі години» і вихідні', () => {
    expect(run({ now: at('2026-11-25T20:00:00Z') })).toEqual([]); // 22:00 Київ
    expect(run({ now: at('2026-11-28T08:00:00Z') })).toEqual([]); // субота
    expect(run({ now: at('2026-11-28T08:00:00Z'), users: [user({ muteWeekends: false })] })).toHaveLength(1);
  });

  it('термінове завдання ігнорує «тихі години»', () => {
    expect(run({ now: at('2026-11-25T20:00:00Z'), tasks: [task({ priority: 'URGENT' })] })).toHaveLength(1);
  });

  it('відкладене нагадування не надходить до кінця відкладення', () => {
    expect(run({ snoozes: [['t1:u1', new Date(WED_10.getTime() + H)]] })).toEqual([]);
    expect(run({ snoozes: [['t1:u1', new Date(WED_10.getTime() - 1)]] })).toHaveLength(1);
  });

  it('вимкнений тип сповіщень не надходить', () => {
    expect(run({ users: [user({ notifyControl: false })] })).toEqual([]);
  });
});

describe('попередження про термін', () => {
  it('надсилає одне попередження з найменшим порогом і позначає всі пройдені', () => {
    const t = task({ isControlled: false, deadline: new Date(WED_10.getTime() + 90 * 60_000) });
    const [r] = run({ tasks: [t] });
    expect(r.kind).toBe('DEADLINE_SOON');
    expect(r.offsetMin).toBe(120);
    expect(r.logKeys.sort()).toEqual(['deadline:120', 'deadline:1440', 'deadline:4320']);
  });

  it('не попереджає про пороги, які вже минули на момент створення', () => {
    const t = task({ isControlled: false, deadline: new Date(WED_10.getTime() + 20 * H), createdAt: new Date(WED_10.getTime() - H) });
    expect(run({ tasks: [t] })).toEqual([]);
  });

  it('по контрольному завданню попередження скидає і таймер контролю', () => {
    const t = task({ deadline: new Date(WED_10.getTime() + 60 * 60_000) });
    const [r] = run({ tasks: [t] });
    expect(r.kind).toBe('DEADLINE_SOON');
    expect(r.logKeys).toContain('control');
  });
});

describe('прострочення', () => {
  const late = task({ isControlled: false, deadline: new Date(WED_10.getTime() - H) });

  it('нагадує виконавцю і автору', () => {
    expect(run({ tasks: [late] }).map((r) => [r.userId, r.kind])).toEqual([
      ['u1', 'OVERDUE'],
      ['boss', 'OVERDUE'],
    ]);
  });

  it('повторює не частіше за налаштований інтервал', () => {
    const logs: [string, Date][] = [
      ['t1:u1:overdue', new Date(WED_10.getTime() - 2 * H)],
      ['t1:boss:overdue', new Date(WED_10.getTime() - 25 * H)],
    ];
    expect(run({ tasks: [late], logs }).map((r) => r.userId)).toEqual(['boss']);
  });

  it('прострочене контрольне завдання продовжує нагадувати кожні 2 години', () => {
    const t = task({ deadline: new Date(WED_10.getTime() - 5 * H) });
    const logs: [string, Date][] = [['t1:u1:overdue', new Date(WED_10.getTime() - 3 * H)], ['t1:u1:control', new Date(WED_10.getTime() - 3 * H)]];
    expect(run({ tasks: [t], logs, users: [user()] })).toEqual([{ taskId: 't1', userId: 'u1', kind: 'CONTROL_REMINDER', logKeys: ['control'] }]);
  });
});

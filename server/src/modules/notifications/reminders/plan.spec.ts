import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../settings';
import { planReminders, type PlanTask, type PlanUser } from './plan';

// 2026-11-25 — середа. 10:00 за Києвом = 08:00 UTC
const at = (iso: string) => new Date(iso);
const WED_10 = at('2026-11-25T08:00:00Z');
const H = 3600_000;
const ago = (ms: number) => new Date(WED_10.getTime() - ms);
const ahead = (ms: number) => new Date(WED_10.getTime() + ms);

const user = (over: Partial<PlanUser> = {}): PlanUser => ({
  id: 'u1', quietFrom: 20, quietTo: 8, muteWeekends: true,
  notifyAssigned: true, notifyControl: true, notifyDeadline: true, notifyUpdates: true, notifyEvents: true, controlInterval: null, ...over,
});

const assignee = (userId: string, over: Partial<PlanTask['assignees'][number]> = {}) => ({ userId, addedAt: ago(10 * 24 * H), doneAt: null, ...over });

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: 't1', status: 'IN_PROGRESS', priority: 'NORMAL',
  deadline: ahead(5 * 24 * H), deadlineSetAt: ago(10 * 24 * H),
  isControlled: true, controlSetAt: ago(3 * H), reminderInterval: null,
  authorId: 'boss', controllerUserId: null, controlSetById: null,
  assignees: [assignee('u1')], ...over,
});

const everyone = [user(), user({ id: 'u2' }), user({ id: 'boss' }), user({ id: 'ctrl' }), user({ id: 'reg' })];

const run = (o: { now?: Date; tasks?: PlanTask[]; users?: PlanUser[]; logs?: [string, Date][]; snoozes?: [string, Date][] } = {}) =>
  planReminders({
    now: o.now ?? WED_10,
    settings: DEFAULT_SETTINGS,
    tasks: o.tasks ?? [task()],
    users: new Map((o.users ?? everyone).map((u) => [u.id, u])),
    logs: new Map(o.logs ?? []),
    snoozes: new Map(o.snoozes ?? []),
  });

describe('нагадування по контрольних завданнях', () => {
  it('нагадує виконавцю, коли минуло 2 години від постановки на контроль', () => {
    expect(run()).toEqual([{ taskId: 't1', userId: 'u1', kind: 'CONTROL_REMINDER', logKeys: ['control'] }]);
  });

  it('не нагадує, якщо від останнього нагадування минуло менше інтервалу', () => {
    expect(run({ logs: [['t1:u1:control', ago(1 * H)]] })).toEqual([]);
  });

  it('інтервал завдання переважає особистий, особистий — загальний', () => {
    const hourly = task({ reminderInterval: 60, controlSetAt: ago(61 * 60_000) });
    expect(run({ tasks: [hourly], users: [user({ controlInterval: 240 })] })).toHaveLength(1);
    expect(run({ users: [user({ controlInterval: 240 })] })).toEqual([]);
  });

  it('новий виконавець не отримує нагадування одразу після призначення', () => {
    const t = task({ assignees: [assignee('u1', { addedAt: ago(30 * 60_000) })] });
    expect(run({ tasks: [t] })).toEqual([]);
  });

  it('не нагадує тому, хто вже позначив «Виконано», але нагадує решті', () => {
    const t = task({ assignees: [assignee('u1', { doneAt: ago(H) }), assignee('u2')] });
    expect(run({ tasks: [t] }).map((r) => r.userId)).toEqual(['u2']);
  });

  it('не нагадує про незаконтрольоване, виконане чи скасоване завдання', () => {
    expect(run({ tasks: [task({ isControlled: false })] })).toEqual([]);
    expect(run({ tasks: [task({ status: 'DONE' })] })).toEqual([]);
    expect(run({ tasks: [task({ status: 'CANCELLED' })] })).toEqual([]);
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
    expect(run({ snoozes: [['t1:u1', ahead(H)]] })).toEqual([]);
    expect(run({ snoozes: [['t1:u1', ago(1)]] })).toHaveLength(1);
  });

  it('вимкнений тип сповіщень не надходить', () => {
    expect(run({ users: [user({ notifyControl: false })] })).toEqual([]);
  });
});

describe('попередження про термін', () => {
  it('одне попередження з фактичним залишком; позначає всі пройдені пороги', () => {
    const t = task({ isControlled: false, deadline: ahead(90 * 60_000) });
    const [r] = run({ tasks: [t] });
    expect(r.kind).toBe('DEADLINE_SOON');
    expect(r.leftMs).toBe(90 * 60_000);
    expect(r.logKeys.sort()).toEqual(['deadline:120', 'deadline:1440', 'deadline:4320']);
  });

  it('пороги рахуються від встановлення терміну, а не від створення завдання', () => {
    // термін перенесли годину тому на «через 20 год» — пороги 1 і 3 доби вже «пройдені» в момент перенесення
    const t = task({ isControlled: false, deadline: ahead(20 * H), deadlineSetAt: ago(H) });
    expect(run({ tasks: [t] })).toEqual([]);
  });

  it('по контрольному завданню попередження скидає і таймер контролю', () => {
    const [r] = run({ tasks: [task({ deadline: ahead(60 * 60_000) })] });
    expect(r.kind).toBe('DEADLINE_SOON');
    expect(r.logKeys).toContain('control');
  });
});

describe('прострочення', () => {
  const late = (over: Partial<PlanTask> = {}) => task({ isControlled: false, deadline: ago(H), ...over });

  it('нагадує виконавцю, автору, контролеру-користувачу і тому, хто реєстрував контроль', () => {
    const t = late({ isControlled: true, controllerUserId: 'ctrl', controlSetById: 'reg' });
    expect(run({ tasks: [t] }).map((r) => r.userId).sort()).toEqual(['boss', 'ctrl', 'reg', 'u1']);
  });

  it('не нагадує автору, якщо це вимкнено в загальних налаштуваннях', () => {
    const r = planReminders({
      now: WED_10, settings: { ...DEFAULT_SETTINGS, overdueNotifyLeads: false }, tasks: [late()],
      users: new Map(everyone.map((u) => [u.id, u])), logs: new Map(), snoozes: new Map(),
    });
    expect(r.map((x) => x.userId)).toEqual(['u1']);
  });

  it('повторює не частіше за налаштований інтервал', () => {
    const logs: [string, Date][] = [['t1:u1:overdue', ago(2 * H)], ['t1:boss:overdue', ago(25 * H)]];
    expect(run({ tasks: [late()], logs }).map((r) => r.userId)).toEqual(['boss']);
  });

  it('прострочене контрольне завдання продовжує нагадувати виконавцю кожні 2 години', () => {
    const t = task({ deadline: ago(5 * H) });
    const logs: [string, Date][] = [['t1:u1:overdue', ago(3 * H)], ['t1:u1:control', ago(3 * H)], ['t1:boss:overdue', ago(3 * H)]];
    expect(run({ tasks: [t], logs })).toEqual([{ taskId: 't1', userId: 'u1', kind: 'CONTROL_REMINDER', logKeys: ['control'] }]);
  });
});

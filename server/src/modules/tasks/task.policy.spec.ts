import { describe, expect, it } from 'vitest';
import { canAssignTo, canControlOnCreate, canView, permissions, visibilityWhere, type PolicyTask, type PolicyUser } from './task.policy';

// ADR-0012: вертикаль — відділ A входить в управління; відділ B — сусідній
const chief: PolicyUser = { id: 'chief', role: 'MANAGER', scope: new Set(['dept', 'a', 'b']) };
const otherManager: PolicyUser = { id: 'deputy', role: 'MANAGER', scope: new Set(['a']) };
const foreignManager: PolicyUser = { id: 'headB', role: 'MANAGER', scope: new Set(['b']) };
const noUnitManager: PolicyUser = { id: 'lost', role: 'MANAGER', scope: new Set() };
const admin: PolicyUser = { id: 'admin', role: 'ADMIN', scope: 'all' };
const director: PolicyUser = { id: 'dir', role: 'DIRECTOR', scope: 'all' };
const exec: PolicyUser = { id: 'exec', role: 'MEMBER' };
const stranger: PolicyUser = { id: 'stranger', role: 'MEMBER' };
const controller: PolicyUser = { id: 'ctrl', role: 'MEMBER' };

const task = (over: Partial<PolicyTask> = {}): PolicyTask => ({
  status: 'IN_PROGRESS',
  authorId: 'chief',
  isControlled: true,
  controllerUserId: 'ctrl',
  author: { unitId: 'dept' },
  assignees: [
    { userId: 'exec', doneAt: null, user: { unitId: 'a' } },
    { userId: 'exec2', doneAt: null, user: { unitId: 'a' } },
  ],
  ...over,
});

describe('видимість', () => {
  it('автор, виконавець, контролер-користувач, керівник вертикалі, директор і адмін бачать завдання', () => {
    for (const u of [chief, exec, controller, otherManager, admin, director]) expect(canView(task(), u)).toBe(true);
  });
  it('сторонній виконавець не бачить завдання', () => {
    expect(canView(task(), stranger)).toBe(false);
  });
  it('контролер-користувач не бачить завдання, коли контроль знято', () => {
    expect(canView(task({ isControlled: false }), controller)).toBe(false);
  });
});

describe('дії виконавця', () => {
  it('виконавець позначає «Виконано» лише за себе і лише раз', () => {
    expect(permissions(task(), exec).markDone).toBe(true);
    expect(permissions(task({ assignees: [{ userId: 'exec', doneAt: new Date() }] }), exec).markDone).toBe(false);
    expect(permissions(task(), stranger).markDone).toBe(false);
    expect(permissions(task(), chief).markDone).toBe(false);
  });
  it('розпочати можна лише нове завдання', () => {
    expect(permissions(task({ status: 'NEW' }), exec).start).toBe(true);
    expect(permissions(task(), exec).start).toBe(false);
  });
  it('виконавець не може повернути, закрити достроково, скасувати чи редагувати', () => {
    const p = permissions(task({ status: 'DONE' }), exec);
    expect(p.returnBack).toBe(false);
    const open = permissions(task(), exec);
    expect([open.closeEarly, open.cancel, open.edit, open.control]).toEqual([false, false, false, false]);
  });
});

describe('рішення керівника (ADR-0012)', () => {
  it('керівник вертикалі повертає виконане завдання в роботу', () => {
    expect(permissions(task({ status: 'DONE' }), otherManager).returnBack).toBe(true);
    expect(permissions(task({ status: 'DONE' }), controller).returnBack).toBe(true);
  });
  it('повернути можна лише виконане', () => {
    expect(permissions(task(), chief).returnBack).toBe(false);
  });
  it('закрити достроково й скасувати може автор або керівник вертикалі, лише відкрите', () => {
    expect(permissions(task(), chief).closeEarly).toBe(true);
    expect(permissions(task(), otherManager).cancel).toBe(true);
    expect(permissions(task({ status: 'DONE' }), chief).closeEarly).toBe(false);
  });
  it('відновити можна лише скасоване', () => {
    expect(permissions(task({ status: 'CANCELLED' }), chief).reopen).toBe(true);
    expect(permissions(task({ status: 'DONE' }), chief).reopen).toBe(false);
  });
});

describe('контроль', () => {
  it('змінити умови контролю може керівник вертикалі або сам контролер-користувач', () => {
    expect(permissions(task(), otherManager).control).toBe(true);
    expect(permissions(task(), foreignManager).control).toBe(false);
    expect(permissions(task(), chief).control).toBe(true);
    expect(permissions(task(), controller).control).toBe(true);
    expect(permissions(task(), exec).control).toBe(false);
  });
  it('зняти контроль з закритого завдання не можна', () => {
    expect(permissions(task({ status: 'DONE' }), chief).removeControl).toBe(false);
  });
  it('ставити на контроль при створенні — лише керівник', () => {
    expect(canControlOnCreate(chief)).toBe(true);
    expect(canControlOnCreate(exec)).toBe(false);
  });
});

describe('кому можна доручати', () => {
  it('виконавець — лише собі, керівник — будь-кому', () => {
    expect(canAssignTo(exec, ['exec'])).toBe(true);
    expect(canAssignTo(exec, ['exec', 'exec2'])).toBe(false);
    expect(canAssignTo(chief, ['exec', 'exec2'])).toBe(true);
  });
});

describe('«Відкласти нагадування»', () => {
  it('відкласти може виконавець, автор і контролер (усі отримують нагадування), сторонній — ні', () => {
    const t = task();
    expect(permissions(t, exec).snooze).toBe(true);
    expect(permissions(t, chief).snooze).toBe(true);
    expect(permissions(t, controller).snooze).toBe(true);
    expect(permissions(t, stranger).snooze).toBe(false);
    expect(permissions(task({ status: 'DONE' }), chief).snooze).toBe(false);
  });
});

describe('видалення (ADR-0011)', () => {
  it('автор, адміністратор і директор можуть видалити завдання, зокрема на контролі й завершене', () => {
    for (const status of ['NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const) {
      for (const u of [chief, admin, director]) expect(permissions(task({ status }), u).delete).toBe(true);
    }
  });
  it('інший керівник, виконавець і контролер-користувач не можуть видалити чуже завдання', () => {
    for (const u of [otherManager, exec, controller, stranger]) expect(permissions(task(), u).delete).toBe(false);
  });
});

describe('вертикаль підрозділів (ADR-0012)', () => {
  const inB = task({ authorId: 'headB', author: { unitId: 'b' }, assignees: [{ userId: 'x', doneAt: null, user: { unitId: 'b' } }] });

  it('керівник бачить і керує завданнями нижчого підрозділу своєї вертикалі', () => {
    expect(canView(task(), chief)).toBe(true);
    expect(permissions(task(), chief).cancel).toBe(true);
  });
  it('керівник НЕ бачить і НЕ керує завданнями сусіднього відділу', () => {
    expect(canView(inB, otherManager)).toBe(false);
    const p = permissions(inB, otherManager);
    expect([p.cancel, p.closeEarly, p.control, p.edit, p.delete]).toEqual([false, false, false, false, false]);
  });
  it('керівник НЕ бачить завдань вищого підрозділу, якщо в них немає людей його вертикалі', () => {
    const top = task({ authorId: 'boss', author: { unitId: 'dept' }, assignees: [{ userId: 'y', doneAt: null, user: { unitId: 'dept' } }] });
    expect(canView(top, otherManager)).toBe(false);
  });
  it('достатньо одного виконавця з вертикалі, щоб керівник бачив завдання', () => {
    const mixed = task({ author: { unitId: 'b' }, assignees: [{ userId: 'x', doneAt: null, user: { unitId: 'b' } }, { userId: 'z', doneAt: null, user: { unitId: 'a' } }] });
    expect(canView(mixed, otherManager)).toBe(true);
  });
  it('керівник без підрозділу бачить лише завдання, де він учасник', () => {
    expect(canView(task(), noUnitManager)).toBe(false);
    expect(canView(task({ authorId: 'lost' }), noUnitManager)).toBe(true);
  });
  it('директор бачить і керує завданнями будь-якого підрозділу', () => {
    expect(canView(inB, director)).toBe(true);
    expect(permissions(inB, director).cancel).toBe(true);
  });
  it('доручати будь-кому можуть керівник, директор і адмін; ставити на контроль — теж', () => {
    for (const u of [chief, foreignManager, director, admin]) {
      expect(canAssignTo(u, ['x', 'y'])).toBe(true);
      expect(canControlOnCreate(u)).toBe(true);
    }
  });
  it('умова для списків: адмін і директор — без обмежень, керівник — свої + вертикаль, виконавець — лише свої', () => {
    expect(visibilityWhere(admin)).toEqual({});
    expect(visibilityWhere(director)).toEqual({});
    expect(JSON.stringify(visibilityWhere(otherManager))).toContain('"in":["a"]');
    expect(JSON.stringify(visibilityWhere(noUnitManager))).not.toContain('"in"');
    expect(JSON.stringify(visibilityWhere(exec))).not.toContain('unitId');
  });
});

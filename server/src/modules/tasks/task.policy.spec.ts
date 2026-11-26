import { describe, expect, it } from 'vitest';
import { canAssignTo, canControlOnCreate, canView, permissions, type PolicyTask, type PolicyUser } from './task.policy';

const chief: PolicyUser = { id: 'chief', role: 'MANAGER' };
const otherManager: PolicyUser = { id: 'deputy', role: 'MANAGER' };
const admin: PolicyUser = { id: 'admin', role: 'ADMIN' };
const exec: PolicyUser = { id: 'exec', role: 'MEMBER' };
const stranger: PolicyUser = { id: 'stranger', role: 'MEMBER' };
const controller: PolicyUser = { id: 'ctrl', role: 'MEMBER' };

const task = (over: Partial<PolicyTask> = {}): PolicyTask => ({
  status: 'IN_PROGRESS',
  authorId: 'chief',
  isControlled: true,
  controllerUserId: 'ctrl',
  assignees: [{ userId: 'exec', doneAt: null }, { userId: 'exec2', doneAt: null }],
  ...over,
});

describe('видимість', () => {
  it('автор, виконавець, контролер-користувач і будь-який керівник бачать завдання', () => {
    for (const u of [chief, exec, controller, otherManager, admin]) expect(canView(task(), u)).toBe(true);
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

describe('рішення керівника (ADR-0003)', () => {
  it('будь-який керівник повертає виконане завдання в роботу', () => {
    expect(permissions(task({ status: 'DONE' }), otherManager).returnBack).toBe(true);
    expect(permissions(task({ status: 'DONE' }), controller).returnBack).toBe(true);
  });
  it('повернути можна лише виконане', () => {
    expect(permissions(task(), chief).returnBack).toBe(false);
  });
  it('закрити достроково й скасувати може автор або керівник, лише відкрите', () => {
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
  it('змінити умови контролю може керівник або сам контролер-користувач', () => {
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

describe('видалення (ADR-0011)', () => {
  it('автор і адміністратор можуть видалити завдання, зокрема на контролі й завершене', () => {
    for (const status of ['NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const) {
      expect(permissions(task({ status }), chief).delete).toBe(true);
      expect(permissions(task({ status }), admin).delete).toBe(true);
    }
  });
  it('інший керівник, виконавець і контролер-користувач не можуть видалити чуже завдання', () => {
    for (const u of [otherManager, exec, controller, stranger]) expect(permissions(task(), u).delete).toBe(false);
  });
});

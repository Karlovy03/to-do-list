import { describe, expect, it } from 'vitest';
import type { Me, Task } from '@/shared/api/types';
import { hideCheer, shouldCheer, showCheer } from './cheer';

const me = (on: boolean) => ({ prefs: { cheerOnControlDone: on } }) as Me;
const task = (control: boolean, mine: boolean) => ({ control: control ? {} : null, myAssignment: mine ? { doneAt: null } : null }) as Task;

describe('коли з\'являється ящірка', () => {
  it('контрольне, позначає сам виконавець, ящірку не вимкнено — так', () => {
    expect(shouldCheer(task(true, true), me(true))).toBe(true);
  });
  it('звичайне завдання, не виконавець або вимкнено — ні', () => {
    expect(shouldCheer(task(false, true), me(true))).toBe(false);
    expect(shouldCheer(task(true, false), me(true))).toBe(false);
    expect(shouldCheer(task(true, true), me(false))).toBe(false);
    expect(shouldCheer(task(true, true), null)).toBe(false);
  });
  it('сховати, коли не показано, — нічого не робить', () => {
    expect(() => hideCheer()).not.toThrow();
    showCheer();
    hideCheer();
  });
});

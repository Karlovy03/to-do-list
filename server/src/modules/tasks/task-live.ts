import { announce } from '../live';
import { canView, type PolicyTask } from './task.policy';

/**
 * Сигнал «змінилось завдання» (ADR-0021) тим, хто бачив його до зміни або бачить після:
 * знятий виконавець має побачити, що завдання зникло, а доданий — що з'явилось.
 */
export const announceTask = (id: string, ...versions: PolicyTask[]) =>
  announce({ t: 'task', id }, (viewer) => versions.some((t) => canView(t, viewer)));

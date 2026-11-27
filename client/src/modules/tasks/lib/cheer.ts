import { useSyncExternalStore } from 'react';
import type { Me, Task } from '@/shared/api/types';

/**
 * Ящірка «Виконано!» (ADR-0018): маленький спільний стан — показати чи сховати.
 * Значення — мітка показу: новий показ перезапускає анімацію, null — не показано.
 */
let shownAt: number | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showCheer() {
  shownAt = Date.now();
  emit();
}

export function hideCheer() {
  if (shownAt === null) return;
  shownAt = null;
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useCheer = () => useSyncExternalStore(subscribe, () => shownAt);

/** Лише контрольне, лише коли «Виконано» позначає сам виконавець і лише якщо людина ящірку не вимкнула */
export const shouldCheer = (task: Pick<Task, 'control' | 'myAssignment'>, me: Pick<Me, 'prefs'> | null | undefined) =>
  !!task.control && !!task.myAssignment && !!me?.prefs.cheerOnControlDone;

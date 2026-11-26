import type { ControlBy, ControlInput, TaskControl } from '@/shared/api/types';

/** Варіанти інтервалу, хв; null — за налаштуваннями людини чи загальними */
export const INTERVALS: (number | null)[] = [null, 60, 120, 240, 1440];

/** Поточні умови контролю → початкові значення форми */
export function fromControl(c: TaskControl | null | undefined): ControlInput {
  const ctl = c?.controller;
  let by: ControlBy = { type: 'self' };
  if (ctl?.kind === 'user' && ctl.userId) by = { type: 'user', userId: ctl.userId };
  else if (ctl?.kind === 'directory' && ctl.controllerId) by = { type: 'directory', controllerId: ctl.controllerId };
  else if (ctl?.kind === 'text') by = { type: 'text', text: ctl.name };
  return { by, basis: c?.basis ?? '', reminderInterval: c?.reminderInterval ?? null };
}

/** Чи вказано, хто поставив контроль */
export function isComplete(v: ControlInput): boolean {
  if (v.by.type === 'user') return !!v.by.userId;
  if (v.by.type === 'directory') return !!v.by.controllerId;
  if (v.by.type === 'text') return v.by.text.trim().length > 0;
  return true;
}

export const normalize = (v: ControlInput): ControlInput => ({
  by: v.by.type === 'text' ? { type: 'text', text: v.by.text.trim() } : v.by,
  basis: v.basis?.trim() || null,
  reminderInterval: v.reminderInterval ?? null,
});

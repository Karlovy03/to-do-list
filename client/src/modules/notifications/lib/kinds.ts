import type { NotificationKind } from '@/shared/api/types';
import type { IconName } from '@/shared/ui';

export type KindTone = 'control' | 'late' | 'done' | 'info';

/** Значок і колір сповіщення за його видом */
export function kindLook(kind: NotificationKind): { icon: IconName; tone: KindTone } {
  if (kind.startsWith('CONTROL')) return { icon: 'shieldCheck', tone: 'control' };
  if (kind === 'DEADLINE_SOON' || kind === 'DEADLINE_CHANGED') return { icon: 'clock', tone: 'info' };
  if (kind === 'OVERDUE') return { icon: 'alert', tone: 'late' };
  if (kind === 'DONE' || kind === 'DONE_PART') return { icon: 'check', tone: 'done' };
  if (kind === 'RETURNED' || kind === 'REOPENED') return { icon: 'undo', tone: 'late' };
  if (kind === 'COMMENT' || kind === 'PROGRESS') return { icon: 'message', tone: 'info' };
  return { icon: 'bell', tone: 'info' };
}

/** Сповіщення, по яких виконавець може одразу відповісти */
export const ACTIONABLE = new Set<NotificationKind>(['CONTROL_REMINDER', 'DEADLINE_SOON', 'OVERDUE']);

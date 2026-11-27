import type { PolicyUser } from '../access';
import { publicUser } from '../users';
import { dayKey } from '../../core/time';
import { canChangeAbsence } from './absences.policy';
import type { AbsenceFull } from './absences.repository';

/** Дні — «РРРР-ММ-ДД» за Києвом, кінець включно; вид бачать усі (ADR-0019) */
export function serializeAbsence(a: AbsenceFull, viewer: PolicyUser) {
  return {
    id: a.id,
    kind: a.kind,
    startDay: dayKey(a.startDay),
    endDay: dayKey(a.endDay),
    person: publicUser(a.user),
    createdBy: a.createdBy ? publicUser(a.createdBy) : null,
    can: { change: canChangeAbsence(a, viewer) },
  };
}

export type AbsenceDto = ReturnType<typeof serializeAbsence>;

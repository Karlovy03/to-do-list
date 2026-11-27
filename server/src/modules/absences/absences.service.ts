import { badRequest, conflict, forbidden, notFound } from '../../core/http-error';
import { addDays, dayKey, daysBetween, kyivDay } from '../../core/time';
import type { Viewer } from '../access';
import { usersRepository } from '../users';
import { canChangeAbsence, canCreateAbsenceFor } from './absences.policy';
import { absencesRepository as repo } from './absences.repository';
import type { CreateAbsenceInput, ListAbsencesQuery, UpdateAbsenceInput } from './absences.schemas';

/** До 120 днів поспіль; заднім числом — до 60 днів: лікарняний часто заводять уже після */
export const MAX_DAYS = 120;
export const MAX_BACK_DAYS = 60;

function checkDays(start: string, end: string, today: string, startChanged: boolean) {
  if (end < start) throw badRequest('absence_bad_range');
  if (daysBetween(start, end) + 1 > MAX_DAYS) throw badRequest('absence_too_long');
  if (startChanged && daysBetween(start, today) > MAX_BACK_DAYS) throw badRequest('absence_too_old');
}

async function loadChangeable(viewer: Viewer, id: string) {
  const a = await repo.findById(id);
  if (!a) throw notFound();
  if (!canChangeAbsence(a, viewer)) throw forbidden('absence_change_not_allowed');
  return a;
}

export const absencesService = {
  /** Бачать усі — і факт, і вид (ADR-0019) */
  list: (q: ListAbsencesQuery) => repo.inRange(q.from, q.to),

  async create(viewer: Viewer, input: CreateAbsenceInput, now = new Date()) {
    const person = !input.userId || input.userId === viewer.id ? viewer : await usersRepository.findById(input.userId);
    if (!person || !person.isActive) throw badRequest('absence_person_not_found');
    if (!canCreateAbsenceFor(viewer, person)) throw forbidden('absence_not_allowed');
    checkDays(input.startDay, input.endDay, kyivDay(now), true);
    if (await repo.overlapping(person.id, input.startDay, input.endDay)) throw conflict('absence_overlap');
    return repo.create({ userId: person.id, kind: input.kind, startDay: input.startDay, endDay: input.endDay, createdById: viewer.id });
  },

  async update(viewer: Viewer, id: string, input: UpdateAbsenceInput, now = new Date()) {
    const a = await loadChangeable(viewer, id);
    const start = input.startDay ?? dayKey(a.startDay);
    const end = input.endDay ?? dayKey(a.endDay);
    checkDays(start, end, kyivDay(now), input.startDay !== undefined && input.startDay !== dayKey(a.startDay));
    if (await repo.overlapping(a.userId, start, end, a.id)) throw conflict('absence_overlap');
    return repo.update(id, input);
  },

  async remove(viewer: Viewer, id: string) {
    await loadChangeable(viewer, id);
    await repo.remove(id);
  },

  /**
   * «Вийшов на службу»: сьогодні людина вже на місці — відсутність закінчилась учора.
   * Ще не почалась (чи почалась сьогодні) — знімається зовсім; повертає null.
   */
  async end(viewer: Viewer, id: string, now = new Date()) {
    const a = await loadChangeable(viewer, id);
    const today = kyivDay(now);
    if (dayKey(a.endDay) < today) throw conflict('absence_already_over');
    if (dayKey(a.startDay) >= today) {
      await repo.remove(id);
      return null;
    }
    return repo.update(id, { endDay: addDays(today, -1) });
  },
};

import { badRequest, conflict, forbidden } from '../../core/http-error';
import { transaction } from '../../core/prisma';
import type { Viewer } from '../access';
import { notifyInBackground, type NotifyEvent } from '../notifications';
import { usersRepository } from '../users';
import { loadVisibleEvent } from './events-query.service';
import { eventPermissions } from './events.policy';
import { eventsRepository as repo, type EventFull } from './events.repository';
import type { CreateEventInput, UpdateEventInput } from './events.schemas';
import { announceEvent } from './event-live';

const MIN = 60_000;
const unique = (ids: string[]) => [...new Set(ids)];
const about = (e: EventFull, gone = false): NotifyEvent => ({ id: e.id, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, gone });
const participantIds = (e: EventFull) => e.participants.map((p) => p.userId);

/** Запрошувати можна лише активних колег; ті, хто вже учасник, не перевіряються (вимкнений колега не блокує правку) */
async function checkInvited(ids: string[]) {
  if (ids.length && (await usersRepository.countActiveByIds(ids)) !== ids.length) throw badRequest('participant_not_found');
}

export const eventsCrudService = {
  /** Створити може кожен і запросити будь-кого (ADR-0016); організатор — теж учасник */
  async create(actor: Viewer, input: CreateEventInput) {
    const people = unique([actor.id, ...input.participantIds]);
    await checkInvited(people.filter((id) => id !== actor.id));
    const startsAt = input.startsAt;
    const e = await repo.create({
      title: input.title,
      description: input.description,
      startsAt,
      endsAt: new Date(startsAt.getTime() + input.durationMin * MIN),
      organizerId: actor.id,
      participants: { createMany: { data: people.map((userId) => ({ userId })) } },
    });
    notifyInBackground({ event: 'EVENT_INVITED', calendarEvent: about(e), to: people, actorId: actor.id });
    announceEvent(e.id, e);
    return e;
  },

  async update(actor: Viewer, id: string, input: UpdateEventInput) {
    const e = await loadVisibleEvent(id, actor);
    if (!eventPermissions(e, actor).edit) throw forbidden('event_edit_not_allowed');
    const startsAt = input.startsAt ?? e.startsAt;
    const duration = input.durationMin ?? Math.round((e.endsAt.getTime() - e.startsAt.getTime()) / MIN);
    const endsAt = new Date(startsAt.getTime() + duration * MIN);
    const timeChanged = startsAt.getTime() !== e.startsAt.getTime() || endsAt.getTime() !== e.endsAt.getTime();
    const prev = participantIds(e);
    // організатора не можна зняти: він отримує нагадування і бачить захід у своєму рядку календаря
    const next = input.participantIds ? unique([e.organizerId, ...input.participantIds]) : prev;
    const added = next.filter((x) => !prev.includes(x));
    const removed = prev.filter((x) => !next.includes(x));
    await checkInvited(added);

    const updated = await transaction(async (db) => {
      if (removed.length) await repo.removeParticipants(e.id, removed, db);
      if (added.length) await repo.addParticipants(e.id, added, db);
      if (timeChanged) await repo.resetReminders(e.id, db);
      return repo.update(e.id, { title: input.title, description: input.description, ...(timeChanged ? { startsAt, endsAt } : {}) }, db);
    });

    notifyInBackground({ event: 'EVENT_INVITED', calendarEvent: about(updated), to: added, actorId: actor.id });
    notifyInBackground({ event: 'EVENT_CANCELLED', calendarEvent: about(updated), to: removed, actorId: actor.id, titleKey: 'notifications.event.removed' });
    if (timeChanged) notifyInBackground({ event: 'EVENT_CHANGED', calendarEvent: about(updated), to: next.filter((x) => !added.includes(x)), actorId: actor.id });
    announceEvent(e.id, e, updated);
    return updated;
  },

  async cancel(actor: Viewer, id: string, reason: string) {
    const e = await loadVisibleEvent(id, actor);
    if (!eventPermissions(e, actor).cancel) throw forbidden('event_cancel_not_allowed');
    if (!(await repo.cancel(e.id, new Date()))) throw conflict();
    const comment = reason ? { name: actor.fullName, text: reason } : undefined;
    notifyInBackground({ event: 'EVENT_CANCELLED', calendarEvent: about(e), to: participantIds(e), actorId: actor.id, comment });
    announceEvent(e.id, e);
    return (await repo.findById(e.id))!;
  },

  /** Назавжди, разом з учасниками й сповіщеннями; якщо захід ще мав відбутися — учасники дізнаються */
  async remove(actor: Viewer, id: string, now = new Date()) {
    const e = await loadVisibleEvent(id, actor);
    if (!eventPermissions(e, actor, now).delete) throw forbidden('event_delete_not_allowed');
    await repo.remove(e.id);
    announceEvent(e.id, e);
    if (e.status === 'PLANNED' && e.endsAt.getTime() > now.getTime()) {
      notifyInBackground({ event: 'EVENT_CANCELLED', calendarEvent: about(e, true), to: participantIds(e), actorId: actor.id, titleKey: 'notifications.event.deleted' });
    }
  },
};

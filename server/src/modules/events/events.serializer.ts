import type { PolicyUser } from '../access';
import { publicUser } from '../users';
import { eventPermissions } from './events.policy';
import type { EventFull } from './events.repository';

/** Учасники — без організатора: він показується окремо, хоча в базі теж учасник (для нагадувань і календаря) */
export function serializeEvent(e: EventFull, viewer: PolicyUser, now = new Date()) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    durationMin: Math.round((e.endsAt.getTime() - e.startsAt.getTime()) / 60_000),
    status: e.status,
    cancelledAt: e.cancelledAt,
    organizer: publicUser(e.organizer),
    participants: e.participants.filter((p) => p.userId !== e.organizerId).map((p) => publicUser(p.user)),
    mine: e.organizerId === viewer.id || e.participants.some((p) => p.userId === viewer.id),
    can: eventPermissions(e, viewer, now),
  };
}

export type EventDto = ReturnType<typeof serializeEvent>;

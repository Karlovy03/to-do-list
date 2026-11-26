import type { EventStatus } from '@prisma/client';
import { hasFullAccess, managesUnits, scopeUnits, type PolicyUser } from '../access';

/**
 * Хто що може із заходом (ADR-0016). Створити й запросити будь-кого — кожен.
 * Бачать: організатор, учасники, керівник вертикалі (організатор або хтось з учасників у ній),
 * директор і адміністратор. Змінити й скасувати — організатор і ті, хто керує; видалити — організатор,
 * директор, адміністратор. Невидимий захід → 404.
 */
export interface PolicyEvent {
  status: EventStatus;
  endsAt: Date;
  organizerId: string;
  organizer?: { unitId: string | null };
  participants: { userId: string; user?: { unitId: string | null } }[];
}

const unitsOf = (e: PolicyEvent) => [e.organizer?.unitId, ...e.participants.map((p) => p.user?.unitId)];
const isOrganizer = (e: PolicyEvent, u: PolicyUser) => e.organizerId === u.id;
const isParticipant = (e: PolicyEvent, u: PolicyUser) => e.participants.some((p) => p.userId === u.id);

export const canViewEvent = (e: PolicyEvent, u: PolicyUser) => isOrganizer(e, u) || isParticipant(e, u) || managesUnits(u, unitsOf(e));

export function eventPermissions(e: PolicyEvent, u: PolicyUser, now = new Date()) {
  const active = e.status === 'PLANNED' && e.endsAt.getTime() > now.getTime();
  const lead = isOrganizer(e, u) || managesUnits(u, unitsOf(e));
  return {
    edit: active && lead,
    cancel: active && lead,
    delete: isOrganizer(e, u) || hasFullAccess(u),
  };
}

export type EventPermissions = ReturnType<typeof eventPermissions>;

/** Умова видимості для списків і календаря — та сама, що й canViewEvent */
export function eventVisibilityWhere(u: PolicyUser) {
  if (hasFullAccess(u)) return {};
  const own = [{ organizerId: u.id }, { participants: { some: { userId: u.id } } }];
  const units = scopeUnits(u);
  if (!units.length) return { OR: own };
  return { OR: [...own, { organizer: { unitId: { in: units } } }, { participants: { some: { user: { unitId: { in: units } } } } }] };
}

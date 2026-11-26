import type { User } from '@prisma/client';

/** Те, що бачать колеги: без логіна, пароля й налаштувань */
export const publicUser = (u: User) => ({
  id: u.id,
  fullName: u.fullName,
  position: u.position,
  role: u.role,
  unitId: u.unitId,
  isActive: u.isActive,
});

export const adminUser = (u: User) => ({ ...publicUser(u), login: u.login });

export type PublicUser = ReturnType<typeof publicUser>;

/** Власний профіль: з налаштуваннями сповіщень */
export const selfUser = (u: User) => ({
  ...adminUser(u),
  prefs: {
    quietFrom: u.quietFrom,
    quietTo: u.quietTo,
    muteWeekends: u.muteWeekends,
    notifyAssigned: u.notifyAssigned,
    notifyControl: u.notifyControl,
    notifyDeadline: u.notifyDeadline,
    notifyUpdates: u.notifyUpdates,
    controlInterval: u.controlInterval,
    notifyEvents: u.notifyEvents,
    cheerOnControlDone: u.cheerOnControlDone,
  },
});

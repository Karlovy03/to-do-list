import type { Controller, User } from '@prisma/client';
import { publicUser } from '../users';

interface ControlledTask {
  isControlled: boolean;
  controlSetAt: Date | null;
  controlBasis: string | null;
  reminderInterval: number | null;
  controllerText: string | null;
  controlSetBy: User | null;
  controllerUser: User | null;
  controller: Controller | null;
}

/** Хто контролює — у єдиному вигляді для інтерфейсу */
function controllerLabel(t: ControlledTask) {
  if (t.controllerUser) return { kind: 'user' as const, name: t.controllerUser.fullName, position: t.controllerUser.position, userId: t.controllerUser.id };
  if (t.controller) {
    const position = [t.controller.position, t.controller.organization].filter(Boolean).join(', ');
    return { kind: 'directory' as const, name: t.controller.fullName, position, controllerId: t.controller.id };
  }
  if (t.controllerText) return { kind: 'text' as const, name: t.controllerText, position: '' };
  return null;
}

export function serializeControl(t: ControlledTask) {
  if (!t.isControlled) return null;
  return {
    setAt: t.controlSetAt,
    setBy: t.controlSetBy ? publicUser(t.controlSetBy) : null,
    controller: controllerLabel(t),
    basis: t.controlBasis,
    reminderInterval: t.reminderInterval,
  };
}

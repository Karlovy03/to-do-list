import type { User } from '@prisma/client';
import { badRequest } from '../../core/http-error';
import { directoryRepository } from '../directory';
import { usersRepository } from '../users';
import type { ControlInput } from './control.schemas';

/** Поля завдання, що описують контроль */
export interface ControlFields {
  isControlled: boolean;
  controlSetAt: Date | null;
  controlSetById: string | null;
  controllerUserId: string | null;
  controllerId: string | null;
  controllerText: string | null;
  controlBasis: string | null;
  reminderInterval: number | null;
}

export const NO_CONTROL: ControlFields = {
  isControlled: false,
  controlSetAt: null,
  controlSetById: null,
  controllerUserId: null,
  controllerId: null,
  controllerText: null,
  controlBasis: null,
  reminderInterval: null,
};

/** Перетворює запит «поставити на контроль» на поля завдання; перевіряє, що контролер існує */
export async function resolveControl(input: ControlInput, actor: User, now = new Date()): Promise<ControlFields> {
  const fields: ControlFields = {
    ...NO_CONTROL,
    isControlled: true,
    controlSetAt: now,
    controlSetById: actor.id,
    controlBasis: input.basis || null,
    reminderInterval: input.reminderInterval ?? null,
  };
  switch (input.by.type) {
    case 'self':
      return { ...fields, controllerUserId: actor.id };
    case 'user': {
      const [u] = await usersRepository.findActiveByIds([input.by.userId]);
      if (!u) throw badRequest('controller_user_not_found');
      return { ...fields, controllerUserId: u.id };
    }
    case 'directory': {
      const person = await directoryRepository.findActive(input.by.controllerId);
      if (!person) throw badRequest('controller_not_found');
      return { ...fields, controllerId: person.id };
    }
    case 'text':
      return { ...fields, controllerText: input.by.text };
  }
}

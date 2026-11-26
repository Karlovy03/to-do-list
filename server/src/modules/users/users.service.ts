import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { z } from 'zod';
import { config } from '../../core/config';
import { badRequest, notFound } from '../../core/http-error';
import { tx } from '../../core/texts';
import { getSettings } from '../settings';
import { unitsRepository } from '../units';
import { usersRepository } from './users.repository';
import type { createUserSchema, updateUserSchema } from './users.schemas';

export const BCRYPT_ROUNDS = 10;

async function checkUnit(unitId: string | null | undefined) {
  if (unitId && !(await unitsRepository.findById(unitId))) throw badRequest('unit_not_found');
}

export const usersService = {
  list(viewer: User, includeInactive: boolean) {
    return usersRepository.list(viewer.role === 'ADMIN' && includeInactive);
  },

  async create(input: z.infer<typeof createUserSchema>) {
    if (await usersRepository.findByLogin(input.login)) throw badRequest('login_taken');
    await checkUnit(input.unitId);
    const s = await getSettings();
    return usersRepository.create({
      login: input.login,
      fullName: input.fullName,
      position: input.position,
      role: input.role,
      ...(input.unitId ? { unit: { connect: { id: input.unitId } } } : {}),
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      quietFrom: s.defaultQuietFrom,
      quietTo: s.defaultQuietTo,
      muteWeekends: s.defaultMuteWeekends,
    });
  },

  async update(actor: User, id: string, input: z.infer<typeof updateUserSchema>) {
    const target = await usersRepository.findById(id);
    if (!target) throw notFound();
    if (target.id === actor.id && (input.isActive === false || (input.role && input.role !== 'ADMIN'))) {
      throw badRequest('cannot_demote_self');
    }
    if (input.login && input.login !== target.login && (await usersRepository.findByLogin(input.login))) {
      throw badRequest('login_taken');
    }
    await checkUnit(input.unitId);
    const { password, unitId, ...rest } = input;
    // зміна пароля, ролі чи вимкнення — старі сесії стають недійсними
    const revoke = !!password || (input.role && input.role !== target.role) || input.isActive === false;
    return usersRepository.update(target.id, {
      ...rest,
      ...(unitId !== undefined ? { unit: unitId ? { connect: { id: unitId } } : { disconnect: true } } : {}),
      ...(password ? { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } : {}),
      ...(revoke ? { tokenVersion: { increment: 1 } } : {}),
    });
  },

  /** Перший запуск: якщо користувачів немає — створюємо адміністратора */
  async ensureAdmin() {
    if ((await usersRepository.count()) > 0) return;
    const password = config.ADMIN_PASSWORD ?? crypto.randomBytes(12).toString('base64url');
    await usersRepository.create({
      login: config.ADMIN_LOGIN.toLowerCase(),
      fullName: tx('users.defaults.admin_name'),
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    });
    console.log(`[bootstrap] admin "${config.ADMIN_LOGIN}" created${config.ADMIN_PASSWORD ? '' : `, one-time password: ${password}`}`);
  },
};

import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { z } from 'zod';
import { config } from '../../core/config';
import { badRequest, notFound } from '../../core/http-error';
import { isUniqueViolation } from '../../core/prisma';
import { tx } from '../../core/texts';
import { getSettings } from '../settings';
import { unitsRepository } from '../units';
import { usersRepository } from './users.repository';
import type { createUserSchema, updateUserSchema } from './users.schemas';
import { liveHub } from '../live';

export const BCRYPT_ROUNDS = 10;

/** Перевірка «логін вільний» і запис — не атомарні; одночасний дубль ловить унікальний індекс */
const loginTaken = (err: unknown): never => {
  throw isUniqueViolation(err) ? badRequest('login_taken') : err;
};

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
    return usersRepository
      .create({
        login: input.login,
        fullName: input.fullName,
        position: input.position,
        role: input.role,
        ...(input.unitId ? { unit: { connect: { id: input.unitId } } } : {}),
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
        quietFrom: s.defaultQuietFrom,
        quietTo: s.defaultQuietTo,
        muteWeekends: s.defaultMuteWeekends,
      })
      .catch(loginTaken);
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
    const updated = await usersRepository
      .update(target.id, {
        ...rest,
        ...(unitId !== undefined ? { unit: unitId ? { connect: { id: unitId } } : { disconnect: true } } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } : {}),
        ...(revoke ? { tokenVersion: { increment: 1 } } : {}),
      })
      .catch(loginTaken);
    // інша роль, підрозділ чи вимкнення — інша видимість: потік живих оновлень відкриється заново з новими правами
    if (revoke || (unitId !== undefined && unitId !== target.unitId)) liveHub.dropUser(target.id);
    return updated;
  },

  /** Перший запуск: якщо користувачів немає — створюємо адміністратора */
  async ensureAdmin() {
    if ((await usersRepository.count()) > 0) return;
    if (!config.ADMIN_PASSWORD) {
      console.error('[bootstrap] no users yet: set ADMIN_PASSWORD in .env to create the first administrator');
      return;
    }
    const password = config.ADMIN_PASSWORD;
    await usersRepository.create({
      login: config.ADMIN_LOGIN.toLowerCase(),
      fullName: tx('users.defaults.admin_name'),
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    });
    // пароль не пишемо в журнал контейнера — він лишився б у логах; без ADMIN_PASSWORD входу немає
    console.log(`[bootstrap] admin "${config.ADMIN_LOGIN}" created`);
  },
};

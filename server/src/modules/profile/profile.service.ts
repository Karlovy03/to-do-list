import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { z } from 'zod';
import { badRequest } from '../../core/http-error';
import { signToken } from '../../core/auth';
import { BCRYPT_ROUNDS, usersRepository } from '../users';
import type { prefsSchema } from './profile.schemas';
import { liveHub } from '../live';

export const profileService = {
  updatePrefs: (user: User, prefs: z.infer<typeof prefsSchema>) => usersRepository.update(user.id, prefs),

  /** Зміна пароля анулює інші сесії; поточна отримує новий токен */
  async changePassword(user: User, current: string, next: string) {
    if (!(await bcrypt.compare(current, user.passwordHash))) throw badRequest('wrong_password');
    const updated = await usersRepository.update(user.id, {
      passwordHash: await bcrypt.hash(next, BCRYPT_ROUNDS),
      tokenVersion: { increment: 1 },
    });
    liveHub.dropUser(user.id);
    return signToken(updated.id, updated.tokenVersion);
  },
};

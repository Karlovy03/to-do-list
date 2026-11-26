import bcrypt from 'bcryptjs';
import { HttpError, unauthorized } from '../../core/http-error';
import { signToken } from '../../core/auth';
import { BCRYPT_ROUNDS, usersRepository } from '../users';
import { pushSubscriptions } from '../notifications';
import { loginLimiter } from './login-limiter';

// Порівняння з фіктивним хешем, щоб час відповіді не видавав, чи існує логін
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

export const authService = {
  async login(login: string, password: string, ip: string) {
    if (loginLimiter.isBlocked(login, ip)) throw new HttpError(429, 'too_many_attempts');
    const user = await usersRepository.findByLogin(login);
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.isActive) {
      loginLimiter.fail(login, ip);
      throw unauthorized('invalid_credentials');
    }
    loginLimiter.success(login, ip);
    return { user, token: signToken(user.id, user.tokenVersion) };
  },

  /**
   * Вихід завершує всі сесії людини (рішення власника): інакше скопійований токен
   * діяв би до кінця строку. Push на всі пристрої теж припиняється — до наступного входу.
   */
  async logout(userId: string) {
    await usersRepository.update(userId, { tokenVersion: { increment: 1 } });
    await pushSubscriptions.removeAllForUser(userId);
  },
};

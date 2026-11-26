import jwt from 'jsonwebtoken';
import { config } from '../config';

/** 14 днів без активності — і треба увійти знову; активна сесія продовжується (middleware) */
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 14;
/** Як часто продовжувати cookie активної сесії */
export const SESSION_RENEW_AFTER_S = 60 * 60 * 24;

interface Claims {
  sub: string;
  /** версія токена користувача — зміна пароля/ролі/вимкнення робить старі токени недійсними */
  v: number;
  /** коли видано, секунди */
  iat: number;
}

export function signToken(userId: string, tokenVersion: number) {
  return jwt.sign({ sub: userId, v: tokenVersion } satisfies Omit<Claims, 'iat'>, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: SESSION_MAX_AGE_S,
  });
}

export function verifyToken(token: string): Claims | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'object' && typeof payload.sub === 'string' && typeof payload.v === 'number' && typeof payload.iat === 'number') {
      return { sub: payload.sub, v: payload.v, iat: payload.iat };
    }
  } catch {
    /* недійсний або прострочений токен */
  }
  return null;
}

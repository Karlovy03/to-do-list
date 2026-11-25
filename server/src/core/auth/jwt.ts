import jwt from 'jsonwebtoken';
import { config } from '../config';

export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;

interface Claims {
  sub: string;
  /** версія токена користувача — зміна пароля/ролі/вимкнення робить старі токени недійсними */
  v: number;
}

export function signToken(userId: string, tokenVersion: number) {
  return jwt.sign({ sub: userId, v: tokenVersion } satisfies Claims, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: SESSION_MAX_AGE_S,
  });
}

export function verifyToken(token: string): Claims | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'object' && typeof payload.sub === 'string' && typeof payload.v === 'number') {
      return { sub: payload.sub, v: payload.v };
    }
  } catch {
    /* недійсний або прострочений токен */
  }
  return null;
}

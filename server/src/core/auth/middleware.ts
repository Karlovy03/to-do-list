import type { Request, RequestHandler } from 'express';
import type { Role, User } from '@prisma/client';
import { sessionRepository } from './session.repository';
import { forbidden, unauthorized } from '../http-error';
import { verifyToken } from './jwt';
import { readToken } from './session';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/** Підставляє req.user, якщо токен дійсний, версія збігається і користувач активний */
export const loadUser: RequestHandler = async (req, _res, next) => {
  const token = readToken(req);
  const claims = token ? verifyToken(token) : null;
  if (claims) {
    const user = await sessionRepository.findUser(claims.sub);
    if (user?.isActive && user.tokenVersion === claims.v) req.user = user;
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : unauthorized());
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    next(roles.includes(req.user.role) ? undefined : forbidden());
  };

/** Поточний користувач у контролері (після requireAuth) */
export function currentUser(req: Request): User {
  if (!req.user) throw unauthorized();
  return req.user;
}

export const isManager = (u: Pick<User, 'role'>) => u.role === 'ADMIN' || u.role === 'DIRECTOR' || u.role === 'MANAGER';

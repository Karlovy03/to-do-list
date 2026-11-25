import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { prisma } from './prisma';
import { config } from './config';
import { HttpError } from './http';

export const COOKIE = 'kt_session';
const MAX_AGE_S = 60 * 60 * 24 * 30;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: MAX_AGE_S });
}

export function setSession(res: Response, userId: string) {
  const token = signToken(userId);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    maxAge: MAX_AGE_S * 1000,
    path: '/',
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: '/' });
}

export const loadUser: RequestHandler = async (req, _res, next) => {
  // веб — httpOnly cookie; мобільний застосунок — заголовок Authorization: Bearer
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user?.isActive) req.user = user;
  } catch {
    /* недійсний токен — анонім */
  }
  next();
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'unauthorized'));
  next();
}

export const requireRole = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'unauthorized'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'forbidden'));
  next();
};

export function me(req: Request): User {
  if (!req.user) throw new HttpError(401, 'unauthorized');
  return req.user;
}

export const isManager = (u: User) => u.role === 'ADMIN' || u.role === 'MANAGER';

export function publicUser(u: User) {
  return { id: u.id, fullName: u.fullName, position: u.position, role: u.role, isActive: u.isActive };
}

export function selfUser(u: User) {
  return {
    ...publicUser(u),
    login: u.login,
    prefs: {
      quietFrom: u.quietFrom,
      quietTo: u.quietTo,
      muteWeekends: u.muteWeekends,
      notifyAssigned: u.notifyAssigned,
      notifyControl: u.notifyControl,
      notifyDeadline: u.notifyDeadline,
      notifyUpdates: u.notifyUpdates,
      controlInterval: u.controlInterval,
    },
  };
}

import type { Request, Response } from 'express';
import { config } from '../config';
import { SESSION_MAX_AGE_S } from './jwt';

export const SESSION_COOKIE = 'kt_session';

/** Веб — httpOnly cookie; мобільний застосунок — заголовок Authorization: Bearer */
export function readToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[SESSION_COOKIE];
}

export const isNativeClient = (req: Request) => req.headers['x-client'] === 'native';

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd,
    maxAge: SESSION_MAX_AGE_S * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

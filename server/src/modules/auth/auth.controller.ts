import type { Request, Response } from 'express';
import { clearSessionCookie, currentUser, isNativeClient, setSessionCookie } from '../../core/auth';
import { selfUser } from '../users';
import { loginSchema } from './auth.schemas';
import { authService } from './auth.service';

export const authController = {
  async login(req: Request, res: Response) {
    const { login, password } = loginSchema.parse(req.body);
    const { user, token } = await authService.login(login, password, req.ip ?? 'unknown');
    // застосунок зберігає токен у захищеному сховищі; веб отримує httpOnly cookie
    if (isNativeClient(req)) {
      res.json({ ...selfUser(user), token });
      return;
    }
    setSessionCookie(res, token);
    res.json(selfUser(user));
  },

  async logout(req: Request, res: Response) {
    if (req.user) await authService.logout(req.user.id);
    clearSessionCookie(res);
    res.json({ ok: true });
  },

  me(req: Request, res: Response) {
    res.json(selfUser(currentUser(req)));
  },
};

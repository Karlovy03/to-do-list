import type { Request, Response } from 'express';
import { currentUser, isNativeClient, setSessionCookie } from '../../core/auth';
import { selfUser } from '../users';
import { passwordChangeSchema, prefsSchema } from './profile.schemas';
import { profileService } from './profile.service';

export const profileController = {
  async updatePrefs(req: Request, res: Response) {
    const user = await profileService.updatePrefs(currentUser(req), prefsSchema.parse(req.body));
    res.json(selfUser(user));
  },

  async changePassword(req: Request, res: Response) {
    const { current, next } = passwordChangeSchema.parse(req.body);
    const token = await profileService.changePassword(currentUser(req), current, next);
    if (isNativeClient(req)) {
      res.json({ ok: true, token });
      return;
    }
    setSessionCookie(res, token);
    res.json({ ok: true });
  },
};

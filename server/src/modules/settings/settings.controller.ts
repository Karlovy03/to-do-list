import type { Request, Response } from 'express';
import { reminderSettingsSchema } from './settings.schemas';
import { getSettings, saveSettings } from './settings.service';

export const settingsController = {
  async get(_req: Request, res: Response) {
    res.json(await getSettings());
  },
  async put(req: Request, res: Response) {
    res.json(await saveSettings(reminderSettingsSchema.parse(req.body)));
  },
};

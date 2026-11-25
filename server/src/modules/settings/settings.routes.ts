import { Router } from 'express';
import { requireRole } from '../../lib/auth';
import { getSettings, reminderSettingsSchema, saveSettings } from '../settings/settings.service';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
  res.json(await getSettings());
});

settingsRouter.put('/', requireRole('ADMIN'), async (req, res) => {
  res.json(await saveSettings(reminderSettingsSchema.parse(req.body)));
});

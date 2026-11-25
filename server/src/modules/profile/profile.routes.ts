import { Router } from 'express';
import { profileController } from './profile.controller';

export const profileRouter = Router();

profileRouter.put('/prefs', profileController.updatePrefs);
profileRouter.put('/password', profileController.changePassword);

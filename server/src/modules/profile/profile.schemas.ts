import { z } from 'zod';
import { passwordSchema } from '../users';

const hour = z.number().int().min(0).max(23);

export const prefsSchema = z.object({
  quietFrom: hour,
  quietTo: hour,
  muteWeekends: z.boolean(),
  notifyAssigned: z.boolean(),
  notifyControl: z.boolean(),
  notifyDeadline: z.boolean(),
  notifyUpdates: z.boolean(),
  controlInterval: z.number().int().min(15).max(7 * 1440).nullable(),
});

export const passwordChangeSchema = z.object({ current: z.string().min(1).max(200), next: passwordSchema });

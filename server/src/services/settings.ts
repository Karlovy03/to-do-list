import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const reminderSettingsSchema = z.object({
  /** як часто нагадувати по контрольних завданнях, хв */
  controlIntervalMin: z.number().int().min(15).max(7 * 1440),
  /** за скільки хвилин до терміну попереджати (кілька порогів) */
  deadlineOffsetsMin: z.array(z.number().int().min(15).max(30 * 1440)).max(6),
  /** як часто повторювати нагадування про прострочення, хв */
  overdueRepeatMin: z.number().int().min(30).max(7 * 1440),
  /** термінові завдання ігнорують «тихі години» */
  urgentBypassQuiet: z.boolean(),
  /** також нагадувати автору/контролеру про прострочені завдання */
  overdueNotifyAuthor: z.boolean(),
  /** типові «тихі години» для нових користувачів */
  defaultQuietFrom: z.number().int().min(0).max(23),
  defaultQuietTo: z.number().int().min(0).max(23),
  defaultMuteWeekends: z.boolean(),
});

export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;

export const DEFAULT_SETTINGS: ReminderSettings = {
  controlIntervalMin: 120,
  deadlineOffsetsMin: [3 * 1440, 1440, 120],
  overdueRepeatMin: 1440,
  urgentBypassQuiet: true,
  overdueNotifyAuthor: true,
  defaultQuietFrom: 20,
  defaultQuietTo: 8,
  defaultMuteWeekends: true,
};

const KEY = 'reminders';
let cache: { value: ReminderSettings; at: number } | null = null;

export async function getSettings(): Promise<ReminderSettings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  const parsed = reminderSettingsSchema.partial().safeParse(row?.value ?? {});
  const value = { ...DEFAULT_SETTINGS, ...(parsed.success ? parsed.data : {}) };
  cache = { value, at: Date.now() };
  return value;
}

export async function saveSettings(next: ReminderSettings): Promise<ReminderSettings> {
  const value = { ...next, deadlineOffsetsMin: [...new Set(next.deadlineOffsetsMin)].sort((a, b) => b - a) };
  await prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  cache = null;
  return value;
}

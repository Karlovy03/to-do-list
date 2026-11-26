import { z } from 'zod';

const minutes = (min: number, max: number) => z.number().int().min(min).max(max);

export const reminderSettingsSchema = z.object({
  /** як часто нагадувати по контрольних завданнях, хв */
  controlIntervalMin: minutes(15, 7 * 1440),
  /** за скільки хвилин до терміну попереджати */
  deadlineOffsetsMin: z.array(minutes(15, 30 * 1440)).max(6),
  /** як часто повторювати про прострочення, хв */
  overdueRepeatMin: minutes(30, 7 * 1440),
  /** термінові завдання ігнорують «тихі години» */
  urgentBypassQuiet: z.boolean(),
  /** про прострочення нагадувати також автору і контролеру */
  overdueNotifyLeads: z.boolean(),
  /** типові «тихі години» для нових користувачів */
  defaultQuietFrom: z.number().int().min(0).max(23),
  defaultQuietTo: z.number().int().min(0).max(23),
  defaultMuteWeekends: z.boolean(),
  /** за скільки хвилин до початку заходу нагадувати учасникам (ADR-0016); default — для адмінки старої версії */
  eventReminderMin: minutes(5, 240).default(15),
});

export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;

export const DEFAULT_SETTINGS: ReminderSettings = {
  controlIntervalMin: 120,
  deadlineOffsetsMin: [3 * 1440, 1440, 120],
  overdueRepeatMin: 1440,
  urgentBypassQuiet: true,
  overdueNotifyLeads: true,
  defaultQuietFrom: 20,
  defaultQuietTo: 8,
  defaultMuteWeekends: true,
  eventReminderMin: 15,
};

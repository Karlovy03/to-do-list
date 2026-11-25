import { settingsRepository } from './settings.repository';
import { DEFAULT_SETTINGS, reminderSettingsSchema, type ReminderSettings } from './settings.schemas';

const KEY = 'reminders';
const TTL_MS = 30_000;
let cache: { value: ReminderSettings; at: number } | null = null;

/** Кожне поле перевіряється окремо: одне зіпсоване значення не скидає решту до типових */
function merge(stored: unknown): ReminderSettings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  if (stored && typeof stored === 'object') {
    for (const [k, field] of Object.entries(reminderSettingsSchema.shape)) {
      const v = (stored as Record<string, unknown>)[k];
      if (v !== undefined && field.safeParse(v).success) out[k] = v;
    }
  }
  return out as ReminderSettings;
}

export async function getSettings(): Promise<ReminderSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const row = await settingsRepository.get(KEY);
  cache = { value: merge(row?.value), at: Date.now() };
  return cache.value;
}

export async function saveSettings(next: ReminderSettings): Promise<ReminderSettings> {
  const value = { ...next, deadlineOffsetsMin: [...new Set(next.deadlineOffsetsMin)].sort((a, b) => b - a) };
  await settingsRepository.put(KEY, value);
  cache = null;
  return value;
}

/** Варіанти загальних налаштувань нагадувань, хв (Figma 11 · Адміністрування: нагадування) */
export const CONTROL_INTERVALS = [
  { value: 60, key: 'every_1h' },
  { value: 120, key: 'every_2h' },
  { value: 180, key: 'every_3h' },
  { value: 240, key: 'every_4h' },
  { value: 1440, key: 'daily' },
];

export const DEADLINE_OFFSETS = [
  { value: 4320, key: 'before_3d' },
  { value: 1440, key: 'before_1d' },
  { value: 120, key: 'before_2h' },
  { value: 30, key: 'before_30m' },
];

export const OVERDUE_REPEATS = [
  { value: 240, key: 'every_4h' },
  { value: 1440, key: 'daily' },
];

/** Нагадування учасникам заходу до його початку (ADR-0016) */
export const EVENT_REMINDERS = [
  { value: 5, key: 'before_5m' },
  { value: 15, key: 'before_15m' },
  { value: 30, key: 'before_30m' },
  { value: 60, key: 'before_1h' },
];

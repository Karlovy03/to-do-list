import { recall, remember } from './deviceMemory';

/** Старіша чернетка вже не про те, що людина збиралась зробити */
export const DRAFT_MAX_AGE = 7 * 24 * 3600_000;

export interface Draft<T> {
  data: T;
  savedAt: string;
}

/** Чернетка форми цієї людини на цьому пристрої (ADR-0022); зіпсована чи стара — ніби її немає */
export function readDraft<T>(userId: string, name: string, parse: (raw: unknown) => T | null, now = new Date()): Draft<T> | null {
  try {
    const v: unknown = JSON.parse(recall(userId, name) ?? 'null');
    if (typeof v !== 'object' || v === null) return null;
    const { savedAt, data } = v as Record<string, unknown>;
    if (typeof savedAt !== 'string' || !(now.getTime() - Date.parse(savedAt) < DRAFT_MAX_AGE)) return null;
    const parsed = parse(data);
    return parsed === null ? null : { data: parsed, savedAt };
  } catch {
    return null;
  }
}

/** null — стерти (порожня форма, «Очистити», надіслано) */
export function writeDraft<T>(userId: string, name: string, data: T | null, now = new Date()) {
  remember(userId, name, data === null ? null : JSON.stringify({ savedAt: now.toISOString(), data }));
}

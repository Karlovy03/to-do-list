import type { RequestHandler } from 'express';
import { monitoringRepository as repo } from './monitoring.repository';

/*
 * Візити (ADR-0024): неперервна активність людини. Перерва понад 30 хв — новий візит.
 * Пишемо у фоні й не частіше ніж раз на хвилину на людину — запит не чекає бази.
 * Після перезапуску сервера пам'ять порожня — перший запит людини бере її останній візит із бази.
 */
export const VISIT_GAP_MS = 30 * 60_000;
export const WRITE_EVERY_MS = 60_000;

interface Known {
  visitId: string;
  /** коли востаннє записано в базу */
  writtenAt: number;
}

const known = new Map<string, Known>();
const busy = new Set<string>();

export const activityTracker = {
  async touch(userId: string, now = new Date()) {
    const k = known.get(userId);
    if ((k && now.getTime() - k.writtenAt < WRITE_EVERY_MS) || busy.has(userId)) return;
    busy.add(userId);
    try {
      const last = k ? { id: k.visitId, lastAt: new Date(k.writtenAt) } : await repo.latestVisit(userId);
      const visit = last && now.getTime() - last.lastAt.getTime() <= VISIT_GAP_MS ? await repo.extendVisit(last.id, now) : await repo.startVisit(userId, now);
      known.set(userId, { visitId: visit.id, writtenAt: now.getTime() });
    } finally {
      busy.delete(userId);
    }
  },

  /** Для тестів і на випадок, якщо візит видалили в базі */
  forget: (userId?: string) => (userId ? known.delete(userId) : known.clear()),
};

/** Після requireAuth: кожен запит людини — це її активність */
export const trackActivity: RequestHandler = (req, _res, next) => {
  const id = req.user?.id;
  if (id) {
    activityTracker.touch(id).catch((err: unknown) => {
      // візит видалили (прибирання) — наступний запит почне новий
      activityTracker.forget(id);
      console.error('[monitoring] visit write failed', err);
    });
  }
  next();
};

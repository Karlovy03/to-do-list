import { prisma } from './prisma';

/**
 * Виконує fn, лише якщо цей процес отримав advisory-lock PostgreSQL.
 * Так фонові задачі не дублюються при кількох процесах сервера.
 * Блокування сесійне, тому тримаємо одне з'єднання на весь виклик.
 */
export async function withAdvisoryLock<T>(key: number, fn: () => Promise<T>): Promise<T | null> {
  return prisma.$transaction(
    async (tx) => {
      const [row] = await tx.$queryRaw<{ ok: boolean }[]>`SELECT pg_try_advisory_xact_lock(${key}) AS ok`;
      if (!row?.ok) return null;
      return fn();
    },
    { timeout: 5 * 60_000, maxWait: 10_000 },
  );
}

export const LOCKS = { reminders: 7001, cleanup: 7002, unitTree: 7003, monitoring: 7004 } as const;

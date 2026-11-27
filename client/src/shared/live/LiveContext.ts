import { createContext, useContext } from 'react';

/** Чи живий зараз потік оновлень (ADR-0021); дає провайдер застосунку */
export const LiveContext = createContext(false);

/** Страховка поверх живого потоку: поки він живий — рідко (5 хв), без нього — як було */
export const SAFETY_INTERVAL = 5 * 60_000;

export function useRefetchInterval(base: number) {
  return useContext(LiveContext) ? Math.max(base, SAFETY_INTERVAL) : base;
}

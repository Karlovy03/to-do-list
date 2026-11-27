import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { App as NativeApp } from '@capacitor/app';
import { useSession } from '@/modules/auth';
import { UNAUTHORIZED_EVENT } from '@/shared/api/client';
import { isNative } from '@/shared/lib/platform';
import { LiveContext } from '@/shared/live/LiveContext';
import { keysFor, readSignal, retryDelay } from './signals';
import { openStream } from './stream';

/** Кілька змін поспіль (наприклад, «Виконано» й автозавершення) — одне перечитування */
const BATCH_MS = 300;

/**
 * Живі оновлення (ADR-0021): одне з'єднання на застосунок, поки людина увійшла.
 * Сигнал → перечитати показані дані; обрив → повтор з паузою, а після нього — перечитати все.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const { me } = useSession();
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const userId = me?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let stop: (() => void) | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let everOpen = false;
    let gone = false;
    const pending = new Map<string, QueryKey>();
    let flush: ReturnType<typeof setTimeout> | undefined;

    const queue = (keys: QueryKey[]) => {
      for (const k of keys) pending.set(JSON.stringify(k), k);
      clearTimeout(flush);
      flush = setTimeout(() => {
        for (const k of pending.values()) void qc.invalidateQueries({ queryKey: k });
        pending.clear();
      }, BATCH_MS);
    };

    const connect = () => {
      clearTimeout(retry);
      stop?.();
      stop = openStream({
        onOpen: () => {
          attempt = 0;
          setConnected(true);
          // пропущене під час обриву не відтворюється — перечитуємо все показане
          if (everOpen) void qc.invalidateQueries();
          everOpen = true;
        },
        onData: (data) => {
          const s = readSignal(data);
          if (s) queue(keysFor(s));
        },
        onClose: (reason) => {
          setConnected(false);
          stop = null;
          if (gone) return;
          if (reason === 'unauthorized') {
            window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
            return;
          }
          retry = setTimeout(connect, retryDelay(attempt));
          attempt += 1;
        },
      });
    };

    // повернулись у вкладку, з'явилась мережа, застосунок вийшов із фону — не чекати паузи повтору
    const wake = () => {
      if (document.visibilityState === 'visible' && !stop) connect();
    };
    connect();
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    const resume = isNative ? NativeApp.addListener('resume', wake) : null;

    return () => {
      gone = true;
      clearTimeout(retry);
      clearTimeout(flush);
      stop?.();
      setConnected(false);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      void resume?.then((h) => h.remove());
    };
  }, [userId, qc]);

  return <LiveContext.Provider value={connected}>{children}</LiveContext.Provider>;
}

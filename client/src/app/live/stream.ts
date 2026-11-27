import { authInit, url } from '@/shared/api/client';
import { sseParser } from '@/shared/lib/sse';

export interface StreamHandlers {
  onOpen: () => void;
  onData: (data: string) => void;
  /** 401 — сесія скінчилась, повторювати не треба */
  onClose: (reason: 'ended' | 'unauthorized') => void;
}

/** Без жодного байта довше — з'єднання вважається мертвим (сервер шле серцебиття кожні 25 с) */
export const SILENCE_MS = 60_000;

/**
 * Потік GET /api/live через fetch: EventSource не вміє заголовок Authorization, а застосунок входить токеном.
 * Повертає функцію, що обриває потік.
 */
export function openStream(h: StreamHandlers): () => void {
  const ctrl = new AbortController();
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const alive = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => ctrl.abort(), SILENCE_MS);
  };
  let closed = false;
  const close = (reason: 'ended' | 'unauthorized') => {
    clearTimeout(watchdog);
    if (closed) return;
    closed = true;
    h.onClose(reason);
  };

  void (async () => {
    try {
      const { headers, credentials } = authInit();
      const res = await fetch(url('/live'), { headers: { ...headers, Accept: 'text/event-stream' }, credentials, signal: ctrl.signal, cache: 'no-store' });
      if (res.status === 401) return close('unauthorized');
      if (!res.ok || !res.body) return close('ended');
      h.onOpen();
      alive();
      const push = sseParser((e) => e.event === 'change' && h.onData(e.data));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        alive();
        push(dec.decode(value, { stream: true }));
      }
      close('ended');
    } catch {
      close('ended');
    }
  })();

  return () => {
    closed = true;
    clearTimeout(watchdog);
    ctrl.abort();
  };
}

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { syncWebPush } from '../push/webPush';
import { PUSH_STATE_KEY } from './usePushDevice';

/** Після входу оновлює підписку цього браузера на сервері (див. syncWebPush) */
export function usePushSync(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    syncWebPush()
      .catch(() => undefined)
      .finally(() => void qc.invalidateQueries({ queryKey: PUSH_STATE_KEY }));
  }, [userId, qc]);
}

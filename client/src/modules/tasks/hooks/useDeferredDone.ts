import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { taskKeys, tasksApi } from '../api/tasks.api';

export const UNDO_MS = 5000;

/**
 * «Виконано» свайпом: запит іде через 5 с, поки показано тост «Скасувати».
 * Скасування не потребує сервера — запит просто не надсилається.
 */
export function useDeferredDone() {
  const qc = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, number>());

  const forget = useCallback((id: string) => {
    timers.current.delete(id);
    setPending((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }, []);

  const markDone = useCallback(
    (id: string) => {
      setPending((s) => new Set(s).add(id));
      const timer = window.setTimeout(async () => {
        try {
          await tasksApi.done(id);
        } catch (err) {
          toast(errorText(err));
        }
        await qc.invalidateQueries({ queryKey: taskKeys.all });
        forget(id);
      }, UNDO_MS);
      timers.current.set(id, timer);
      toast(t('tasks.toast.done'), {
        actionLabel: t('shared.ui.undo'),
        duration: UNDO_MS,
        onAction: () => {
          window.clearTimeout(timers.current.get(id));
          forget(id);
        },
      });
    },
    [qc, toast, forget],
  );

  // запити, що чекають, при виході зі сторінки надсилаються одразу — дія людини не губиться
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const [id, timer] of map) {
        window.clearTimeout(timer);
        void tasksApi.done(id).finally(() => qc.invalidateQueries({ queryKey: taskKeys.all }));
      }
    };
  }, [qc]);

  return { pending, markDone };
}

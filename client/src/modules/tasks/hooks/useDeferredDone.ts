import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/modules/auth';
import { errorText } from '@/shared/api/errors';
import type { Task } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { taskKeys, tasksApi } from '../api/tasks.api';
import { hideCheer, shouldCheer, showCheer } from '../lib/cheer';

export const UNDO_MS = 5000;

/**
 * «Виконано» свайпом: запит іде через 5 с, поки показано тост «Скасувати».
 * Скасування не потребує сервера — запит просто не надсилається.
 * Ящірка на контрольному з'являється одразу, разом із тостом, і «Скасувати» прибирає й її.
 */
export function useDeferredDone() {
  const { me } = useSession();
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
    (task: Task) => {
      const id = task.id;
      setPending((s) => new Set(s).add(id));
      if (shouldCheer(task, me)) showCheer();
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
          hideCheer();
        },
      });
    },
    [qc, toast, forget, me],
  );

  // запити, що чекають, при виході зі сторінки чи закритті вкладки надсилаються одразу — дія людини не губиться
  useEffect(() => {
    const map = timers.current;
    const flush = () => {
      for (const [id, timer] of map) {
        window.clearTimeout(timer);
        void tasksApi.done(id, '', true).finally(() => qc.invalidateQueries({ queryKey: taskKeys.all }));
      }
      map.clear();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [qc]);

  return { pending, markDone };
}

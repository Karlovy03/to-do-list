import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useFeed } from '@/modules/notifications';
import { markFresh, taskKeys, tasksApi } from '@/modules/tasks';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { shortName } from '@/shared/lib/names';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { freshAssignments } from './newTasks';

/** Скільки висить повідомлення про нове завдання — довше за звичайне підтвердження */
const SHOW_MS = 6_000;

/**
 * «Нове завдання від Коваленко О. · Відкрити» (Figma 39, 40), поки застосунок відкритий: лише про доручене мені.
 * Картка в списку на кілька секунд підсвічується. Застосунок закритий — як і раніше, push.
 */
export function NewTaskNotice() {
  const feed = useFeed();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const flip = useWindowClass() === 'xs';
  const seen = useRef<ReadonlySet<string> | null>(null);

  useEffect(() => {
    if (!feed.data) return;
    const next = freshAssignments(seen.current, feed.data.items);
    seen.current = next.seen;
    const latest = next.fresh[0];
    if (!latest?.taskId) return;
    const taskId = latest.taskId;
    for (const n of next.fresh) if (n.taskId) markFresh(n.taskId);
    const show = (name: string | null) =>
      toast(name && !flip ? t('app.live.new_task_from', { name }) : t('app.live.new_task'), {
        icon: 'bell',
        duration: SHOW_MS,
        actionLabel: t('app.live.open'),
        onAction: () => navigate(`/t/${taskId}`),
      });
    qc.fetchQuery({ queryKey: taskKeys.detail(taskId), queryFn: () => tasksApi.get(taskId) })
      .then((task) => show(shortName(task.author.fullName)))
      .catch(() => show(null));
  }, [feed.data, toast, navigate, qc, flip]);

  return null;
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ControlInput } from '@/shared/api/types';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { taskKeys, tasksApi, type NewTask } from '../api/tasks.api';

/** Будь-яка дія із завданням оновлює списки, картку і стрічку сповіщень */
function useTaskMutation<V, R = unknown>(fn: (v: V) => Promise<R>, doneKey?: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taskKeys.all });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      if (doneKey) toast(t(doneKey));
    },
    onError: (err) => toast(errorText(err)),
  });
}

export function useTaskActions(id: string) {
  return {
    start: useTaskMutation(() => tasksApi.start(id), 'tasks.toast.started'),
    done: useTaskMutation((comment: string) => tasksApi.done(id, comment), 'tasks.toast.done'),
    returnBack: useTaskMutation((v: { comment: string; deadline?: string }) => tasksApi.returnBack(id, v.comment, v.deadline), 'tasks.toast.returned'),
    close: useTaskMutation((comment: string) => tasksApi.close(id, comment), 'tasks.toast.closed'),
    cancel: useTaskMutation((comment: string) => tasksApi.cancel(id, comment), 'tasks.toast.cancelled'),
    reopen: useTaskMutation((deadline?: string) => tasksApi.reopen(id, deadline), 'tasks.toast.reopened'),
    snooze: useTaskMutation(() => tasksApi.snooze(id), 'tasks.toast.snoozed'),
    addNote: useTaskMutation((v: { text: string; progress?: number }) => tasksApi.addNote(id, v)),
    setControl: useTaskMutation((v: ControlInput) => tasksApi.setControl(id, v), 'tasks.toast.control_set'),
    removeControl: useTaskMutation((reason: string) => tasksApi.removeControl(id, reason), 'tasks.toast.control_removed'),
    remove: useTaskMutation(() => tasksApi.remove(id), 'tasks.toast.deleted'),
  };
}

export const useCreateTask = () => useTaskMutation((v: NewTask) => tasksApi.create(v), 'tasks.toast.created');

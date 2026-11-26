import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { eventKeys, eventsApi, type EventChanges, type EventInput } from '../api/events.api';

/** Будь-яка дія із заходом оновлює списки, картку, календар і стрічку сповіщень */
function useEventMutation<V, R = unknown>(fn: (v: V) => Promise<R>, doneKey: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: eventKeys.all });
      void qc.invalidateQueries({ queryKey: ['calendar'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      toast(t(doneKey));
    },
    onError: (err) => toast(errorText(err)),
  });
}

export function useEventActions(id: string) {
  return {
    update: useEventMutation((v: EventChanges) => eventsApi.update(id, v), 'events.toast.updated'),
    cancel: useEventMutation((reason: string) => eventsApi.cancel(id, reason), 'events.toast.cancelled'),
    remove: useEventMutation(() => eventsApi.remove(id), 'events.toast.deleted'),
  };
}

export const useCreateEvent = () => useEventMutation((v: EventInput) => eventsApi.create(v), 'events.toast.created');

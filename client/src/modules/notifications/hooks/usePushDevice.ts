import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { enableWebPush, webPushState } from '../push/webPush';

export const PUSH_STATE_KEY = ['push-state'] as const;

/** Стан сповіщень пристрою, увімкнення і пробне сповіщення */
export function usePushDevice() {
  const qc = useQueryClient();
  const toast = useToast();
  const state = useQuery({ queryKey: PUSH_STATE_KEY, queryFn: webPushState, staleTime: Infinity });
  const enable = useMutation({
    mutationFn: enableWebPush,
    onSuccess: (s) => qc.setQueryData(PUSH_STATE_KEY, s),
    onError: (err) => toast(errorText(err)),
  });
  const test = useMutation({
    mutationFn: () => api('/push/test', { method: 'POST', body: {} }),
    onSuccess: () => toast(t('notifications.device.test_sent')),
    onError: (err) => toast(errorText(err)),
  });
  return { state: state.data, enable, test };
}

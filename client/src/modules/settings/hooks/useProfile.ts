import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Me, Prefs } from '@/shared/api/types';
import { authKeys } from '@/modules/auth';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { setToken } from '@/shared/lib/token';
import { useToast } from '@/shared/ui';
import { profileApi } from '../api/settings.api';

/** Кожна зміна перемикача зберігається одразу; інтерфейс змінюється до відповіді сервера */
export function useUpdatePrefs(me: Me) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: profileApi.prefs,
    onMutate: (prefs: Prefs) => qc.setQueryData<Me>(authKeys.me, { ...me, prefs }),
    onSuccess: (fresh) => qc.setQueryData<Me>(authKeys.me, fresh),
    onError: (err) => {
      qc.setQueryData<Me>(authKeys.me, me);
      toast(errorText(err));
    },
  });
  return (patch: Partial<Prefs>) => m.mutate({ ...me.prefs, ...patch });
}

export function useChangePassword() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => profileApi.password(current, next),
    onSuccess: async (r) => {
      if (r.token) await setToken(r.token);
      toast(t('settings.password.changed'));
    },
  });
}

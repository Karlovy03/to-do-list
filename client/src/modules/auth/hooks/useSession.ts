import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, UNAUTHORIZED_EVENT } from '@/shared/api/client';
import { forgetPeople } from '@/shared/lib/deviceMemory';
import { setToken } from '@/shared/lib/token';
import { authApi, authKeys } from '../api/auth.api';

/** Поточний користувач; null — не увійшов */
export function useSession() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  // будь-яка відповідь 401 означає, що сесія завершилась
  useEffect(() => {
    const onUnauthorized = () => qc.setQueryData(authKeys.me, null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [qc]);

  return { me: q.data ?? null, isLoading: q.isLoading, error: q.error };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ login, password }: { login: string; password: string }) => authApi.login(login, password),
    onSuccess: async (me) => {
      if (me.token) await setToken(me.token);
      qc.setQueryData(authKeys.me, me);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    // сервер завершує всі сесії людини і прибирає її підписки на push
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      // спільний комп'ютер: наступний не побачить чужих фільтрів, недавніх людей, згорнутого (ADR-0022)
      forgetPeople();
      await setToken(null);
      qc.clear();
      qc.setQueryData(authKeys.me, null);
    },
  });
}

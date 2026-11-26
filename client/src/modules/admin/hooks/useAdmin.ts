import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { peopleKeys } from '@/shared/api/people';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { adminApi, adminKeys, type PersonInput, type UnitInput, type UserInput } from '../api/admin.api';

/** Збереження в адмінці: оновлює і свої списки, і списки вибору людей у завданнях */
function useSave<V, R>(fn: (v: V) => Promise<R>, keys: QueryKey[]) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      keys.forEach((queryKey) => void qc.invalidateQueries({ queryKey }));
      toast(t('admin.common.saved'));
    },
  });
}

export const useAdminUsers = () => useQuery({ queryKey: adminKeys.users, queryFn: adminApi.users });
export const useAdminDirectory = () => useQuery({ queryKey: adminKeys.directory, queryFn: adminApi.directory });
export const useReminderSettings = () => useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings });

export const useSaveUser = () =>
  useSave((v: { id?: string; input: UserInput }) => (v.id ? adminApi.updateUser(v.id, v.input) : adminApi.createUser(v.input)), [adminKeys.users, peopleKeys.users]);

export const useSavePerson = () =>
  useSave((v: { id?: string; input: PersonInput }) => (v.id ? adminApi.updatePerson(v.id, v.input) : adminApi.createPerson(v.input)), [adminKeys.directory, peopleKeys.directory]);

// структура змінює і назви підрозділів у людей, і вертикаль керівників — оновлюємо все, що від неї залежить
export const useSaveUnit = () =>
  useSave((v: { id?: string; input: UnitInput }) => (v.id ? adminApi.updateUnit(v.id, v.input) : adminApi.createUnit(v.input)), [peopleKeys.units, ['tasks']]);
export const useRemoveUnit = () => useSave((id: string) => adminApi.removeUnit(id), [peopleKeys.units]);

export function useSaveSettings() {
  const toast = useToast();
  const save = useSave(adminApi.saveSettings, [adminKeys.settings]);
  return { ...save, mutate: (v: Parameters<typeof adminApi.saveSettings>[0]) => save.mutate(v, { onError: (err) => toast(errorText(err)) }) };
}

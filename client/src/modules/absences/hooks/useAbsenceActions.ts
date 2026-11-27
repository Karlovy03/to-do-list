import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { useToast } from '@/shared/ui';
import { absenceKeys, absencesApi, type AbsenceChanges, type AbsenceInput } from '../api/absences.api';

/** Будь-яка зміна оновлює відсутності, календар і «В строю» */
function useAbsenceMutation<V, R = unknown>(fn: (v: V) => Promise<R>, doneKey: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: absenceKeys.all });
      void qc.invalidateQueries({ queryKey: ['calendar'] });
      toast(t(doneKey));
    },
    onError: (err) => toast(errorText(err)),
  });
}

export const useCreateAbsence = () => useAbsenceMutation((v: AbsenceInput) => absencesApi.create(v), 'absences.toast.created');

export function useAbsenceActions(id: string) {
  return {
    update: useAbsenceMutation((v: AbsenceChanges) => absencesApi.update(id, v), 'absences.toast.updated'),
    remove: useAbsenceMutation(() => absencesApi.remove(id), 'absences.toast.removed'),
    end: useAbsenceMutation(() => absencesApi.end(id), 'absences.toast.ended'),
  };
}

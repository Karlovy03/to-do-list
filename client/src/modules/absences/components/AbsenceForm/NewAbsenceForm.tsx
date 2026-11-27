import type { Absence, Me } from '@/shared/api/types';
import { useCreateAbsence } from '../../hooks/useAbsenceActions';
import { AbsenceForm } from './AbsenceForm';

/** Нова відсутність — для «Створити», «Мої відсутності» й «В строю» */
export function NewAbsenceForm({ me, active, onCreated }: { me: Me; active?: boolean; onCreated: (a: Absence) => void }) {
  const create = useCreateAbsence();
  return <AbsenceForm me={me} active={active} busy={create.isPending} onSubmit={(input) => create.mutate(input, { onSuccess: onCreated })} />;
}

import { useState } from 'react';
import type { Absence, Me } from '@/shared/api/types';
import { dayRange, todayKey } from '@/shared/lib/days';
import { t } from '@/shared/lib/texts';
import { Button, PersonLine, Sheet } from '@/shared/ui';
import type { AbsenceInput } from '../../api/absences.api';
import { useAbsenceActions } from '../../hooks/useAbsenceActions';
import { AbsenceBadge } from '../AbsenceBadge/AbsenceBadge';
import { AbsenceForm } from '../AbsenceForm/AbsenceForm';
import css from './AbsenceSheet.module.css';

/** Відсутність: хто, коли; змінити, «вийшов на службу», зняти — якщо можна (автор або керівник людини) */
export function AbsenceSheet({ absence, me, onClose }: { absence: Absence; me: Me; onClose: () => void }) {
  const a = useAbsenceActions(absence.id);
  const [editing, setEditing] = useState(false);
  const today = todayKey();
  const canEnd = absence.can.change && absence.endDay >= today;
  const save = ({ kind, startDay, endDay }: AbsenceInput) =>
    a.update.mutate({ kind, startDay, endDay }, { onSuccess: onClose });

  if (editing) {
    return (
      <Sheet title={t('absences.actions.edit_title')} onClose={onClose}>
        <AbsenceForm me={me} initial={absence} busy={a.update.isPending} onSubmit={save} />
      </Sheet>
    );
  }
  return (
    <Sheet title={t('absences.actions.title')} onClose={onClose}>
      <PersonLine person={absence.person} note={absence.person.position} />
      <div className={css.when}>
        <AbsenceBadge absence={absence} today={today} />
        <span>{dayRange(absence.startDay, absence.endDay)}</span>
      </div>
      {absence.createdBy && absence.createdBy.id !== absence.person.id && (
        <p className={css.note}>{t('absences.actions.by', { name: absence.createdBy.fullName })}</p>
      )}
      {absence.can.change ? (
        <div className={css.buttons}>
          {canEnd && (
            <Button variant="primary" size="l" block disabled={a.end.isPending} onClick={() => a.end.mutate(undefined, { onSuccess: onClose })}>
              {t('absences.actions.end')}
            </Button>
          )}
          <Button variant="outline" size="l" block onClick={() => setEditing(true)}>{t('absences.actions.edit')}</Button>
          <Button variant="danger" size="l" block disabled={a.remove.isPending} onClick={() => a.remove.mutate(undefined, { onSuccess: onClose })}>
            {t('absences.actions.remove')}
          </Button>
        </div>
      ) : (
        <p className={css.note}>{t('absences.actions.readonly')}</p>
      )}
    </Sheet>
  );
}

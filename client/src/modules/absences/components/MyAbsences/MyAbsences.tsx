import { Fragment, useState } from 'react';
import type { Absence, Me } from '@/shared/api/types';
import { dayRange, dayText, daysBetween, todayKey } from '@/shared/lib/days';
import { t } from '@/shared/lib/texts';
import { Button, Card, Icon, Sheet } from '@/shared/ui';
import { useAbsenceActions } from '../../hooks/useAbsenceActions';
import { useUpcomingAbsences } from '../../hooks/useAbsences';
import { covers, daysLabel, returnDay } from '../../lib/absence';
import { AbsenceBadge } from '../AbsenceBadge/AbsenceBadge';
import { NewAbsenceForm } from '../AbsenceForm/NewAbsenceForm';
import { AbsenceSheet } from '../AbsenceSheet/AbsenceSheet';
import css from './MyAbsences.module.css';

/** «Мої відсутності» (Figma 25): поточна — з «Вийшов на службу», найближчі; додати свою */
export function MyAbsences({ me }: { me: Me }) {
  const q = useUpcomingAbsences();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Absence | null>(null);
  const today = todayKey();
  const mine = (q.data ?? []).filter((a) => a.person.id === me.id);

  return (
    <Card title={t('absences.mine.title')}>
      {mine.length === 0 && <p className={css.empty}>{t('absences.mine.empty')}</p>}
      {mine.map((a, i) => (
        <Fragment key={a.id}>
          {i > 0 && <hr className={css.divider} />}
          <Item absence={a} today={today} onOpen={() => setOpen(a)} />
        </Fragment>
      ))}
      <hr className={css.divider} />
      <button type="button" className={css.add} onClick={() => setAdding(true)}>
        <Icon name="plus" size={18} />
        {t('absences.mine.add')}
      </button>
      {adding && (
        <Sheet title={t('absences.mine.add')} onClose={() => setAdding(false)}>
          <NewAbsenceForm me={me} onCreated={() => setAdding(false)} />
        </Sheet>
      )}
      {open && <AbsenceSheet absence={open} me={me} onClose={() => setOpen(null)} />}
    </Card>
  );
}

function Item({ absence: a, today, onOpen }: { absence: Absence; today: string; onOpen: () => void }) {
  const end = useAbsenceActions(a.id).end;
  const now = covers(a, today);
  const line = now
    ? `${dayRange(a.startDay, a.endDay)} · ${t('absences.when.back', { date: dayText(returnDay(a)) })}`
    : `${t('absences.mine.starts_in', { n: daysLabel(daysBetween(today, a.startDay)) })} · ${daysLabel(daysBetween(a.startDay, a.endDay) + 1)}`;
  return (
    <div className={css.item}>
      <button type="button" className={css.open} onClick={onOpen}>
        <AbsenceBadge absence={a} today={today} />
        <span className={css.line}>{line}</span>
      </button>
      {now && a.can.change && (
        <Button variant="outline" size="s" className={css.back} disabled={end.isPending} onClick={() => end.mutate(undefined)}>
          {t('absences.actions.end')}
        </Button>
      )}
    </div>
  );
}

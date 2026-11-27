import { useId, useMemo, useState, type FormEvent } from 'react';
import { usePeople, useUnits } from '@/shared/api/people';
import type { Absence, AbsenceKind, Me } from '@/shared/api/types';
import { addDays, dayRange, dayText, daysBetween, todayKey } from '@/shared/lib/days';
import { t } from '@/shared/lib/texts';
import { verticalOf } from '@/shared/lib/vertical';
import { Button, Chip, Chips, DatePicker, FieldGroup, Icon, Picker, SheetFooter } from '@/shared/ui';
import type { AbsenceInput } from '../../api/absences.api';
import { daysLabel, KINDS, returnDay } from '../../lib/absence';
import css from './AbsenceForm.module.css';

const PRESETS = [1, 3, 5];
/** Заднім числом — до 60 днів: лікарняний часто позначають уже після (як на сервері) */
const BACK_DAYS = 60;

interface Props {
  me: Me;
  /** зміна наявної; без неї — нова */
  initial?: Absence;
  /** у спільному аркуші «Створити» кнопку внизу показує лише видима форма */
  active?: boolean;
  busy: boolean;
  onSubmit: (input: AbsenceInput) => void;
}

/** Відсутність (Figma 24): кому (керівнику), вид, з якого дня, на скільки днів; підсумок — коли знову на службі */
export function AbsenceForm({ me, initial, active = true, busy, onSubmit }: Props) {
  const formId = useId();
  const people = usePeople();
  const units = useUnits();
  const today = todayKey();
  const lead = me.role !== 'MEMBER' && !initial;
  const span = initial ? daysBetween(initial.startDay, initial.endDay) + 1 : 1;

  const [personId, setPersonId] = useState(initial?.person.id ?? me.id);
  const [kind, setKind] = useState<AbsenceKind>(initial?.kind ?? 'VACATION');
  const [start, setStart] = useState(initial?.startDay ?? today);
  const [preset, setPreset] = useState<number | null>(PRESETS.includes(span) ? span : null);
  const [end, setEnd] = useState(initial?.endDay ?? today);
  const endDay = preset ? addDays(start, preset - 1) : end < start ? start : end;

  // кому — я або хтось із моєї вертикалі (ADR-0012); остаточно вирішує сервер
  const whom = useMemo(() => {
    const others = verticalOf(me, units.data ?? [], people.data ?? []).people.filter((p) => p.id !== me.id);
    return [{ value: me.id, label: t('absences.form.me', { name: me.fullName }) }, ...others.map((p) => ({ value: p.id, label: p.fullName, hint: p.position }))];
  }, [me, units.data, people.data]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    onSubmit({ userId: personId === me.id ? undefined : personId, kind, startDay: start, endDay });
  };

  return (
    <form id={formId} className={css.form} onSubmit={submit} noValidate>
      {lead && (
        <FieldGroup label={t('absences.form.who')}>
          <Picker label={t('absences.form.who')} value={personId} options={whom} onChange={setPersonId} searchable />
        </FieldGroup>
      )}
      <FieldGroup label={t('absences.form.kind')}>
        <Chips>
          {KINDS.map((k) => (
            <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{t(`absences.kind.${k}`)}</Chip>
          ))}
        </Chips>
      </FieldGroup>
      <FieldGroup label={t('absences.form.start')}>
        <DatePicker label={t('absences.form.start')} value={start} min={addDays(today, -BACK_DAYS)} onChange={setStart} />
      </FieldGroup>
      <FieldGroup label={t('absences.form.duration')}>
        <Chips>
          {PRESETS.map((n) => (
            <Chip key={n} on={preset === n} onClick={() => setPreset(n)}>{daysLabel(n)}</Chip>
          ))}
          <Chip on={preset === null} onClick={() => { setEnd(endDay); setPreset(null); }}>{t('absences.form.other')}</Chip>
        </Chips>
        {preset === null && <DatePicker label={t('absences.form.until')} value={endDay} min={start} onChange={setEnd} />}
      </FieldGroup>
      <p className={css.hint}>
        <Icon name="bell" size={18} />
        {t('absences.form.summary', { range: dayRange(start, endDay), date: dayText(returnDay({ endDay })) })}
      </p>
      {active && (
        <SheetFooter>
          <Button type="submit" form={formId} variant="primary" size="l" block disabled={busy}>
            {initial ? t('absences.form.save') : t('absences.form.submit')}
          </Button>
        </SheetFooter>
      )}
    </form>
  );
}

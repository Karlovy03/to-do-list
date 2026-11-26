import { useId, useMemo, useState, type FormEvent } from 'react';
import type { AppEvent, Me } from '@/shared/api/types';
import { useDescribePerson, usePeople } from '@/shared/api/people';
import { useReminderSettings } from '@/shared/api/settings';
import { t } from '@/shared/lib/texts';
import { fromKyiv, kyivParts } from '@/shared/lib/time';
import { Button, DateTimePicker, Field, FieldGroup, FormError, Icon, Input, PeoplePicker, SheetFooter, TextArea } from '@/shared/ui';
import type { EventInput } from '../../api/events.api';
import { DurationChips } from '../DurationChips/DurationChips';
import css from './EventForm.module.css';

interface Props {
  me: Me;
  /** зміна наявного заходу; без нього — новий */
  initial?: AppEvent;
  /** у спільному аркуші «Створити» кнопку внизу показує лише видима форма */
  active?: boolean;
  busy: boolean;
  onSubmit: (input: EventInput) => void;
}

/** Найближча ціла година за Києвом — типовий початок нового заходу */
function nextHour(now = new Date()) {
  const p = kyivParts(new Date(now.getTime() + 3600_000));
  return fromKyiv(p.y, p.m, p.d, p.h);
}

/** Поля заходу (Figma 14): що, коли, орієнтовно скільки, з ким, опис. Права й надсилання — у того, хто викликає */
export function EventForm({ me, initial, active = true, busy, onSubmit }: Props) {
  const people = usePeople();
  const describe = useDescribePerson();
  const settings = useReminderSettings();
  const formId = useId();
  const organizerId = initial?.organizer.id ?? me.id;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [startsAt, setStartsAt] = useState<Date | null>(() => (initial ? new Date(initial.startsAt) : nextHour()));
  const [duration, setDuration] = useState(initial?.durationMin ?? 30);
  const [participants, setParticipants] = useState<string[]>(() => initial?.participants.map((p) => p.id) ?? []);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  // організатор у заході завжди — його немає серед кого запрошувати; вимкнених — лише тих, хто вже є
  const choices = useMemo(() => {
    const current = new Set(initial?.participants.map((p) => p.id));
    return (people.data ?? []).filter((p) => p.id !== organizerId && (p.isActive || current.has(p.id)));
  }, [people.data, initial, organizerId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (title.trim().length < 2) return setError(t('events.form.need_title'));
    const moved = !initial || startsAt?.getTime() !== Date.parse(initial.startsAt);
    if (!startsAt || (moved && startsAt.getTime() <= Date.now())) return setError(t('events.form.need_start'));
    setError(null);
    onSubmit({ title: title.trim(), description: description.trim(), startsAt: startsAt.toISOString(), durationMin: duration, participantIds: participants });
  };

  const reminder = settings.data?.eventReminderMin;
  const hint = initial || reminder === undefined ? null
    : participants.length ? t('events.form.hint_invite', { n: reminder })
    : me.prefs.notifyEvents ? t('events.form.hint_self', { n: reminder })
    : null;
  const submitLabel = initial ? t('events.form.save') : participants.length ? t('events.form.submit_invite') : t('events.form.submit_create');

  return (
    <form id={formId} className={css.form} onSubmit={submit} noValidate>
      <Field label={t('events.form.what')}>
        <Input value={title} maxLength={300} placeholder={t('events.form.what_placeholder')} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <FieldGroup label={t('events.form.start')}>
        <DateTimePicker label={t('events.form.start')} value={startsAt} onChange={setStartsAt} />
      </FieldGroup>
      <DurationChips value={duration} onChange={setDuration} />
      <FieldGroup label={participants.length ? t('events.form.who_count', { n: participants.length }) : t('events.form.who')}>
        <PeoplePicker people={choices} selected={participants} onChange={setParticipants} describe={describe} unitId={me.unitId} placeholder={t('events.form.who_search')} />
      </FieldGroup>
      <Field label={t('events.form.details')}>
        <TextArea rows={3} value={description} maxLength={5000} placeholder={t('events.form.details_placeholder')} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {hint && (
        <p className={css.hint}>
          <Icon name="bell" size={18} />
          {hint}
        </p>
      )}
      <FormError>{error}</FormError>
      {active && (
        <SheetFooter>
          <Button type="submit" form={formId} variant="primary" size="l" block disabled={busy}>
            {submitLabel}
          </Button>
        </SheetFooter>
      )}
    </form>
  );
}
